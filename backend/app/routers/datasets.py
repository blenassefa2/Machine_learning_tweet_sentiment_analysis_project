
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.database import get_supabase
from uuid import uuid4
from datetime import datetime

router = APIRouter()

ALLOWED_EXTENSIONS = {"csv", "txt"}
BUCKET_NAME = "datasets"

def validate_file_extension(filename: str):
    ext = filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    validate_file_extension(file.filename)
    supabase = get_supabase()

    file_bytes = await file.read()
    unique_name = f"{uuid4()}_{file.filename}"

    upload_result = supabase.storage.from_(BUCKET_NAME).upload(unique_name, file_bytes)
    if upload_result.get("error"):
        raise HTTPException(status_code=500, detail=upload_result["error"]["message"])

    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(unique_name).get("publicURL")

    dataset_record = {
        "dataset_id": str(uuid4()),
        "original_file": unique_name,
        "cleaned_file": None,
        "uploaded_at": datetime.utcnow().isoformat(),
        "status": "Uploaded"
    }

    insert_result = supabase.table("datasets").insert(dataset_record).execute()
    if hasattr(insert_result, "error") and insert_result.error:
        raise HTTPException(status_code=500, detail="Failed to store dataset metadata")

    return {
        "message": "File uploaded successfully",
        "dataset": dataset_record,
        "url": public_url
    }

@router.get("/list")
async def list_files():
    supabase = get_supabase()

    result = supabase.table("datasets").select("*").execute()
    if hasattr(result, "error") and result.error:
        raise HTTPException(status_code=500, detail="Failed to fetch files")

    return result.data

@router.delete("/delete")
async def delete_file(file_name: str):
    supabase = get_supabase()

    delete_res = supabase.storage.from_(BUCKET_NAME).remove([file_name])
    if delete_res.get("error"):
        raise HTTPException(status_code=500, detail=delete_res["error"]["message"])

    supabase.table("datasets").delete().eq("original_file", file_name).execute()

    return {"message": "File deleted successfully"}

@router.get("/download")
async def download_file(file_name: str):
    supabase = get_supabase()

    file_data = supabase.storage.from_(BUCKET_NAME).download(file_name)
    if hasattr(file_data, "error") and file_data.error:
        raise HTTPException(status_code=404, detail="File not found")

    return {"file_name": file_name, "content": file_data}

@router.get("/preview")
async def preview_file(file_name: str):
    supabase = get_supabase()

    file_data = supabase.storage.from_(BUCKET_NAME).download(file_name)
    if hasattr(file_data, "error") and file_data.error:
        raise HTTPException(status_code=404, detail="File not found")

    preview_text = file_data.decode("utf-8", errors="ignore")[:500]

    return {"file_name": file_name, "preview": preview_text}
    
@router.get("/info")
async def get_file_info(file_name: str):
    supabase = get_supabase()

    query = supabase.table("datasets").select("*").eq("original_file", file_name).execute()
    if not query.data:
        raise HTTPException(status_code=404, detail="File metadata not found")

    return query.data[0]

@router.get("/status")
async def get_file_status(file_name: str):
    supabase = get_supabase()

    result = supabase.table("datasets").select("status").eq("original_file", file_name).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="File not found")

    return {"file_name": file_name, "status": result.data[0]["status"]}

