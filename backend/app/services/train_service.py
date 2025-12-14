import uuid
import io
import pickle
import pandas as pd
import numpy as np
import heapq
from collections import defaultdict, Counter
from datetime import datetime, timezone
from typing import Optional, List

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

from app.db.supabase_client import supabase

DATA_BUCKET = "datasets"
MODEL_BUCKET = "models"
KEYWORD_BUCKET = "keywords"
MODEL_TABLE = "trained_models"
JOB_TABLE = "training_jobs"
DATASET_TABLE = "datasets"

# ------------------------------------------------------------
# Utility Functions
# ------------------------------------------------------------

def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ------------------------------------------------------------
# Job Management
# ------------------------------------------------------------

def create_training_job(dataset_id: str, session_id: str, algorithm: str, model_id: str):
    job_id = str(uuid.uuid4())
    
    # First create a placeholder entry in trained_models to satisfy foreign key constraint
    supabase.table(MODEL_TABLE).insert({
        "model_id": model_id,
        "model_name": f"{algorithm}_model",
        "session_id": session_id,
        "dataset_id": dataset_id,
        "algorithm": algorithm,
        "hyperparameters": {},
        "vectorizer": {},
        "model_file": None,
        "train_size": 0,
        "val_size": 0,
        "metrics": {},
        "created_at": now_iso()
    }).execute()
    
    # Now create the training job
    supabase.table(JOB_TABLE).insert({
        "job_id": job_id,
        "model_id": model_id,
        "dataset_id": dataset_id,
        "session_id": session_id,
        "algorithm": algorithm,
        "status": "queued",
        "progress": 0,
        "message": "Queued",
        "created_at": now_iso(),
    }).execute()
    return job_id


def update_job(job_id: str, progress: int, message: str):
    supabase.table(JOB_TABLE).update({
        "progress": progress,
        "message": message
    }).eq("job_id", job_id).execute()


def mark_job_running(job_id: str):
    supabase.table(JOB_TABLE).update({
        "status": "running",
        "started_at": now_iso(),
        "progress": 1
    }).eq("job_id", job_id).execute()


def mark_job_completed(job_id: str):
    supabase.table(JOB_TABLE).update({
        "status": "completed",
        "finished_at": now_iso(),
        "progress": 100
    }).eq("job_id", job_id).execute()


def mark_job_failed(job_id: str, message: str, model_id: str = None):
    supabase.table(JOB_TABLE).update({
        "status": "failed",
        "message": message,
        "finished_at": now_iso()
    }).eq("job_id", job_id).execute()
    
    # Update the trained_models entry to reflect failure
    if model_id:
        try:
            supabase.table(MODEL_TABLE).update({
                "metrics": {"error": message},
                "updated_at": now_iso()
            }).eq("model_id", model_id).execute()
        except Exception:
            pass  # Ignore cleanup errors


# ------------------------------------------------------------
# Dataset Loading
# ------------------------------------------------------------

def load_csv_from_storage(path: str) -> pd.DataFrame:
    raw = supabase.storage.from_(DATA_BUCKET).download(path)
    text = raw.decode("utf-8")
    df = pd.read_csv(io.StringIO(text))
    return df


def extract_text_and_target(df: pd.DataFrame):
    # detect text column
    for c in ["text", "tweet", "content", "message"]:
        if c in df.columns:
            text_col = c
            break
    else:
        # fallback = first object column
        text_col = next((c for c in df.columns if df[c].dtype == object), None)

    if text_col is None:
        raise RuntimeError("No text column found.")

    if "target" not in df.columns:
        raise RuntimeError("Dataset file needs a target column to use for training. Please label the dataset first or ensure the file has a target column.")

    return df[text_col].astype(str), df["target"]


# ------------------------------------------------------------
# Custom KNN Implementation (using Jaccard Distance)
# ------------------------------------------------------------

def jaccard_distance(tweet1: str, tweet2: str) -> float:
    """Calculate Jaccard Distance between two tweets."""
    set1 = set(tweet1.lower().split())
    set2 = set(tweet2.lower().split())
    
    if not set1 and not set2:
        return 0.0
    
    intersection_size = len(set1.intersection(set2))
    union_size = len(set1.union(set2))
    
    jaccard_similarity = intersection_size / union_size
    return 1.0 - jaccard_similarity


