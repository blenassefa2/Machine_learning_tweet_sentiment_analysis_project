# app/services/cleaning_service.py
import uuid
import io
import re
import pandas as pd
from datetime import datetime, timezone
from typing import Tuple, Dict, Set
from collections import defaultdict
from app.db.supabase_client import supabase
from app.models.cleaning import CleaningOptions, MissingValueOption, TextCleaningOptions, ColumnValidationOptions
from postgrest.exceptions import APIError

try:
    from fast_langdetect import detect
    LANGDETECT_AVAILABLE = True
except ImportError:
    LANGDETECT_AVAILABLE = False

DATA_BUCKET = "datasets"
JOB_TABLE = "clean_jobs"
DATASET_TABLE = "datasets"

# Metrics tracking for cleaning operations
cleaning_metrics = defaultdict(int)

def _now_utc_iso():
    return datetime.now(timezone.utc).isoformat()

# -------------------------
# Text Cleaning Functions
# -------------------------

def _clean_text(
    text: str,
    options: TextCleaningOptions
) -> str:
    """
    Clean a single text string based on provided options.
    Returns empty string if text should be removed.
    """
    if not text or pd.isna(text):
        cleaning_metrics["Absent_text"] += 1
        return ""
    
    text = str(text)
    
    # 1. Remove retweets
    if options.remove_retweets:
        if text.startswith("RT ") or text.startswith("RT@") or text.startswith("RT @"):
            cleaning_metrics["Retweet"] += 1
            return ""
    
    # 2. Remove hashtag symbols (keep the word)
    if options.remove_hashtags:
        text = text.replace("#", "")
    
    # 3. Remove mentions and emails
    if options.remove_mentions:
        text = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", " ", text)
        text = re.sub(r"@\w+", " ", text)
    
    # 4. Remove HTML tags (before emoji check to avoid HTML entities interfering)
    if options.remove_html_tags:
        text = re.sub(r"<[^>]+>", " ", text)
    
    # 5. Remove contradictory emojis (before remove_numbers to preserve emojis for checking)
    if options.remove_contradictory_emojis:
        positive_markers = {
            "😀", "😃", "😄", "😁", "😊", "😍", "🥰", "👍", "🤩", "😂", "😎", "😉", "😘",
            ":)", ":-)", ";)", ";-)", "<3", "^^"
        }
        negative_markers = {
            "😠", "😡", "😢", "😭", "☹️", "😞", "👎", "🤬", "😒", "😕", "🙁", "😩", "😤",
            ":(", ":-(", ";(", ";-("
        }
        contains_positive = any(marker in text for marker in positive_markers)
        contains_negative = any(marker in text for marker in negative_markers)
        if contains_positive and contains_negative:
            cleaning_metrics["positive_and_negative"] += 1
            return ""
    
    # 6. Remove numbers and punctuation (after emoji check)
    if options.remove_numbers:
        text = re.sub(r"[^\w\s]", " ", text)
    
    # 7. Language detection and filtering
    if options.remove_not_french or options.remove_not_english:
        if not LANGDETECT_AVAILABLE:
            # If langdetect not available, skip language filtering
            pass
        else:
            try:
                result = detect(text, model='lite', k=1)
                detected_lang = result[0]['lang'] if result else None
                
                if options.remove_not_french:
                    if detected_lang != "fr":
                        cleaning_metrics["not_french"] += 1
                        return ""
                
                if options.remove_not_english:
                    if detected_lang != "en":
                        cleaning_metrics["not_english"] += 1
                        return ""
                
                # Also filter out languages that are neither French nor English
                if detected_lang not in ["fr", "en"]:
                    cleaning_metrics["not_french_nor_english"] += 1
                    return ""
            except Exception:
                # If language detection fails, keep the text
                pass
    
    # 8. Remove extra spaces
    if options.remove_extra_spaces:
        text = re.sub(r"\s+", " ", text).strip()
    
    # 9. Remove URLs (final pass)
    if options.remove_urls:
        text = re.sub(r"https?://\S+|www\.[^\s]+", "", text).strip()
    
    # If text is empty after cleaning, mark it
    if not text:
        cleaning_metrics["empty_after_cleaning"] += 1
        return ""
    
    return text

