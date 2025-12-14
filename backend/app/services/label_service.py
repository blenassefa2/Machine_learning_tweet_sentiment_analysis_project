# app/services/label_service.py
import uuid
import io
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional, Callable
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.cluster import DBSCAN
from scipy.spatial.distance import squareform
from scipy.cluster.hierarchy import linkage, fcluster
from scipy.optimize import linear_sum_assignment

from app.db.supabase_client import supabase

DATA_BUCKET = "datasets"
LABEL_TABLE = "labelings"  # Renamed from classifications
JOB_TABLE = "label_jobs"  # Renamed from classify_jobs
DATASET_TABLE = "datasets"
KEYWORD_BUCKET = "keywords"

def _now_iso():
    return datetime.now(timezone.utc).isoformat()

# ---- Utility Functions ----
def jaccard_distance(tweet1: str, tweet2: str) -> float:
    """
    Calculates the Jaccard Distance between two tweets based on unique word sets.
    
    Args:
        tweet1, tweet2: The text strings to compare.
        
    Returns:
        The Jaccard Distance (0.0 means identical, 1.0 means no words in common).
    """
    set1 = set(tweet1.lower().split())
    set2 = set(tweet2.lower().split())
    
    if not set1 and not set2:
        return 0.0
    
    intersection_size = len(set1.intersection(set2))
    union_size = len(set1.union(set2))
    
    jaccard_similarity = intersection_size / union_size
    jaccard_distance_value = 1.0 - jaccard_similarity
    
    return jaccard_distance_value

def create_distance_matrix(tweets: List[str], method: Callable[[str, str], float]) -> List[List[float]]:
    """
    Creates a distance matrix with the given method.
    Args:
        tweets: List[str] -> list of tweets
        method: Callable -> the method to use to create the distance matrix
    Returns:
        List[List[float]] -> the distance matrix
    """
    n = len(tweets)
    distance_matrix = [[0.0 for _ in range(n)] for _ in range(n)]
    for i in range(n):
        for j in range(i, n):
            if i == j:
                distance_matrix[i][j] = 0.0
            else:
                distance = method(tweets[i], tweets[j])
                distance_matrix[i][j] = distance
                distance_matrix[j][i] = distance
    return distance_matrix

def align_clusters_to_labels(true_labels: np.ndarray, cluster_labels: np.ndarray) -> np.ndarray:
    """
    Finds the best mapping from cluster IDs to true labels using Hungarian algorithm.
    """
    unique_labels = np.unique(true_labels)
    unique_clusters = np.unique(cluster_labels)
    
    # Create a cost matrix: rows=true labels, cols=cluster IDs
    cost_matrix = np.zeros((len(unique_labels), len(unique_clusters)))
    
    for i, true_label in enumerate(unique_labels):
        for j, cluster_id in enumerate(unique_clusters):
            cost_matrix[i, j] = np.sum((true_labels == true_label) & (cluster_labels == cluster_id))
    
    # Use Hungarian algorithm (maximize matches, so negate)
    row_ind, col_ind = linear_sum_assignment(-cost_matrix)
    
    # Create mapping: cluster_id -> true_label
    mapping = {}
    for row, col in zip(row_ind, col_ind):
        mapping[unique_clusters[col]] = unique_labels[row]
    
    # Handle unmapped clusters
    for cluster_id in unique_clusters:
        if cluster_id not in mapping:
            mapping[cluster_id] = unique_labels[0]
    
    # Apply mapping
    aligned_clusters = np.array([mapping[c] for c in cluster_labels])
    return aligned_clusters

# ---- Job helpers ----
def create_label_job(dataset_id: str, session_id: str, method: str) -> str:
    job_id = str(uuid.uuid4())
    supabase.table(JOB_TABLE).insert({
        "job_id": job_id,
        "dataset_id": dataset_id,
        "session_id": session_id,
        "method": method,
        "status": "pending",
        "progress": 0,
        "message": "Queued",
        "created_at": _now_iso()
    }).execute()
    return job_id

