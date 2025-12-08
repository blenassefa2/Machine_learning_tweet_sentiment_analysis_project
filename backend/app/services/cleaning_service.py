# app/services/cleaning_service.py
import uuid
import io
import pandas as pd
from datetime import datetime, timezone
from typing import Tuple
from app.db.supabase_client import supabase
from app.models.cleaning import CleaningOptions, MissingValueOption
from postgrest.exceptions import APIError

DATA_BUCKET = "datasets"
JOB_TABLE = "clean_jobs"
DATASET_TABLE = "datasets"

def _now_utc_iso():
    return datetime.now(timezone.utc).isoformat()

# -------------------------
# Low-level cleaning helpers
# -------------------------
def _apply_keep_columns(df: pd.DataFrame, keep_columns):
    if not keep_columns:
        return df
    # keep only columns that exist
    existing = [c for c in keep_columns if c in df.columns]
    return df[existing]

def _apply_remove_duplicates(df: pd.DataFrame):
    return df.drop_duplicates()

def _apply_missing_value_options(df: pd.DataFrame, options: list[MissingValueOption]):
    # options applied in order
    if not options:
        return df

    for opt in options:
        cols = opt.columns if opt.columns else df.columns.tolist()
        if opt.strategy == "drop_rows":
            df = df.dropna(subset=cols)
        elif opt.strategy == "fill_constant":
            val = opt.constant_value if opt.constant_value is not None else ""
            df[cols] = df[cols].fillna(val)
        elif opt.strategy == "fill_mean":
            for c in cols:
                if pd.api.types.is_numeric_dtype(df[c]):
                    df[c] = df[c].fillna(df[c].mean())
        elif opt.strategy == "fill_median":
            for c in cols:
                if pd.api.types.is_numeric_dtype(df[c]):
                    df[c] = df[c].fillna(df[c].median())
        elif opt.strategy == "fill_mode":
            for c in cols:
                try:
                    mode_val = df[c].mode().iloc[0]
                    df[c] = df[c].fillna(mode_val)
                except Exception:
                    df[c] = df[c].fillna("")
    return df

# -------------------------
# Job helpers
# -------------------------
def create_clean_job(dataset_id: str, session_id: str) -> str:
    job_id = str(uuid.uuid4())
    supabase.table(JOB_TABLE).insert({
        "job_id": job_id,
        "dataset_id": dataset_id,
        "session_id": session_id,
        "status": "queued",
        "progress": 0,
        "message": "Queued",
        "created_at": _now_utc_iso()
    }).execute()
    return job_id

def update_job_progress(job_id: str, progress: int, message: str = ""):
    supabase.table(JOB_TABLE).update({
        "progress": progress,
        "message": message
    }).eq("job_id", job_id).execute()

def mark_job_running(job_id):
    supabase.table(JOB_TABLE).update({
        "status": "running",
        "started_at": _now_utc_iso(),
        "progress": 1,
        "message": "Running"
    }).eq("job_id", job_id).execute()

def mark_job_completed(job_id, cleaned_file_path: str):
    supabase.table(JOB_TABLE).update({
        "status": "completed",
        "progress": 100,
        "message": "Completed",
        "finished_at": _now_utc_iso(),
        "cleaned_file": cleaned_file_path
    }).eq("job_id", job_id).execute()

def mark_job_failed(job_id, message: str):
    supabase.table(JOB_TABLE).update({
        "status": "failed",
        "message": message,
        "finished_at": _now_utc_iso()
    }).eq("job_id", job_id).execute()

# -------------------------
# Core cleaning worker (can be called in BackgroundTasks or queue worker)
# -------------------------
def run_cleaning_job(job_id: str, dataset_id: str, session_id: str, options: CleaningOptions):
    """
    1) Download original file for dataset
    2) Apply cleaning pipeline using options
    3) Save cleaned CSV to storage
    4) Update datasets table (cleaned_file, status)
    5) Update job table progress
    """
    try:
        mark_job_running(job_id)
        update_job_progress(job_id, 5, "Downloading original dataset")

        # fetch dataset metadata
        res = supabase.table(DATASET_TABLE).select("*").eq("dataset_id", dataset_id).eq("session_id", session_id).execute()
        if not res.data:
            raise RuntimeError("Dataset not found")
        ds = res.data[0]
        orig_path = ds["original_file"]

        file_bytes = supabase.storage.from_(DATA_BUCKET).download(orig_path)
        if isinstance(file_bytes, dict) and file_bytes.get("error"):
            raise RuntimeError(f"Storage download error: {file_bytes}")

        update_job_progress(job_id, 15, "Parsing CSV")
        # read into pandas
        text = file_bytes.decode("utf-8")
        # try to infer separator; default comma
        try:
            df = pd.read_csv(io.StringIO(text))
        except Exception:
            # fallback: try with sep='|'
            df = pd.read_csv(io.StringIO(text), sep='|')

        total_steps = 3
        step = 0

        # Keep columns
        update_job_progress(job_id, 25, "Applying keep_columns")
        df = _apply_keep_columns(df, options.keep_columns)
        step += 1

        # Remove duplicates
        if options.remove_duplicates:
            update_job_progress(job_id, 40, "Removing duplicates")
            df = _apply_remove_duplicates(df)
        step += 1

        # Missing values
        if options.missing_value_options:
            update_job_progress(job_id, 65, "Handling missing values")
            df = _apply_missing_value_options(df, options.missing_value_options)
        step += 1

        update_job_progress(job_id, 85, "Serializing cleaned data")

        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        cleaned_bytes = csv_buffer.getvalue().encode("utf-8")

        # Save cleaned file to storage under folder cleaned/
        cleaned_path = f"cleaned/{dataset_id}_cleaned.csv"
        supabase.storage.from_(DATA_BUCKET).upload(cleaned_path, cleaned_bytes, {"contentType": "text/csv"})

        # Update datasets table
        supabase.table(DATASET_TABLE).update({
            "cleaned_file": cleaned_path,
            "status": "Cleaned"
        }).eq("dataset_id", dataset_id).execute()

        mark_job_completed(job_id, cleaned_path)
        # ensure dataset status progress at 100
        update_job_progress(job_id, 100, "Completed")
    except Exception as e:
        mark_job_failed(job_id, str(e))
        # also update dataset status
        try:
            supabase.table(DATASET_TABLE).update({"status": "CleaningFailed"}).eq("dataset_id", dataset_id).execute()
        except Exception:
            pass