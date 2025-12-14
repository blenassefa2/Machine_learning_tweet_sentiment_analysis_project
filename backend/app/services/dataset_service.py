import uuid
import csv
import io
from datetime import datetime, timezone
from fastapi import UploadFile
from app.db.supabase_client import supabase

try:
    import chardet
    CHARDET_AVAILABLE = True
except ImportError:
    CHARDET_AVAILABLE = False

DATA_BUCKET = "datasets"


# ---------------------------------------------------------
# Upload Dataset
# ---------------------------------------------------------
def upload_dataset(file: UploadFile, session_id: str) -> dict:
    if file.content_type not in ["text/csv", "text/plain", "application/vnd.ms-excel"]:
        raise ValueError("Invalid file type. Only CSV or TXT allowed.")

    dataset_id = str(uuid.uuid4())
    filename = f"{dataset_id}_{file.filename}"

    file_bytes = file.file.read()
    
    # Basic validation: try to detect if it's a valid text file
    # Use chardet to check encoding (like input_output.py)
    text = None
    encodings_to_try = [ "latin-1", "iso-8859-1", "cp1252", "windows-1252"]
    
    for enc in encodings_to_try:
        try:
            text = file_bytes.decode(enc)
            break
        except (UnicodeDecodeError, LookupError, AttributeError):
            continue
    
    if text is None:
        # Last resort: decode with errors='replace' using utf-8
        text = file_bytes.decode("utf-8", errors="ignore")
        
    # Upload file
    supabase.storage.from_(DATA_BUCKET).upload(filename, text.encode("utf-8"))

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
    """
    Preview dataset file (top 5 rows).
    Handles encoding gracefully like input_output.py - tries UTF-8 first, then Latin-1.
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
        # Detect encoding using chardet (like input_output.py)
        text = file_bytes.decode("utf-8")
        
        
        # Parse CSV (like input_output.py)
        reader = csv.reader(io.StringIO(text))
        rows = []
        for i, row in enumerate(reader):
            if i >= 5:
                break
            rows.append(row)
        
        return rows if rows else [["No data found"]]

    except Exception as e:
        return [[f"Error: Unable to parse file. {str(e)}"]]


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