def update_job(job_id: str, progress: int, message: str):
    supabase.table(JOB_TABLE).update({"progress": progress, "message": message}).eq("job_id", job_id).execute()

def mark_job_running(job_id: str):
    supabase.table(JOB_TABLE).update({"status": "running", "started_at": _now_iso(), "progress": 1}).eq("job_id", job_id).execute()

def mark_job_completed(job_id: str, labeled_path: str):
    supabase.table(JOB_TABLE).update({
        "status": "completed", 
        "finished_at": _now_iso(), 
        "progress": 100, 
        "labeled_file": labeled_path
    }).eq("job_id", job_id).execute()

def mark_job_failed(job_id: str, message: str):
    supabase.table(JOB_TABLE).update({
        "status": "error", 
        "message": message, 
        "finished_at": _now_iso()
    }).eq("job_id", job_id).execute()

# ---- Helpers: load dataset ----
def _load_dataset_bytes(path: str) -> bytes:
    return supabase.storage.from_(DATA_BUCKET).download(path)

def _load_df_from_storage(path: str, use_cleaned: bool = False) -> pd.DataFrame:
    """Load dataset from storage. If use_cleaned is True, try to load cleaned_file first."""
    data = _load_dataset_bytes(path)
    text = data.decode("utf-8")
    try:
        df = pd.read_csv(io.StringIO(text), header=None)  # No headers
    except Exception:
        df = pd.read_csv(io.StringIO(text), sep='|', header=None)
    return df

def _find_text_column_index(df: pd.DataFrame) -> int:
    """Find the text column index (usually the last column or column with most text)."""
    # Try to find by checking which column has the most text-like content
    max_text_len = 0
    text_col_idx = len(df.columns) - 1  # Default to last column
    
    for idx in range(len(df.columns)):
        col = df.iloc[:, idx]
        # Check if column contains mostly text (strings longer than typical numbers)
        try:
            avg_len = col.astype(str).str.len().mean()
            if not pd.isna(avg_len) and avg_len > max_text_len and avg_len > 10:  # Text columns usually have longer strings
                max_text_len = avg_len
                text_col_idx = idx
        except Exception:
            continue
    
    return text_col_idx

# ---- Naive labeling logic ----
def _label_naive_by_keywords(df: pd.DataFrame, keyword_map: Dict[str, List[str]], text_col_idx: int) -> pd.Series:
    """
    Label tweets based on presence of positive/negative words.
    Returns labels: 0 (negative), 2 (neutral), 4 (positive)
    """
    texts = df.iloc[:, text_col_idx].astype(str).str.lower()
    labels = []
    
    for t in texts:
        scores = {}
        for label, words in keyword_map.items():
            s = sum(1 for w in words if w.lower() in t)
            scores[label] = s
        
        # Find best label
        if not scores or max(scores.values()) == 0:
            labels.append(2)  # Neutral
        else:
            best_label = max(scores.items(), key=lambda kv: kv[1])[0]
            # Map label names to polarity values
            best_label_lower = best_label.lower()
            if best_label_lower in ["positive", "positives", "pos", "4"]:
                labels.append(4)
            elif best_label_lower in ["negative", "negatives", "neg", "0"]:
                labels.append(0)
            else:
                labels.append(2)  # Neutral
    
    return pd.Series(labels, name="target")

# ---- Clustering-based labeling logic ----
def _vectorize_texts(df: pd.DataFrame, text_col_idx: int) -> Tuple:
    """Vectorize text column using TF-IDF."""
    texts = df.iloc[:, text_col_idx].astype(str).fillna("")
    vec = TfidfVectorizer(max_features=5000, stop_words='english')
    X = vec.fit_transform(texts)
    return X

def _run_hierarchical_clustering(tweets: List[str], k: int, linkage_method: str = "average") -> np.ndarray:
    """
    Run hierarchical clustering using Jaccard distance.
    Returns cluster labels.
    """
    D = create_distance_matrix(tweets, jaccard_distance)
    D_condensed = squareform(D)
    Z = linkage(D_condensed, method=linkage_method)
    clusters = fcluster(Z, k, criterion='maxclust')
    return clusters

