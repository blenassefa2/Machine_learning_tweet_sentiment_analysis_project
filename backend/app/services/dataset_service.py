import uuid
import csv
import io
from datetime import datetime, timezone
from fastapi import UploadFile
import chardet
from app.db.supabase_client import supabase

DATA_BUCKET = "datasets"


def detect_and_convert_to_utf8(file_bytes: bytes) -> bytes:
    """
    Detect the encoding of file bytes and convert to UTF-8.
    Handles various encodings like latin-1, cp1252, utf-16, etc.
    """
    # Try to detect encoding
    detection = chardet.detect(file_bytes)
    detected_encoding = detection.get('encoding', 'utf-8')
    confidence = detection.get('confidence', 0)
    
    # If already UTF-8 or detection failed, try common encodings
    if detected_encoding is None:
        detected_encoding = 'utf-8'
    
    # List of encodings to try in order of priority
    encodings_to_try = [detected_encoding]
    
    # Add fallback encodings if confidence is low
    if confidence < 0.8:
        common_encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1', 'utf-16', 'ascii']
        for enc in common_encodings:
            if enc.lower() != detected_encoding.lower() and enc not in encodings_to_try:
                encodings_to_try.append(enc)
    
    # Try each encoding
    for encoding in encodings_to_try:
        try:
            # Decode with detected/fallback encoding
            text = file_bytes.decode(encoding)
            # Re-encode to UTF-8
            utf8_bytes = text.encode('utf-8')
            return utf8_bytes
        except (UnicodeDecodeError, LookupError):
            continue
    
    # Last resort: decode with errors='replace' to handle any remaining issues
    try:
        text = file_bytes.decode('utf-8', errors='replace')
        return text.encode('utf-8')
    except Exception:
        # If all else fails, return original bytes
        return file_bytes


# ---------------------------------------------------------
# Upload Dataset
# ---------------------------------------------------------
def upload_dataset(file: UploadFile, session_id: str) -> dict:
    if file.content_type not in ["text/csv", "text/plain"]:
        raise ValueError("Invalid file type. Only CSV or TXT allowed.")

    dataset_id = str(uuid.uuid4())
    filename = f"{dataset_id}_{file.filename}"

    # Read and convert to UTF-8
    file_bytes = file.file.read()
    utf8_bytes = detect_and_convert_to_utf8(file_bytes)

    # Upload file with UTF-8 encoding
    supabase.storage.from_(DATA_BUCKET).upload(filename, utf8_bytes)

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
        # Decode bytes to text
        text = file_bytes.decode("utf-8")
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