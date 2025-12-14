import uuid
import io
import pickle
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import Optional, Tuple

from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import MultinomialNB, BernoulliNB
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

from app.db.supabase_client import supabase
from app.models.train import (
    KNNParams,
    NaiveBayesParams
)

DATA_BUCKET = "datasets"
MODEL_BUCKET = "models"
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


def mark_job_failed(job_id: str, message: str):
    supabase.table(JOB_TABLE).update({
        "status": "failed",
        "message": message,
        "finished_at": now_iso()
    }).eq("job_id", job_id).execute()


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
# Vectorizers
# ------------------------------------------------------------

def build_naive_bayes_vectorizer(params: NaiveBayesParams):
    ngram_map = {
        "unigram": (1, 1),
        "bigram": (1, 2),
        "trigram": (1, 3),
    }
    return CountVectorizer(
        ngram_range=ngram_map[params.ngram],
        vocabulary=params.vocabulary,
        binary=(params.feature_rep == "binary")
    )


def build_tfidf_vectorizer():
    return TfidfVectorizer(max_features=5000, stop_words="english")


# ------------------------------------------------------------
# Naive Automatic
# ------------------------------------------------------------

def load_sentiment_wordlists():
    pos_raw = supabase.storage.from_("jobs").download("positives.txt").decode("utf-8")
    neg_raw = supabase.storage.from_("jobs").download("negatives.txt").decode("utf-8")

    positive = set([w.strip() for w in pos_raw.splitlines() if w.strip()])
    negative = set([w.strip() for w in neg_raw.splitlines() if w.strip()])

    return positive, negative


def train_naive_automatic():
    positive, negative = load_sentiment_wordlists()
    return {
        "type": "naive_automatic",
        "positive_words": list(positive),
        "negative_words": list(negative),
    }


# ------------------------------------------------------------
# Training Algorithms
# ------------------------------------------------------------

def train_knn(X_train, y_train, params: KNNParams):
    return KNeighborsClassifier(
        n_neighbors=params.k,
        metric=params.distance
    ).fit(X_train, y_train)


def train_naive_bayes(X_train, y_train, params: NaiveBayesParams):
    model = BernoulliNB() if params.feature_rep == "binary" else MultinomialNB()
    return model.fit(X_train, y_train)


def train_decision_tree(X_train, y_train, params: dict):
    clf = DecisionTreeClassifier(
        max_depth=params.get("max_depth"), 
        min_samples_split=params.get("min_samples_split", 2)
    )
    return clf.fit(X_train, y_train)


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

        # Determine which file to use: labeled_file > cleaned_file (if has target) > original_file
        file_to_use = None
        file_source = None
        
        if ds.get("labeled_file"):
            file_to_use = ds["labeled_file"]
            file_source = "labeled"
        elif ds.get("cleaned_file"):
            # Check if cleaned file has target column
            try:
                test_df = load_csv_from_storage(ds["cleaned_file"])
                # Check if it has target column (either as column name or column 0)
                if "target" in test_df.columns or (len(test_df.columns) > 0 and test_df.iloc[:, 0].dtype in [int, float]):
                    file_to_use = ds["cleaned_file"]
                    file_source = "cleaned"
            except Exception:
                pass
        
        if not file_to_use:
            file_to_use = ds.get("original_file")
            file_source = "original"
        
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
        
        vectorizer = None  # default null

        if algorithm == "knn":
            params = KNNParams(**hyperparams)
            vectorizer = build_tfidf_vectorizer()
            X_train_vec = vectorizer.fit_transform(X_train)
            X_val_vec = vectorizer.transform(X_val)
            model = train_knn(X_train_vec, y_train, params)

        elif algorithm == "naive_bayes":
            params = NaiveBayesParams(**hyperparams)
            vectorizer = build_naive_bayes_vectorizer(params)
            X_train_vec = vectorizer.fit_transform(X_train)
            X_val_vec = vectorizer.transform(X_val)
            model = train_naive_bayes(X_train_vec, y_train, params)

        elif algorithm == "naive_automatic":
            model = train_naive_automatic()
            positive = set(model["positive_words"])
            negative = set(model["negative_words"])

            def classify(t):
                tokens = t.lower().split()
                pos = len([x for x in tokens if x in positive])
                neg = len([x for x in tokens if x in negative])
                if pos > neg: return 1
                if neg > pos: return -1
                return 0

            preds = [classify(t) for t in X_val]
            metrics = compute_metrics(y_val, preds)
            vectorizer = None

        elif algorithm == "decision_tree":
            params = hyperparams
            vectorizer = build_tfidf_vectorizer()
            X_train_vec = vectorizer.fit_transform(X_train)
            X_val_vec = vectorizer.transform(X_val)
            model = train_decision_tree(X_train_vec, y_train, params)

        else:
            raise RuntimeError("Unknown algorithm.")

        # Compute metrics for ML models (except naive_automatic)
        if algorithm != "naive_automatic":
            preds = model.predict(X_val_vec)
            metrics = compute_metrics(y_val, preds)

        update_job(job_id, 80, "Saving model")

        # Save model
        model_artifact = {
            "algorithm": algorithm,
            "hyperparameters": hyperparams,
            "vectorizer": vectorizer,
            "model": model,
        }

        model_path = save_model_artifact(model_id, model_artifact)

        # Insert into DB
        supabase.table(MODEL_TABLE).insert({
            "model_id": model_id,
            "model_name": model_name or f"{algorithm}_model",
            "session_id": session_id,
            "dataset_id": dataset_id,
            "algorithm": algorithm,
            "hyperparameters": hyperparams,
            "vectorizer": {},   # stored inside pickle
            "model_file": model_path,
            "train_size": len(X_train),
            "val_size": len(X_val),
            "metrics": metrics,
            "created_at": now_iso()
        }).execute()

        update_job(job_id, 100, "Completed")
        mark_job_completed(job_id)

    except Exception as e:
        mark_job_failed(job_id, str(e))
        raise