def _run_clustering(X, algorithm: str, hp) -> np.ndarray:
    """Run clustering algorithm and return cluster labels."""
    if algorithm == "kmeans":
        n = hp.n_clusters or 5
        model = KMeans(n_clusters=n, random_state=hp.random_state or 42, n_init=10)
        preds = model.fit_predict(X)
    elif algorithm == "dbscan":
        eps = hp.eps or 0.5
        ms = hp.min_samples or 5
        model = DBSCAN(eps=eps, min_samples=ms)
        preds = model.fit_predict(X)
    elif algorithm == "agglomerative":
        n = hp.n_clusters or 5
        linkage_method = hp.linkage or "ward"
        model = AgglomerativeClustering(n_clusters=n, linkage=linkage_method)
        preds = model.fit_predict(X.toarray() if hasattr(X, "toarray") else X)
    elif algorithm == "hierarchical":
        # Use hierarchical clustering with Jaccard distance
        n = hp.n_clusters or 3
        linkage_method = hp.linkage or "average"
        # This will be handled separately as we need the text strings
        raise ValueError("Hierarchical clustering requires text strings, use _run_hierarchical_clustering")
    else:
        raise ValueError(f"Unsupported algorithm {algorithm}")
    return preds

def _map_clusters_to_labels(cluster_labels: np.ndarray, n_clusters: int = 3) -> np.ndarray:
    """
    Map cluster IDs to polarity labels (0, 2, 4).
    For now, simple mapping: cluster 0 -> 0, cluster 1 -> 2, cluster 2 -> 4, etc.
    """
    unique_clusters = np.unique(cluster_labels)
    # Remove noise label (-1) if present
    unique_clusters = unique_clusters[unique_clusters >= 0]
    
    # Map clusters to labels 0, 2, 4
    mapping = {}
    label_values = [0, 2, 4]
    for i, cluster_id in enumerate(unique_clusters[:3]):  # Max 3 clusters for 3 labels
        mapping[cluster_id] = label_values[i] if i < len(label_values) else 2
    
    # Map remaining clusters to neutral (2)
    for cluster_id in unique_clusters:
        if cluster_id not in mapping:
            mapping[cluster_id] = 2
    
    # Handle noise (-1) -> neutral
    mapping[-1] = 2
    
    return np.array([mapping.get(c, 2) for c in cluster_labels])

# ---- Core worker functions ----
def _write_labeled_file_and_store(df: pd.DataFrame, dataset_id: str) -> str:
    """Write labeled DataFrame to storage."""
    csv_buf = io.StringIO()
    df.to_csv(csv_buf, index=False, header=False)  # No headers for consistency
    bytes_data = csv_buf.getvalue().encode("utf-8")
    path = f"labeled/{dataset_id}_labeled.csv"
    supabase.storage.from_(DATA_BUCKET).upload(path, bytes_data, {"contentType":"text/csv"})
    return path

