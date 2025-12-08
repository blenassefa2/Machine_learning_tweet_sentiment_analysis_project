# app/services/classify_service.py
import uuid
import io
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.cluster import DBSCAN

from app.db.supabase_client import supabase

DATA_BUCKET = "datasets"
CLASS_TABLE = "classifications"
JOB_TABLE = "classify_jobs"
DATASET_TABLE = "datasets"

def _now_iso():
    return datetime.now(timezone.utc).isoformat()

# ---- Job helpers ----
def create_classify_job(dataset_id: str, session_id: str, algorithm: str) -> str:
    job_id = str(uuid.uuid4())
    supabase.table(JOB_TABLE).insert({
        "job_id": job_id,
        "dataset_id": dataset_id,
        "session_id": session_id,
        "algorithm": algorithm,
        "status": "queued",
        "progress": 0,
        "message": "Queued",
        "created_at": _now_iso()
    }).execute()
    return job_id

def update_job(job_id: str, progress: int, message: str):
    supabase.table(JOB_TABLE).update({"progress": progress, "message": message}).eq("job_id", job_id).execute()

def mark_job_running(job_id: str):
    supabase.table(JOB_TABLE).update({"status": "running", "started_at": _now_iso(), "progress": 1}).eq("job_id", job_id).execute()

def mark_job_completed(job_id: str, classified_path: str):
    supabase.table(JOB_TABLE).update({
        "status": "completed", "finished_at": _now_iso(), "progress": 100, "classified_file": classified_path
    }).eq("job_id", job_id).execute()

def mark_job_failed(job_id: str, message: str):
    supabase.table(JOB_TABLE).update({"status": "failed", "message": message, "finished_at": _now_iso()}).eq("job_id", job_id).execute()

# ---- Helpers: load dataset ----
def _load_dataset_bytes(path: str) -> bytes:
    return supabase.storage.from_(DATA_BUCKET).download(path)

def _load_df_from_storage(path: str) -> pd.DataFrame:
    data = _load_dataset_bytes(path)
    text = data.decode("utf-8")
    try:
        df = pd.read_csv(io.StringIO(text))
    except Exception:
        df = pd.read_csv(io.StringIO(text), sep='|')
    return df

# ---- Naive classifier logic ----
def _classify_naive_by_keywords(df: pd.DataFrame, keyword_map: Dict[str, List[str]]) -> pd.Series:
    # assume there's a 'text' or similar column - find best text column
    text_col = None
    for candidate in ["text", "tweet", "content", "message"]:
        if candidate in df.columns:
            text_col = candidate
            break
    if text_col is None:
        # fallback to first string column
        for c in df.columns:
            if df[c].dtype == object:
                text_col = c
                break
    if text_col is None:
        raise RuntimeError("No text column found for naive classification")

    texts = df[text_col].astype(str).str.lower()
    labels = []
    for t in texts:
        scores = {}
        for label, words in keyword_map.items():
            s = 0
            for w in words:
                if w.lower() in t:
                    s += 1
            scores[label] = s
        # find best label or -1
        best_label, best_score = max(scores.items(), key=lambda kv: kv[1])
        labels.append(best_label if best_score > 0 else -1)
    return pd.Series(labels, name="target")