class CustomKNN:
    """Custom KNN classifier using Jaccard distance."""
    
    def __init__(self, k: int = 5):
        self.k = k
        self.knowledge_base = []
    
    def fit(self, X_train: List[str], y_train):
        """Store training data as knowledge base."""
        self.knowledge_base = list(zip(X_train, y_train))
        return self
    
    def predict_one(self, new_tweet: str) -> int:
        """Predict class for a single tweet using KNN."""
        closest_neighbors = []
        heapq.heapify(closest_neighbors)
        
        distances = {}
        for tweet, c in self.knowledge_base:
            distances[tweet] = jaccard_distance(tweet, new_tweet)
        
        for tweet, c in self.knowledge_base:
            if len(closest_neighbors) < self.k:
                heapq.heappush(closest_neighbors, (-distances[tweet], c))
            else:
                top_distance, top_c = heapq.heappop(closest_neighbors)
                new_distance = distances[tweet]
                
                if -top_distance > new_distance:
                    heapq.heappush(closest_neighbors, (-new_distance, c))
                else:
                    heapq.heappush(closest_neighbors, (top_distance, top_c))
        
        frequency = defaultdict(int)
        for distance, c in closest_neighbors:
            frequency[c] += 1
        
        majority = -1
        result = 0
        for class_ in frequency:
            if frequency[class_] > majority:
                majority = frequency[class_]
                result = class_
        
        return result
    
    def predict(self, X_test: List[str]) -> List[int]:
        """Predict classes for multiple tweets."""
        return [self.predict_one(tweet) for tweet in X_test]


# ------------------------------------------------------------
# Custom Naive Bayes Implementation
# ------------------------------------------------------------

class CustomNaiveBayes:
    """Custom Naive Bayes classifier."""
    
    def __init__(self, ngram: str = "unigram", feature_rep: str = "count"):
        self.ngram = ngram
        self.feature_rep = feature_rep
        self.Pxy = defaultdict(dict)  # P(word | class)
        self.class_prior = {}  # P(class)
        self.vocabulary = set()
    
    def _tokenize(self, text: str) -> List[str]:
        """Tokenize text based on ngram setting."""
        words = text.lower().split()
        
        if self.ngram == "unigram":
            return words
        elif self.ngram == "bigram":
            tokens = words.copy()
            for i in range(len(words) - 1):
                tokens.append(f"{words[i]}_{words[i+1]}")
            return tokens
        elif self.ngram == "trigram":
            tokens = words.copy()
            for i in range(len(words) - 1):
                tokens.append(f"{words[i]}_{words[i+1]}")
            for i in range(len(words) - 2):
                tokens.append(f"{words[i]}_{words[i+1]}_{words[i+2]}")
            return tokens
        return words
    
    def fit(self, X_train: List[str], y_train):
        """Train the Naive Bayes classifier."""
        y_train = list(y_train)
        
        # Build vocabulary
        for text in X_train:
            for word in self._tokenize(text):
                self.vocabulary.add(word)
        
        # Count words per class
        word_counts = defaultdict(Counter)
        total_words = defaultdict(int)
        class_counts = Counter(y_train)
        
        for text, c in zip(X_train, y_train):
            tokens = self._tokenize(text)
            if self.feature_rep == "binary":
                tokens = list(set(tokens))  # Unique tokens only
            
            for word in tokens:
                word_counts[c][word] += 1
                total_words[c] += 1
        
        # Compute class priors P(class)
        total_samples = len(y_train)
        for c in class_counts:
            self.class_prior[c] = np.log(class_counts[c] / total_samples)
        
        # Compute P(word | class) with Laplace smoothing
        V = len(self.vocabulary)
        for c in class_counts:
            self.Pxy[c] = {}
            for word in self.vocabulary:
                numer = word_counts[c][word] + 1
                denom = total_words[c] + V
                self.Pxy[c][word] = np.log(numer / denom)
        
        return self
    
    def predict_one(self, text: str) -> int:
        """Predict class for a single text."""
        tokens = self._tokenize(text)
        if self.feature_rep == "binary":
            tokens = list(set(tokens))
        
        scores = {}
        for c in self.class_prior:
            log_prob = self.class_prior[c]
            for word in tokens:
                if word in self.Pxy[c]:
                    log_prob += self.Pxy[c][word]
            scores[c] = log_prob
        
        return max(scores, key=scores.get)
    
    def predict(self, X_test: List[str]) -> List[int]:
        """Predict classes for multiple texts."""
        return [self.predict_one(text) for text in X_test]


