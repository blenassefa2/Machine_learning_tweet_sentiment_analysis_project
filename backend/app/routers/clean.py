# app/routers/clean.py
from fastapi import APIRouter, BackgroundTasks, HTTPException, Body
from app.models.cleaning import CleaningOptions
from app.services.cleaning_service import create_clean_job, run_cleaning_job
from app.db.supabase_client import supabase

router = APIRouter(prefix="/datasets", tags=["cleaning"])

@router.post("/{dataset_id}/clean")
def start_cleaning(dataset_id: str, session_id: str = Body(...), options: CleaningOptions = Body(...), background_tasks: BackgroundTasks = None):
    """
    Start cleaning job and return job_id for progress tracking.
    """
    # validate dataset exists and belongs to session
    res = supabase.table("datasets").select("*").eq("dataset_id", dataset_id).eq("session_id", session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Dataset not found for this session")

    job_id = create_clean_job(dataset_id, session_id)

    # schedule the cleaning worker in background
    if background_tasks is not None:
        background_tasks.add_task(run_cleaning_job, job_id, dataset_id, session_id, options)
    else:
        # fallback synchronous execution (not recommended)
        run_cleaning_job(job_id, dataset_id, session_id, options)

    return {"job_id": job_id, "message": "Cleaning started"}

@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    res = supabase.table("clean_jobs").select("*").eq("job_id", job_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return res.data[0]