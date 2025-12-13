# app/services/cleaning_service.py
import uuid
import io
import re
import pandas as pd
import numpy as np
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

try:
    import chardet
    CHARDET_AVAILABLE = True
except ImportError:
    CHARDET_AVAILABLE = False

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

def _apply_text_cleaning(df: pd.DataFrame, options: TextCleaningOptions, column_mapping: dict = None) -> pd.DataFrame:
    """Apply text cleaning to specified columns.
    
    Args:
        df: DataFrame (columns are numeric indices)
        options: Text cleaning options
        column_mapping: Optional dict mapping column indices to names (e.g., {0: 'tweet'})
    """
    if not options or not options.text_columns:
        return df
    
    # Determine which columns to clean by index
    columns_to_clean_indices = []
    
    # text_columns can be column names (strings) or indices (strings that are digits)
    for col_spec in options.text_columns:
        # Try to parse as integer index first
        try:
            col_idx = int(col_spec)
            if 0 <= col_idx < len(df.columns):
                columns_to_clean_indices.append(col_idx)
                continue
        except ValueError:
            pass
        
        # If not an integer, try to find in column_mapping (reverse lookup)
        if column_mapping:
            for idx, name in column_mapping.items():
                if name == col_spec:
                    columns_to_clean_indices.append(idx)
                    break
    
    if not columns_to_clean_indices:
        return df
    
    # Apply cleaning to each column by index
    for col_idx in columns_to_clean_indices:
        if col_idx < len(df.columns):
            df.iloc[:, col_idx] = df.iloc[:, col_idx].apply(lambda x: _clean_text(x, options))
    
    # Remove rows where all text columns became empty
    if columns_to_clean_indices:
        mask = df.iloc[:, columns_to_clean_indices].apply(
            lambda row: any(str(val).strip() != "" for val in row), axis=1
        )
        rows_removed = len(df) - mask.sum()
        if rows_removed > 0:
            cleaning_metrics["rows_removed_empty_text"] += rows_removed
            df = df[mask]
    
    return df

# -------------------------
# Column Validation Functions
# -------------------------

def _apply_column_validations(df: pd.DataFrame, validations: list[ColumnValidationOptions], column_mapping: dict = None) -> pd.DataFrame:
    """Apply column validations and filter rows.
    
    Args:
        df: DataFrame with numeric column indices
        validations: List of validation rules
        column_mapping: Optional dict mapping column indices to names (e.g., {0: 'tweet'})
    """
    if not validations:
        return df
    
    initial_count = len(df)
    mask = pd.Series([True] * len(df), index=df.index)
    
    for validation in validations:
        # Try to find column index from column name or use as index directly
        col_idx = None
        col_name = validation.column
        
        # Try to parse as integer index
        try:
            col_idx = int(col_name)
            if col_idx >= len(df.columns):
                continue
        except ValueError:
            # Not an integer, try to find in column_mapping (reverse lookup)
            if column_mapping:
                for idx, name in column_mapping.items():
                    if name == col_name:
                        col_idx = idx
                        break
            if col_idx is None:
                continue
        
        if col_idx is None or col_idx >= len(df.columns):
            continue
        
        # Access column by index
        col_series = df.iloc[:, col_idx]
        
        if validation.validation_type == "polarity":
            if validation.allowed_values:
                allowed = set(validation.allowed_values)
                try:
                    col_mask = col_series.astype(str).apply(lambda x: int(x) if x.isdigit() else None).isin(allowed) | col_series.isna()
                    invalid_mask = ~col_mask
                    if invalid_mask.any():
                        cleaning_metrics[f"invalid_polarity_{col_idx}"] += invalid_mask.sum()
                    mask = mask & col_mask
                except Exception:
                    cleaning_metrics[f"wrong_polarity_format_{col_idx}"] += len(df)
                    mask = pd.Series([False] * len(df), index=df.index)
        
        elif validation.validation_type == "unique_id":
            seen = set()
            col_mask = col_series.apply(lambda x: x not in seen and (seen.add(x) or True) if pd.notna(x) and x != "" else False)
            duplicates = ~col_mask & col_series.notna() & (col_series != "")
            if duplicates.any():
                cleaning_metrics[f"repeated_ids_{col_idx}"] += duplicates.sum()
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
            
            col_mask = col_series.apply(parse_date).notna()
            invalid = ~col_mask & col_series.notna()
            if invalid.any():
                cleaning_metrics[f"wrong_date_format_{col_idx}"] += invalid.sum()
            mask = mask & col_mask
        
        elif validation.validation_type == "not_empty":
            col_mask = col_series.notna() & (col_series.astype(str).str.strip() != "")
            invalid = ~col_mask
            if invalid.any():
                cleaning_metrics[f"empty_{col_idx}"] += invalid.sum()
            mask = mask & col_mask
        
        elif validation.validation_type == "max_length":
            if validation.max_length:
                col_mask = col_series.astype(str).str.len() <= validation.max_length
                invalid = ~col_mask & col_series.notna()
                if invalid.any():
                    cleaning_metrics[f"too_long_{col_idx}"] += invalid.sum()
                mask = mask & col_mask
    
    rows_removed = initial_count - mask.sum()
    if rows_removed > 0:
        cleaning_metrics["rows_removed_validation"] += rows_removed
    
    return df[mask]

