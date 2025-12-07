from uuid import uuid4
from app.db.supabase_client import supabase
from datetime import datetime
from app.core.config import settings


def upload_dataset_file(file_bytes: bytes, filename: str) -> dict:
    dataset_id = str(uuid4())
    # store with a path including dataset_id to avoid collisions
    remote_path = f"{dataset_id}/{filename}"
    # supabase.storage.from_(BUCKET).upload(remote_path, file_bytes)  # pseudo
    res = supabase.storage.from_(settings.SUPABASE_BUCKET).upload(remote_path, file_bytes)
    if res.get("error"):
        raise RuntimeError(res["error"])
    # return metadata to store in
    return {
        "dataset_id": dataset_id,
        "original_file": remote_path,
        "uploaded_at": datetime.utcnow().isoformat(),
        "status": "Uploaded"
    }