def run_manual_labeling_job(job_id: str, dataset_id: str, session_id: str, annotations: List[Dict], stop_early: bool = False):
    """
    Run manual labeling job. If stop_early is True, only keep labeled rows.
    """
    try:
        mark_job_running(job_id)
        update_job(job_id, 10, "Loading dataset")
        
        res = supabase.table(DATASET_TABLE).select("*").eq("dataset_id", dataset_id).eq("session_id", session_id).execute()
        if not res.data:
            raise RuntimeError("Dataset not found")
        ds = res.data[0]
        
        # Try to use cleaned file if available, otherwise original
        file_path = ds.get("cleaned_file") or ds["original_file"]
        df = _load_df_from_storage(file_path)
        
        # Find target column index (usually first column or create new)
        target_col_idx = 0  # Assume first column is target, or we'll add it
        
        # Ensure target column exists
        if target_col_idx >= len(df.columns):
            # Add target column at the end
            df[len(df.columns)] = -1
            target_col_idx = len(df.columns) - 1
        else:
            # Initialize target column if it doesn't exist or is empty
            if target_col_idx not in df.columns:
                df[target_col_idx] = -1
        
        update_job(job_id, 25, f"Applying {len(annotations)} annotations")
        
        # Apply annotations
        for a in annotations:
            idx = int(a["row_index"])
            if 0 <= idx < len(df):
                label_value = int(a["label"])  # Should be 0, 2, or 4
                df.iloc[idx, target_col_idx] = label_value
        
        # If stop_early, only keep rows that were labeled
        if stop_early:
            df = df[df.iloc[:, target_col_idx] != -1].reset_index(drop=True)
        
        update_job(job_id, 75, "Saving labeled file")
        path = _write_labeled_file_and_store(df, dataset_id)
        
        # Write labeling metadata
        labeled_count = int((df.iloc[:, target_col_idx] != -1).sum())
        supabase.table(LABEL_TABLE).insert({
            "labeling_id": str(uuid.uuid4()),
            "dataset_id": dataset_id,
            "session_id": session_id,
            "method": "manual",
            "hyperparameters": {"annotations_count": len(annotations), "stop_early": stop_early},
            "results": df.head(50).to_dict(orient="records") if len(df) > 0 else [],
            "summary": {
                "total_rows": len(df),
                "labeled_rows": labeled_count,
                "unlabeled_rows": len(df) - labeled_count
            },
            "labeled_file": path,
            "status": "completed",
            "created_at": _now_iso()
        }).execute()
        
        supabase.table(DATASET_TABLE).update({
            "labeled_file": path,
            "status": "Labeled"
        }).eq("dataset_id", dataset_id).execute()
        
        mark_job_completed(job_id, path)
    except Exception as e:
        mark_job_failed(job_id, str(e))
        try:
            supabase.table(DATASET_TABLE).update({"status": "LabelingFailed"}).eq("dataset_id", dataset_id).execute()
        except Exception:
            pass

def run_naive_labeling_job(job_id: str, dataset_id: str, session_id: str, keyword_map: Optional[Dict[str, List[str]]] = None, use_default: bool = False):
    """Run naive keyword-based labeling."""
    try:
        mark_job_running(job_id)
        update_job(job_id, 10, "Loading dataset")
        
        res = supabase.table(DATASET_TABLE).select("*").eq("dataset_id", dataset_id).eq("session_id", session_id).execute()
        if not res.data:
            raise RuntimeError("Dataset not found")
        ds = res.data[0]
        
        file_path = ds.get("cleaned_file") or ds["original_file"]
        df = _load_df_from_storage(file_path)
        
       
        # Load default keyword files from keywords bucket
        # Files are comma-separated text files: positives.txt and negatives.txt
        keyword_map = {}
        for cname in ["positives", "negatives"]:
            try:
                kb = supabase.storage.from_(KEYWORD_BUCKET).download(f"{cname}.txt")
                if kb:
                    # Decode as latin-1 (can handle any byte sequence without errors)
                    text = kb.decode("utf-8")
                    # Parse comma-separated values: strip, lowercase, filter empty
                    words = [word.strip().lower() for word in text.split(',') if word.strip()]
                    if words:  # Only add if we got actual words
                        keyword_map[cname] = words
            except Exception as e:
                print(f"Error loading default keywords from {cname}.txt: {e}")
                continue

        if not keyword_map: 
            raise RuntimeError("No keywords provided for naive labeling")
        
        text_col_idx = _find_text_column_index(df)
        update_job(job_id, 40, "Applying naive labeling")
        labels = _label_naive_by_keywords(df, keyword_map, text_col_idx)
        
        # Add or update target column
        target_col_idx = 0
        if target_col_idx >= len(df.columns):
            df[len(df.columns)] = labels
            target_col_idx = len(df.columns) - 1
        else:
            df.iloc[:, target_col_idx] = labels
        
        update_job(job_id, 80, "Saving labeled file")
        path = _write_labeled_file_and_store(df, dataset_id)
        
        supabase.table(LABEL_TABLE).insert({
            "labeling_id": str(uuid.uuid4()),
            "dataset_id": dataset_id,
            "session_id": session_id,
            "method": "naive",
            "hyperparameters": {"keywords_provided": bool(keyword_map), "use_default": use_default},
            "results": df.head(50).to_dict(orient="records"),
            "summary": {
                "total": len(df),
                "labeled": int((labels != 2).sum()),  # Non-neutral
                "neutral": int((labels == 2).sum())
            },
            "labeled_file": path,
            "status": "completed",
            "created_at": _now_iso()
        }).execute()
        
        supabase.table(DATASET_TABLE).update({
            "labeled_file": path,
            "status": "Labeled"
        }).eq("dataset_id", dataset_id).execute()
        
        mark_job_completed(job_id, path)
    except Exception as e:
        mark_job_failed(job_id, str(e))
        try:
            supabase.table(DATASET_TABLE).update({"status": "LabelingFailed"}).eq("dataset_id", dataset_id).execute()
        except Exception:
            pass