# -------------------------
# Other Cleaning Helpers
# -------------------------

def _apply_keep_columns(df: pd.DataFrame, column_mapping: dict) -> pd.DataFrame:
    """Keep only specified columns by index and rename them.
    
    Args:
        df: DataFrame with numeric column indices
        column_mapping: Dict mapping column numbers (as int) to column names (e.g., {0: 'tweet', 1: 'id'})
    
    Returns:
        DataFrame with only specified columns, renamed with user-provided names
    """
    if not column_mapping:
        return df
    
    # Get column indices to keep (sorted to maintain order)
    indices_to_keep = sorted([idx for idx in column_mapping.keys() if 0 <= idx < len(df.columns)])
    
    if not indices_to_keep:
        return df
    
    # Select columns by index
    df_selected = df.iloc[:, indices_to_keep].copy()
    
    # Rename columns with user-provided names
    new_column_names = [column_mapping[idx] for idx in indices_to_keep]
    df_selected.columns = new_column_names
    
    return df_selected

def _apply_remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """Remove duplicate rows."""
    initial_count = len(df)
    df = df.drop_duplicates()
    duplicates_removed = initial_count - len(df)
    if duplicates_removed > 0:
        cleaning_metrics["duplicate_rows"] += duplicates_removed
    return df