# ------------------------------------------------------------
# Naive Automatic (Keyword-based classification)
# ------------------------------------------------------------

def load_sentiment_wordlists():
    """Load positive and negative word lists from keywords bucket."""
    positive = set()
    negative = set()
    
    try:
        pos_raw = supabase.storage.from_(KEYWORD_BUCKET).download("positives.txt")
        text = pos_raw.decode("utf-8")
        positive = set([word.strip().lower() for word in text.split(',') if word.strip()])
    except Exception as e:
        print(f"Error loading positives.txt: {e}")
    
    try:
        neg_raw = supabase.storage.from_(KEYWORD_BUCKET).download("negatives.txt")
        text = neg_raw.decode("latin-1")
        negative = set([word.strip().lower() for word in text.split(',') if word.strip()])
    except Exception as e:
        print(f"Error loading negatives.txt: {e}")
    
    if not positive and not negative:
        raise RuntimeError("Could not load keyword files from storage.")
    
    return positive, negative


class NaiveAutomaticClassifier:
    """Keyword-based classifier using positive/negative word lists. Returns 0, 2, 4."""
    
    def __init__(self, positive_words: set, negative_words: set):
        self.positive = positive_words
        self.negative = negative_words
    
    def predict_one(self, text: str) -> int:
        """Classify a single text. Returns 0 (neg), 2 (neutral), 4 (pos)."""
        tweet = text.lower()
        pos_count = sum(1 for w in self.positive if w in tweet)
        neg_count = sum(1 for w in self.negative if w in tweet)
        
        if pos_count > neg_count:
            return 4  # Positive
        elif neg_count > pos_count:
            return 0  # Negative
        else:
            return 2  # Neutral
    
    def predict(self, X_test: List[str]) -> List[int]:
        """Predict classes for multiple texts."""
        return [self.predict_one(text) for text in X_test]


def train_naive_automatic():
    """Create a NaiveAutomaticClassifier with loaded word lists."""
    positive, negative = load_sentiment_wordlists()
    return NaiveAutomaticClassifier(positive, negative)




# ------------------------------------------------------------
# Evaluation Metrics
# ------------------------------------------------------------

def compute_metrics(y_true, y_pred):
    accuracy = accuracy_score(y_true, y_pred)
    p, r, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="weighted", zero_division=0
    )
    cm = confusion_matrix(y_true, y_pred).tolist()

    return {
        "accuracy": accuracy,
        "precision": p,
        "recall": r,
        "f1": f1,
        "confusion_matrix": cm,
        "error_rate": 1 - accuracy,
    }


# ------------------------------------------------------------
# Save Model to Storage
# ------------------------------------------------------------

def save_model_artifact(model_id: str, model_obj: dict):
    path = f"{model_id}/model.pkl"
    blob = pickle.dumps(model_obj)
    supabase.storage.from_(MODEL_BUCKET).upload(path, blob, {
        "contentType": "application/octet-stream"
    })
    return path


# ------------------------------------------------------------
# Main Training Job
# ------------------------------------------------------------