def run_clustering_labeling_job(job_id: str, dataset_id: str, session_id: str, algorithm: str, hyperparams):
    """Run clustering-based labeling."""
    try:
        mark_job_running(job_id)
        update_job(job_id, 10, "Loading dataset")
        
        res = supabase.table(DATASET_TABLE).select("*").eq("dataset_id", dataset_id).eq("session_id", session_id).execute()
        if not res.data:
            raise RuntimeError("Dataset not found")
        ds = res.data[0]
        
        file_path = ds.get("cleaned_file") or ds["original_file"]
        df = _load_df_from_storage(file_path)
        
        text_col_idx = _find_text_column_index(df)
        texts = df.iloc[:, text_col_idx].astype(str).fillna("").tolist()
        
        update_job(job_id, 25, "Vectorizing text")
        
        if algorithm == "hierarchical":
            # Use hierarchical clustering with Jaccard distance
            k = hyperparams.n_clusters or 3
            linkage_method = hyperparams.linkage or "average"
            update_job(job_id, 40, f"Running hierarchical clustering ({linkage_method})")
            cluster_labels = _run_hierarchical_clustering(texts, k, linkage_method)
        else:
            # Use TF-IDF vectorization for other algorithms
            X = _vectorize_texts(df, text_col_idx)
            update_job(job_id, 50, f"Running {algorithm} clustering")
            cluster_labels = _run_clustering(X, algorithm, hyperparams)
        
        update_job(job_id, 75, "Mapping clusters to labels")
        labels = _map_clusters_to_labels(cluster_labels, hyperparams.n_clusters or 3)
        
        # Add or update target column
        target_col_idx = 0
        if target_col_idx >= len(df.columns):
            df[len(df.columns)] = labels
            target_col_idx = len(df.columns) - 1
        else:
            df.iloc[:, target_col_idx] = labels
        
        update_job(job_id, 85, "Saving labeled file")
        path = _write_labeled_file_and_store(df, dataset_id)
        
        # Summary
        unique, counts = np.unique(cluster_labels, return_counts=True)
        summary = {
            "clusters": int(len(unique)),
            "rows_per_cluster": counts.tolist(),
            "label_distribution": {
                "0": int((labels == 0).sum()),
                "2": int((labels == 2).sum()),
                "4": int((labels == 4).sum())
            }
        }
        
        supabase.table(LABEL_TABLE).insert({
            "labeling_id": str(uuid.uuid4()),
            "dataset_id": dataset_id,
            "session_id": session_id,
            "method": algorithm,
            "hyperparameters": hyperparams.__dict__ if hyperparams else {},
            "results": df.head(50).to_dict(orient="records"),
            "summary": summary,
            "labeled_file": path,
            "status": "completed",
            "created_at": _now_iso()
        }).execute()
        
        supabase.table(DATASET_TABLE).update({
            "labeled_file": path,
            "status": "Labeled"
        }).eq("dataset_id", dataset_id).execute()
        
        mark_job_completed(job_id, path)
    except Exception as e:
        mark_job_failed(job_id, str(e))
        try:
            supabase.table(DATASET_TABLE).update({"status": "LabelingFailed"}).eq("dataset_id", dataset_id).execute()
        except Exception:
            pass

