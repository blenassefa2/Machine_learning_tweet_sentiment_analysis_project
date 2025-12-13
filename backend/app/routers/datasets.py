from fastapi import APIRouter, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
from app.services import dataset_service

router = APIRouter(prefix="/datasets", tags=["datasets"])


# --------------------------- Upload ---------------------------
@router.post("/upload")
def upload_dataset(file: UploadFile, session_id: str = Form(...)):
    try:
        return dataset_service.upload_dataset(file, session_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --------------------------- List -----------------------------
@router.get("")
def list_datasets(session_id: str):
    return dataset_service.list_datasets(session_id)


# --------------------------- Metadata -------------------------
@router.get("/{dataset_id}")
def get_dataset(dataset_id: str, session_id: str):
    dataset = dataset_service.get_dataset(dataset_id, session_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.get("/{dataset_id}/info")
def get_file_info(dataset_id: str, session_id: str):
    info = dataset_service.get_file_info(dataset_id, session_id)
    if not info:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return info


@router.get("/{dataset_id}/status")
def get_file_status(dataset_id: str, session_id: str):
    status = dataset_service.get_file_status(dataset_id, session_id)
    if not status:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"status": status}


# --------------------------- Preview --------------------------
@router.get("/{dataset_id}/preview")
def preview_dataset(dataset_id: str, session_id: str, use_cleaned: bool = False):
    rows = dataset_service.preview_dataset(dataset_id, session_id, use_cleaned=use_cleaned)
    if rows is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"preview": rows}


# --------------------------- Download -------------------------
@router.get("/{dataset_id}/download")
def download_dataset(dataset_id: str, session_id: str):
    file_bytes = dataset_service.download_dataset(dataset_id, session_id)
    if not file_bytes:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return StreamingResponse(
        iter([file_bytes]),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={dataset_id}.csv"}
    )


# --------------------------- Delete ---------------------------
@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str, session_id: str):
    dataset_service.delete_dataset(dataset_id, session_id)
    return {"message": "Dataset deleted"}