def _apply_missing_value_options(df: pd.DataFrame, options: list[MissingValueOption], column_mapping: dict = None):
    """Apply missing value handling options.
    
    Args:
        df: DataFrame with numeric column indices
        options: List of missing value handling options
        column_mapping: Optional dict mapping column indices to names (e.g., {0: 'tweet'})
    """
    if not options:
        return df

    for opt in options:
        # Determine which columns to process
        if opt.columns:
            # Try to map column names to indices, or parse as indices
            col_indices = []
            for col_spec in opt.columns:
                try:
                    col_idx = int(col_spec)
                    if 0 <= col_idx < len(df.columns):
                        col_indices.append(col_idx)
                except ValueError:
                    # Not an integer, try to find in column_mapping
                    if column_mapping:
                        for idx, name in column_mapping.items():
                            if name == col_spec:
                                col_indices.append(idx)
                                break
        else:
            # Apply to all columns
            col_indices = list(range(len(df.columns)))
        
        if not col_indices:
            continue
            
        if opt.strategy == "drop_rows":
            initial_count = len(df)
            # Drop rows where any of the specified columns have NaN
            mask = df.iloc[:, col_indices].notna().all(axis=1)
            df = df[mask]
            rows_dropped = initial_count - len(df)
            if rows_dropped > 0:
                cleaning_metrics["rows_dropped_missing"] += rows_dropped
        elif opt.strategy == "fill_constant":
            val = opt.constant_value if opt.constant_value is not None else ""
            for col_idx in col_indices:
                df.iloc[:, col_idx] = df.iloc[:, col_idx].fillna(val)
        elif opt.strategy == "fill_mean":
            for col_idx in col_indices:
                col_series = df.iloc[:, col_idx]
                if pd.api.types.is_numeric_dtype(col_series):
                    df.iloc[:, col_idx] = col_series.fillna(col_series.mean())
        elif opt.strategy == "fill_median":
            for col_idx in col_indices:
                col_series = df.iloc[:, col_idx]
                if pd.api.types.is_numeric_dtype(col_series):
                    df.iloc[:, col_idx] = col_series.fillna(col_series.median())
        elif opt.strategy == "fill_mode":
            for col_idx in col_indices:
                col_series = df.iloc[:, col_idx]
                try:
                    mode_val = col_series.mode().iloc[0]
                    df.iloc[:, col_idx] = col_series.fillna(mode_val)
                except Exception:
                    df.iloc[:, col_idx] = col_series.fillna("")
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

        update_job_progress(job_id, 15, "Detecting encoding and parsing CSV")
        
        # Detect encoding gracefully (similar to input_output.py)
        encoding = "utf-8"  # Default encoding
        if CHARDET_AVAILABLE:
            try:
                # Sample first 50KB for encoding detection (faster than full file)
                sample_size = min(50000, len(file_bytes))
                result = chardet.detect(file_bytes[:sample_size])
                if result and result.get("encoding"):
                    detected_encoding = result["encoding"]
                    # Use detected encoding if confidence is reasonable
                    if result.get("confidence", 0) > 0.7:
                        encoding = detected_encoding
        except Exception as e:
                
                # If detection fails, fall back to default
                print(f"Falling back to default encoding: {e}")
                
        
        # Decode with graceful fallback
        text = None
        encodings_to_try = [encoding, "utf-8", "latin-1", "iso-8859-1", "cp1252", "windows-1252"]
        
        for enc in encodings_to_try:
            try:
                text = file_bytes.decode(enc, errors="replace")
                break
            except (UnicodeDecodeError, LookupError):
                continue
        
        if text is None:
            # Last resort: decode with errors='replace' using utf-8
            text = file_bytes.decode("utf-8", errors="replace")
        
        # Read into pandas (CSV files don't have headers, first row is data)
        # Try to infer separator; default comma, no header row
        df = None
        separators_to_try = [',', '|', ';', '\t']
        
        for sep in separators_to_try:
            try:
                df = pd.read_csv(io.StringIO(text), header=None, sep=sep, on_bad_lines='skip', engine='python')
                # If we got a valid DataFrame with reasonable number of columns, use it
                if df is not None and len(df.columns) > 0:
                    break
            except Exception:
                continue
        
        if df is None:
            # Final fallback: try with default settings
            try:
                df = pd.read_csv(io.StringIO(text), header=None, on_bad_lines='skip', engine='python')
            except Exception as e:
                raise RuntimeError(f"Failed to parse CSV file: {e}")

        initial_row_count = len(df)
        cleaning_metrics["initial_rows"] = initial_row_count

        # Apply cleaning pipeline in order
        progress_base = 20
        progress_step = 60 / 6  # 6 main steps

        # Step 1: Column validations (filter rows early)
        if options.column_validations:
            update_job_progress(job_id, int(progress_base), "Validating columns")
            # Build column mapping first if keep_columns is provided
            temp_column_mapping = {}
            if options.keep_columns and isinstance(options.keep_columns, list) and len(options.keep_columns) > 0:
                if isinstance(options.keep_columns[0], dict):
                    temp_column_mapping = {int(item["index"]): item["name"] for item in options.keep_columns if "index" in item and "name" in item}
            df = _apply_column_validations(df, options.column_validations, temp_column_mapping)
            progress_base += progress_step

        # Step 2: Remove duplicates
        if options.remove_duplicates:
            update_job_progress(job_id, int(progress_base), "Removing duplicates")
            df = _apply_remove_duplicates(df)
            progress_base += progress_step

        # Build column mapping from keep_columns if provided
        # Format: keep_columns should be a list of dicts like [{"index": 0, "name": "tweet"}, ...]
        # OR we'll parse from the old format if it's a list of strings
        column_mapping = {}
        if options.keep_columns:
            if isinstance(options.keep_columns, list) and len(options.keep_columns) > 0:
                if isinstance(options.keep_columns[0], dict):
                    # New format: list of dicts with index and name
                    try:
                        column_mapping = {}
                        for item in options.keep_columns:
                            if isinstance(item, dict) and "index" in item and "name" in item:
                                idx = item["index"]
                                name = item["name"]
                                # Convert index to int (handle both int and string)
                                if isinstance(idx, str):
                                    idx = int(idx)
                                elif isinstance(idx, (np.integer, np.int64, np.int32)):
                                    idx = int(idx)
                                if isinstance(idx, int) and idx >= 0 and name:
                                    column_mapping[idx] = str(name)
                    except (ValueError, TypeError) as e:
                        raise ValueError(f"Invalid keep_columns format: {e}")
                else:
                    # Old format: list of strings (for backward compatibility, but won't work without headers)
                    # Try to map by name if headers exist, otherwise skip
                    pass

        # Step 3: Text cleaning
        if options.text_cleaning:
            update_job_progress(job_id, int(progress_base), "Cleaning text columns")
            df = _apply_text_cleaning(df, options.text_cleaning, column_mapping)
            progress_base += progress_step

        # Step 4: Missing values (by column index if needed)
        if options.missing_value_options:
            update_job_progress(job_id, int(progress_base), "Handling missing values")
            df = _apply_missing_value_options(df, options.missing_value_options, column_mapping)
            progress_base += progress_step

        # Step 5: Keep columns and add headers (do this last to preserve columns needed for earlier steps)
        if column_mapping:
            update_job_progress(job_id, int(progress_base), "Selecting columns and adding headers")
            df = _apply_keep_columns(df, column_mapping)
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
        # Convert numpy/pandas types to native Python types
        metrics_dict = {}
        for key, value in cleaning_metrics.items():
            # Convert numpy int64/float64 to native Python int/float
            if isinstance(value, (np.integer, np.int64, np.int32)):
                metrics_dict[key] = int(value)
            elif isinstance(value, (np.floating, np.float64, np.float32)):
                metrics_dict[key] = float(value)
            elif isinstance(value, (int, float, str, bool)) or value is None:
                metrics_dict[key] = value
            else:
                # Fallback: try to convert to int or string
                try:
                    metrics_dict[key] = int(value)
                except (ValueError, TypeError):
                    metrics_dict[key] = str(value)
        mark_job_completed(job_id, cleaned_path, metrics_dict)
        update_job_progress(job_id, 100, "Completed")
    except Exception as e:
        mark_job_failed(job_id, str(e))
        # Also update dataset status
        try:
            supabase.table(DATASET_TABLE).update({"status": "CleaningFailed"}).eq("dataset_id", dataset_id).execute()
        except Exception:
            pass