def run_training_job(job_id: str, model_id: str, dataset_id: str, session_id: str,
                     algorithm: str, hyperparams: dict, test_size: float,
                     model_name: Optional[str]):

    try:
        mark_job_running(job_id)

        # Load dataset record
        update_job(job_id, 10, "Loading dataset")
        ds = supabase.table(DATASET_TABLE).select("*") \
            .eq("dataset_id", dataset_id) \
            .eq("session_id", session_id).execute().data

        if not ds:
            raise RuntimeError("Dataset not found.")
        ds = ds[0]

        # Debug: log what files are available
        print(f"[TRAIN] Dataset record: labeled_file={ds.get('labeled_file')}, cleaned_file={ds.get('cleaned_file')}, original_file={ds.get('original_file')}")

        # Determine which file to use: labeled_file > cleaned_file > original_file
        # Priority: labeled file (has target), then cleaned, then original
        file_to_use = None
        file_source = None
        
        # First priority: labeled file (always has target column)
        if ds.get("labeled_file"):
            file_to_use = ds["labeled_file"]
            file_source = "labeled"
            print(f"[TRAIN] Using labeled file: {file_to_use}")
        # Second priority: cleaned file
        elif ds.get("cleaned_file"):
            file_to_use = ds["cleaned_file"]
            file_source = "cleaned"
            print(f"[TRAIN] Using cleaned file: {file_to_use}")
        # Last resort: original file
        else:
            file_to_use = ds.get("original_file")
            file_source = "original"
            print(f"[TRAIN] Using original file: {file_to_use}")
        
        if not file_to_use:
            raise RuntimeError("No dataset file available for training.")
        
        # Load CSV
        df = load_csv_from_storage(file_to_use)
        
        # Handle labeled files (no headers, target in column 0)
        if file_source == "labeled":
            # Labeled files have no headers, target is in column 0
            # Find text column (usually last column or column with most text)
            text_col_idx = len(df.columns) - 1
            for idx in range(len(df.columns)):
                if idx == 0:  # Skip target column
                    continue
                col = df.iloc[:, idx]
                try:
                    avg_len = col.astype(str).str.len().mean()
                    if not pd.isna(avg_len) and avg_len > 10:
                        text_col_idx = idx
                        break
                except Exception:
                    continue
            
            X_text = df.iloc[:, text_col_idx].astype(str)
            y = df.iloc[:, 0].astype(int)  # Target is in column 0
        else:
            # For cleaned/original files, use standard extraction
            X_text, y = extract_text_and_target(df)

        # Split
        update_job(job_id, 30, "Splitting dataset")
        X_train, X_val, y_train, y_val = train_test_split(
            X_text, y, stratify=y, test_size=test_size, random_state=42
        )

        # Dispatch Algorithm
        update_job(job_id, 50, f"Training {algorithm}")
        
        # Convert to lists for custom implementations
        X_train_list = X_train.tolist() if hasattr(X_train, 'tolist') else list(X_train)
        X_val_list = X_val.tolist() if hasattr(X_val, 'tolist') else list(X_val)
        y_train_list = y_train.tolist() if hasattr(y_train, 'tolist') else list(y_train)
        y_val_list = y_val.tolist() if hasattr(y_val, 'tolist') else list(y_val)

        if algorithm == "knn":
            # Custom KNN with Jaccard distance
            k = hyperparams.get("k", 5)
            model = CustomKNN(k=k)
            model.fit(X_train_list, y_train_list)
            preds = model.predict(X_val_list)
            metrics = compute_metrics(y_val_list, preds)

        elif algorithm == "naive_bayes":
            # Custom Naive Bayes
            ngram = hyperparams.get("ngram", "unigram")
            feature_rep = hyperparams.get("feature_rep", "count")
            model = CustomNaiveBayes(ngram=ngram, feature_rep=feature_rep)
            model.fit(X_train_list, y_train_list)
            preds = model.predict(X_val_list)
            metrics = compute_metrics(y_val_list, preds)

        elif algorithm == "naive_automatic":
            # Keyword-based classification (returns 0, 2, 4)
            model = train_naive_automatic()
            preds = model.predict(X_val_list)
            metrics = compute_metrics(y_val_list, preds)

        elif algorithm == "decision_tree":
            # Keep sklearn for decision tree as no custom implementation provided
            from sklearn.tree import DecisionTreeClassifier
            from sklearn.feature_extraction.text import TfidfVectorizer
            vectorizer = TfidfVectorizer(max_features=5000, stop_words="english")
            X_train_vec = vectorizer.fit_transform(X_train)
            X_val_vec = vectorizer.transform(X_val)
            max_depth = hyperparams.get("max_depth", None)
            model = DecisionTreeClassifier(max_depth=max_depth, random_state=42)
            model.fit(X_train_vec, y_train)
            preds = model.predict(X_val_vec)
            metrics = compute_metrics(y_val, preds)

        else:
            raise RuntimeError("Unknown algorithm.")

        update_job(job_id, 80, "Saving model")

        # Save model - include vectorizer only for decision_tree
        model_artifact = {
            "algorithm": algorithm,
            "hyperparameters": hyperparams,
            "model": model,
        }
        if algorithm == "decision_tree":
            model_artifact["vectorizer"] = vectorizer

        model_path = save_model_artifact(model_id, model_artifact)

        # Update the trained_models entry (already created as placeholder)
        supabase.table(MODEL_TABLE).update({
            "model_name": model_name or f"{algorithm}_model",
            "hyperparameters": hyperparams,
            "model_file": model_path,
            "train_size": len(X_train),
            "val_size": len(X_val),
            "metrics": metrics,
            "updated_at": now_iso()
        }).eq("model_id", model_id).execute()

        update_job(job_id, 100, "Completed")
        mark_job_completed(job_id)

    except Exception as e:
        mark_job_failed(job_id, str(e), model_id)
        raise