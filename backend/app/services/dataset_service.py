import uuid
import csv
import io
from datetime import datetime, timezone
from fastapi import UploadFile
from app.db.supabase_client import supabase
import pandas as pd

DATA_BUCKET = "datasets"


# ---------------------------------------------------------
# Upload Dataset
# ---------------------------------------------------------
def upload_dataset(file: UploadFile, session_id: str) -> dict:
    if file.content_type not in ["text/csv", "text/plain"]:
        raise ValueError("Invalid file type. Only CSV or TXT allowed.")

    dataset_id = str(uuid.uuid4())
    filename = f"{dataset_id}_{file.filename}"

    # Normalize uploaded dataset to UTF-8 by parsing with pandas (handles different encodings)
    # NOTE: We always read with header=None to preserve the original first row as data.
    encodings_to_try = ["utf-8", "utf-8-sig", "cp1252", "latin1"]
    df = None
    last_err: Exception | None = None

    for enc in encodings_to_try:
        try:
            file.file.seek(0)
            df = pd.read_csv(
                file.file,
                header=None,
                dtype=str,
                encoding=enc,
                engine="python",
            )
            break
        except UnicodeDecodeError as e:
            last_err = e
            continue
        except Exception as e:
            # Some files may parse but with unexpected delimiters; we'll still try other encodings first.
            last_err = e
            continue

    if df is None:
        raise ValueError(f"Unable to read uploaded file with supported encodings: {last_err}")

    csv_buf = io.StringIO()
    df.to_csv(csv_buf, index=False, header=False)
    file_bytes = csv_buf.getvalue().encode("utf-8")

    # Upload normalized UTF-8 CSV
    supabase.storage.from_(DATA_BUCKET).upload(filename, file_bytes, {"contentType": "text/csv"})

    uploaded_at = datetime.now(timezone.utc)

    # Create database metadata
    supabase.table("datasets").insert({
        "dataset_id": dataset_id,
        "session_id": session_id,
        "original_file": filename,
        "uploaded_at": uploaded_at.isoformat(),
        "status": "Uploaded"
    }).execute()

    return {
        "dataset_id": dataset_id,
        "filename": filename,
        "uploaded_at": uploaded_at,
        "status": "Uploaded"
    }


# ---------------------------------------------------------
# List Datasets for a Session
# ---------------------------------------------------------
def list_datasets(session_id: str) -> list[dict]:
    res = supabase.table("datasets").select("*").eq("session_id", session_id).execute()
    return res.data or []


# ---------------------------------------------------------
# Get Dataset Metadata
# ---------------------------------------------------------
def get_dataset(dataset_id: str, session_id: str) -> dict | None:
    res = supabase.table("datasets").select("*") \
        .eq("dataset_id", dataset_id) \
        .eq("session_id", session_id).execute()

    return res.data[0] if res.data else None


# ---------------------------------------------------------
# Get File Info (metadata only)
# ---------------------------------------------------------
def get_file_info(dataset_id: str, session_id: str) -> dict:
    dataset = get_dataset(dataset_id, session_id)
    if not dataset:
        return None
    return {
        "dataset_id": dataset_id,
        "filename": dataset["original_file"],
        "uploaded_at": dataset["uploaded_at"],
        "status": dataset["status"]
    }


# ---------------------------------------------------------
# Get Dataset Status
# ---------------------------------------------------------
def get_file_status(dataset_id: str, session_id: str) -> str | None:
    dataset = get_dataset(dataset_id, session_id)
    return dataset["status"] if dataset else None


# ---------------------------------------------------------
# Download File
# ---------------------------------------------------------
def download_dataset(dataset_id: str, session_id: str) -> bytes | None:
    dataset = get_dataset(dataset_id, session_id)
    if not dataset:
        return None

    filename = dataset["original_file"]
    res = supabase.storage.from_(DATA_BUCKET).download(filename)

    return res  # raw bytes


# ---------------------------------------------------------
# Preview File (top 5 rows)
# ---------------------------------------------------------
def preview_dataset(dataset_id: str, session_id: str, use_cleaned: bool = False) -> list[list[str]] | None:
    dataset = get_dataset(dataset_id, session_id)
    if not dataset:
        return None

    # Use cleaned_file if requested and available, otherwise use original_file
    if use_cleaned and dataset.get("cleaned_file"):
        filename = dataset["cleaned_file"]
    else:
        filename = dataset["original_file"]
    
    file_bytes = supabase.storage.from_(DATA_BUCKET).download(filename)

    try:
        # Decode bytes to text (try common encodings; uploaded files should be UTF-8 after normalization)
        text = None
        for enc in ["utf-8", "utf-8-sig", "cp1252", "latin1"]:
            try:
                text = file_bytes.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        if text is None:
            # Last resort: replace invalid chars
            text = file_bytes.decode("utf-8", errors="replace")

        reader = csv.reader(io.StringIO(text))

        rows = []
        for i, row in enumerate(reader):
            if i >= 5:
                break
            rows.append(row)

        return rows

    except Exception:
        return [["Unable to parse file"]]


# ---------------------------------------------------------
# Get Full Dataset for Manual Labeling
# ---------------------------------------------------------
def get_full_dataset(dataset_id: str, session_id: str, use_cleaned: bool = True) -> dict | None:
    """
    Get all rows from dataset for manual labeling.
    Returns dict with rows, total_count, and text_column_index.
    """
    dataset = get_dataset(dataset_id, session_id)
    if not dataset:
        return None

    # Use cleaned_file if requested and available, otherwise use original_file
    if use_cleaned and dataset.get("cleaned_file"):
        filename = dataset["cleaned_file"]
    else:
        filename = dataset["original_file"]
    
    file_bytes = supabase.storage.from_(DATA_BUCKET).download(filename)

    try:
        # Decode bytes to text
        text = None
        for enc in ["utf-8", "utf-8-sig", "cp1252", "latin1"]:
            try:
                text = file_bytes.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        if text is None:
            text = file_bytes.decode("utf-8", errors="replace")

        reader = csv.reader(io.StringIO(text))
        rows = list(reader)
        
        # Find text column index (usually the longest text column)
        text_col_idx = 0
        if rows:
            max_avg_len = 0
            for col_idx in range(len(rows[0])):
                try:
                    avg_len = sum(len(str(row[col_idx])) for row in rows[:min(10, len(rows))]) / min(10, len(rows))
                    if avg_len > max_avg_len and avg_len > 10:
                        max_avg_len = avg_len
                        text_col_idx = col_idx
                except (IndexError, TypeError):
                    continue

        return {
            "rows": rows,
            "total_count": len(rows),
            "text_column_index": text_col_idx,
            "filename": filename
        }

    except Exception as e:
        return {"rows": [], "total_count": 0, "text_column_index": 0, "error": str(e)}


# ---------------------------------------------------------
# Delete Dataset
# ---------------------------------------------------------
def delete_dataset(dataset_id: str, session_id: str):
    dataset = get_dataset(dataset_id, session_id)
    if not dataset:
        return

    filename = dataset["original_file"]

    try:
        supabase.storage.from_(DATA_BUCKET).remove([filename])
    except Exception:
        pass

    supabase.table("datasets").delete() \
        .eq("dataset_id", dataset_id) \
        .eq("session_id", session_id).execute()