# ---- Clustering logic ----
def _vectorize_texts(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    # pick text column like above
    text_col = None
    for candidate in ["text", "tweet", "content", "message"]:
        if candidate in df.columns:
            text_col = candidate
            break
    if text_col is None:
        for c in df.columns:
            if df[c].dtype == object:
                text_col = c
                break
    if text_col is None:
        raise RuntimeError("No text column found for clustering")
    texts = df[text_col].astype(str).fillna("")
    vec = TfidfVectorizer(max_features=5000, stop_words='english')
    X = vec.fit_transform(texts)
    return X, text_col

def _run_clustering(X, algorithm: str, hp) -> List[int]:
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
        linkage = hp.linkage or "ward"
        model = AgglomerativeClustering(n_clusters=n, linkage=linkage)
        preds = model.fit_predict(X.toarray() if hasattr(X, "toarray") else X)
    else:
        raise ValueError(f"Unsupported algorithm {algorithm}")
    return preds

# ---- Core worker: naive / clustering / manual annotation ----
def _write_classified_file_and_store(df: pd.DataFrame, dataset_id: str) -> str:
    csv_buf = io.StringIO()
    df.to_csv(csv_buf, index=False)
    bytes_data = csv_buf.getvalue().encode("utf-8")
    path = f"classified/{dataset_id}_classified.csv"
    supabase.storage.from_(DATA_BUCKET).upload(path, bytes_data, {"contentType":"text/csv"})
    return path

def run_manual_annotation_job(job_id: str, dataset_id: str, session_id: str, annotations: List[Dict]):
    try:
        mark_job_running(job_id)
        update_job(job_id, 10, "Loading dataset")
        res = supabase.table(DATASET_TABLE).select("*").eq("dataset_id", dataset_id).eq("session_id", session_id).execute()
        if not res.data:
            raise RuntimeError("Dataset not found")
        ds = res.data[0]
        df = _load_df_from_storage(ds["original_file"])

        # ensure target column exists (or create)
        if "target" not in df.columns:
            df["target"] = -1

        update_job(job_id, 25, "Applying annotations")
        for a in annotations:
            idx = int(a["row_index"])
            df.at[idx, "target"] = a["label"]

        path = _write_classified_file_and_store(df, dataset_id)

        # write classification metadata
        supabase.table(CLASS_TABLE).insert({
            "classified_dataset_id": str(uuid.uuid4()),
            "dataset_id": dataset_id,
            "session_id": session_id,
            "algorithm": "manual",
            "hyperparameters": {},
            "results": df.head(50).to_dict(orient="records"),
            "summary": {"annotated_rows": len([x for x in annotations])},
            "classified_file": path,
            "status": "completed",
            "created_at": _now_iso()
        }).execute()

        supabase.table(DATASET_TABLE).update({"cleaned_file": ds.get("cleaned_file"), "status": "Classified"}).eq("dataset_id", dataset_id).execute()
        mark_job_completed(job_id, path)
    except Exception as e:
        mark_job_failed(job_id, str(e))
        supabase.table(DATASET_TABLE).update({"status": "ClassifyFailed"}).eq("dataset_id", dataset_id).execute()

def run_naive_job(job_id: str, dataset_id: str, session_id: str, keyword_map: Optional[Dict[str, List[str]]] = None, use_default=False):
    try:
        mark_job_running(job_id)
        update_job(job_id, 10, "Loading dataset")
        res = supabase.table(DATASET_TABLE).select("*").eq("dataset_id", dataset_id).eq("session_id", session_id).execute()
        if not res.data:
            raise RuntimeError("Dataset not found")
        ds = res.data[0]
        df = _load_df_from_storage(ds["original_file"])

        if use_default and not keyword_map:
            # load default files for classes; assume file names stored in storage keywords/
            # We expect files: keywords/pos.txt, keywords/neg.txt OR a mapping you define.
            keyword_map = {}
            # list stored files under keywords folder and load...
            # For simplicity: look for known class names
            for cname in ["positive","negative","pos","neg"]:
                try:
                    kb = supabase.storage.from_(DATA_BUCKET).download(f"keywords/{cname}.txt")
                    if kb:
                        words = kb.decode("utf-8").splitlines()
                        keyword_map[cname] = words
                except Exception:
                    continue

        if not keyword_map:
            raise RuntimeError("No keywords provided for naive classification")

        update_job(job_id, 40, "Applying naive classification")
        labels = _classify_naive_by_keywords(df, keyword_map)
        df["target"] = labels

        update_job(job_id, 80, "Saving classified file")
        path = _write_classified_file_and_store(df, dataset_id)

        supabase.table(CLASS_TABLE).insert({
            "classified_dataset_id": str(uuid.uuid4()),
            "dataset_id": dataset_id,
            "session_id": session_id,
            "algorithm": "naive",
            "hyperparameters": {"keywords_provided": bool(keyword_map)},
            "results": df.head(50).to_dict(orient="records"),
            "summary": {"total": len(df), "classified": int((df["target"] != -1).sum()), "unclassified": int((df["target"] == -1).sum())},
            "classified_file": path,
            "status": "completed",
            "created_at": _now_iso()
        }).execute()

        supabase.table(DATASET_TABLE).update({"cleaned_file": ds.get("cleaned_file"), "status": "Classified"}).eq("dataset_id", dataset_id).execute()
        mark_job_completed(job_id, path)
    except Exception as e:
        mark_job_failed(job_id, str(e))
        supabase.table(DATASET_TABLE).update({"status": "ClassifyFailed"}).eq("dataset_id", dataset_id).execute()

def run_clustering_job(job_id: str, dataset_id: str, session_id: str, algorithm: str, hyperparams):
    try:
        mark_job_running(job_id)
        update_job(job_id, 10, "Loading dataset")
        res = supabase.table(DATASET_TABLE).select("*").eq("dataset_id", dataset_id).eq("session_id", session_id).execute()
        if not res.data:
            raise RuntimeError("Dataset not found")
        ds = res.data[0]
        df = _load_df_from_storage(ds["original_file"])

        update_job(job_id, 25, "Vectorizing text")
        X, text_col = _vectorize_texts(df)

        update_job(job_id, 50, "Running clustering")
        preds = _run_clustering(X, algorithm, hyperparams)

        update_job(job_id, 75, "Saving results")
        df["cluster"] = preds
        path = _write_classified_file_and_store(df, dataset_id)

        # summary
        unique, counts = np.unique(preds, return_counts=True)
        summary = {"clusters": int(len(unique)), "rows_per_cluster": counts.tolist()}

        supabase.table(CLASS_TABLE).insert({
            "classified_dataset_id": str(uuid.uuid4()),
            "dataset_id": dataset_id,
            "session_id": session_id,
            "algorithm": algorithm,
            "hyperparameters": hyperparams.__dict__ if hyperparams else {},
            "results": df.head(50).to_dict(orient="records"),
            "summary": summary,
            "classified_file": path,
            "status": "completed",
            "created_at": _now_iso()
        }).execute()

        supabase.table(DATASET_TABLE).update({"cleaned_file": ds.get("cleaned_file"), "status": "Classified"}).eq("dataset_id", dataset_id).execute()
        mark_job_completed(job_id, path)
    except Exception as e:
        mark_job_failed(job_id, str(e))
        supabase.table(DATASET_TABLE).update({"status": "ClassifyFailed"}).eq("dataset_id", dataset_id).execute()