def _apply_text_cleaning(df: pd.DataFrame, options: TextCleaningOptions) -> pd.DataFrame:
    """Apply text cleaning to specified columns."""
    if not options or not options.text_columns:
        return df
    
    # Determine which columns to clean
    columns_to_clean = options.text_columns
    # Filter to only existing columns
    columns_to_clean = [col for col in columns_to_clean if col in df.columns]
    
    if not columns_to_clean:
        return df
    
    # Apply cleaning to each column
    for col in columns_to_clean:
        df[col] = df[col].apply(lambda x: _clean_text(x, options))
    
    # Remove rows where all text columns became empty
    mask = df[columns_to_clean].apply(lambda row: any(str(val).strip() != "" for val in row), axis=1)
    rows_removed = len(df) - mask.sum()
    if rows_removed > 0:
        cleaning_metrics["rows_removed_empty_text"] += rows_removed
        df = df[mask]
    
    return df

# -------------------------
# Column Validation Functions
# -------------------------

def _apply_column_validations(df: pd.DataFrame, validations: list[ColumnValidationOptions]) -> pd.DataFrame:
    """Apply column validations and filter rows."""
    if not validations:
        return df
    
    initial_count = len(df)
    mask = pd.Series([True] * len(df), index=df.index)
    
    for validation in validations:
        col = validation.column
        if col not in df.columns:
            continue
        
        if validation.validation_type == "polarity":
            if validation.allowed_values:
                allowed = set(validation.allowed_values)
                try:
                    col_mask = df[col].astype(str).apply(lambda x: int(x) if x.isdigit() else None).isin(allowed) | df[col].isna()
                    invalid_mask = ~col_mask
                    if invalid_mask.any():
                        cleaning_metrics[f"invalid_polarity_{col}"] += invalid_mask.sum()
                    mask = mask & col_mask
                except Exception:
                    cleaning_metrics[f"wrong_polarity_format_{col}"] += len(df)
                    mask = pd.Series([False] * len(df), index=df.index)
        
        elif validation.validation_type == "unique_id":
            seen = set()
            col_mask = df[col].apply(lambda x: x not in seen and (seen.add(x) or True) if pd.notna(x) and x != "" else False)
            duplicates = ~col_mask & df[col].notna() & (df[col] != "")
            if duplicates.any():
                cleaning_metrics[f"repeated_ids_{col}"] += duplicates.sum()
            mask = mask & col_mask
        
        elif validation.validation_type == "date":
            def parse_date(date_str):
                if pd.isna(date_str):
                    return None
                try:
                    # Try common date formats
                    for fmt in ["%a %b %d %H:%M:%S %Z %Y", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S"]:
                        try:
                            return datetime.strptime(str(date_str), fmt).date()
                        except:
                            continue
                    # Fallback: try without timezone
                    parts = str(date_str).split()
                    if len(parts) == 6:
                        without_tz = " ".join(parts[0:3] + [parts[3]] + [parts[5]])
                        return datetime.strptime(without_tz, "%a %b %d %H:%M:%S %Y").date()
                except Exception:
                    pass
                return None
            
            col_mask = df[col].apply(parse_date).notna()
            invalid = ~col_mask & df[col].notna()
            if invalid.any():
                cleaning_metrics[f"wrong_date_format_{col}"] += invalid.sum()
            mask = mask & col_mask
        
        elif validation.validation_type == "not_empty":
            col_mask = df[col].notna() & (df[col].astype(str).str.strip() != "")
            invalid = ~col_mask
            if invalid.any():
                cleaning_metrics[f"empty_{col}"] += invalid.sum()
            mask = mask & col_mask
        
        elif validation.validation_type == "max_length":
            if validation.max_length:
                col_mask = df[col].astype(str).str.len() <= validation.max_length
                invalid = ~col_mask & df[col].notna()
                if invalid.any():
                    cleaning_metrics[f"too_long_{col}"] += invalid.sum()
                mask = mask & col_mask
    
    rows_removed = initial_count - mask.sum()
    if rows_removed > 0:
        cleaning_metrics["rows_removed_validation"] += rows_removed
    
    return df[mask]

# -------------------------
# Other Cleaning Helpers
# -------------------------

def _apply_keep_columns(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Keep only specified columns."""
    if not columns:
        return df
    # Filter to only existing columns
    existing_cols = [col for col in columns if col in df.columns]
    if not existing_cols:
        return df
    return df[existing_cols]

def _apply_remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """Remove duplicate rows."""
    initial_count = len(df)
    df = df.drop_duplicates()
    duplicates_removed = initial_count - len(df)
    if duplicates_removed > 0:
        cleaning_metrics["duplicate_rows"] += duplicates_removed
    return df

def _apply_missing_value_options(df: pd.DataFrame, options: list[MissingValueOption]):
    """Apply missing value handling options."""
    if not options:
        return df

    for opt in options:
        cols = opt.columns if opt.columns else df.columns.tolist()
        # Filter to only existing columns
        cols = [col for col in cols if col in df.columns]
        if not cols:
            continue
            
        if opt.strategy == "drop_rows":
            initial_count = len(df)
            df = df.dropna(subset=cols)
            rows_dropped = initial_count - len(df)
            if rows_dropped > 0:
                cleaning_metrics["rows_dropped_missing"] += rows_dropped
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
        "status": "pending",  # Changed from "queued" to match frontend
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

def mark_job_completed(job_id, cleaned_file_path: str, metrics: Dict = None):
    update_data = {
        "status": "completed",
        "progress": 100,
        "message": "Completed",
        "finished_at": _now_utc_iso(),
        "cleaned_file": cleaned_file_path
    }
    if metrics:
        update_data["metrics"] = metrics
    supabase.table(JOB_TABLE).update(update_data).eq("job_id", job_id).execute()

def mark_job_failed(job_id, message: str):
    supabase.table(JOB_TABLE).update({
        "status": "error",  # Changed from "failed" to match frontend
        "message": message,
        "finished_at": _now_utc_iso()
    }).eq("job_id", job_id).execute()

# -------------------------
# Core cleaning worker
# -------------------------
def run_cleaning_job(job_id: str, dataset_id: str, session_id: str, options: CleaningOptions):
    """
    1) Download original file for dataset
    2) Apply cleaning pipeline using options
    3) Save cleaned CSV to storage
    4) Update datasets table (cleaned_file, status)
    5) Update job table progress
    """
    # Reset metrics for this job
    global cleaning_metrics
    cleaning_metrics = defaultdict(int)
    
    try:
        mark_job_running(job_id)
        update_job_progress(job_id, 5, "Downloading original dataset")

        # Fetch dataset metadata
        res = supabase.table(DATASET_TABLE).select("*").eq("dataset_id", dataset_id).eq("session_id", session_id).execute()
        if not res.data:
            raise RuntimeError("Dataset not found")
        ds = res.data[0]
        orig_path = ds["original_file"]

        file_bytes = supabase.storage.from_(DATA_BUCKET).download(orig_path)
        if isinstance(file_bytes, dict) and file_bytes.get("error"):
            raise RuntimeError(f"Storage download error: {file_bytes}")

        update_job_progress(job_id, 15, "Parsing CSV")
        # Read into pandas
        text = file_bytes.decode("utf-8")
        # Try to infer separator; default comma
        try:
            df = pd.read_csv(io.StringIO(text))
        except Exception:
            # Fallback: try with sep='|'
            df = pd.read_csv(io.StringIO(text), sep='|')

        initial_row_count = len(df)
        cleaning_metrics["initial_rows"] = initial_row_count

        # Apply cleaning pipeline in order
        progress_base = 20
        progress_step = 60 / 6  # 6 main steps

        # Step 1: Column validations (filter rows early)
        if options.column_validations:
            update_job_progress(job_id, int(progress_base), "Validating columns")
            df = _apply_column_validations(df, options.column_validations)
            progress_base += progress_step

        # Step 2: Remove duplicates
        if options.remove_duplicates:
            update_job_progress(job_id, int(progress_base), "Removing duplicates")
            df = _apply_remove_duplicates(df)
            progress_base += progress_step

        # Step 3: Text cleaning
        if options.text_cleaning:
            update_job_progress(job_id, int(progress_base), "Cleaning text columns")
            df = _apply_text_cleaning(df, options.text_cleaning)
            progress_base += progress_step

        # Step 4: Missing values
        if options.missing_value_options:
            update_job_progress(job_id, int(progress_base), "Handling missing values")
            df = _apply_missing_value_options(df, options.missing_value_options)
            progress_base += progress_step

        # Step 5: Keep columns (do this last to preserve columns needed for earlier steps)
        if options.keep_columns:
            update_job_progress(job_id, int(progress_base), "Selecting columns")
            df = _apply_keep_columns(df, options.keep_columns)
            progress_base += progress_step

        final_row_count = len(df)
        cleaning_metrics["final_rows"] = final_row_count
        cleaning_metrics["rows_removed"] = initial_row_count - final_row_count

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

        # Convert metrics to regular dict for JSON serialization
        metrics_dict = dict(cleaning_metrics)
        mark_job_completed(job_id, cleaned_path, metrics_dict)
        update_job_progress(job_id, 100, "Completed")
    except Exception as e:
        mark_job_failed(job_id, str(e))
        # Also update dataset status
        try:
            supabase.table(DATASET_TABLE).update({"status": "CleaningFailed"}).eq("dataset_id", dataset_id).execute()
        except Exception:
            pass
