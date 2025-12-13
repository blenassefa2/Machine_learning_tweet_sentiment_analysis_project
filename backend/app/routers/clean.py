# app/routers/clean.py
from fastapi import APIRouter, BackgroundTasks, HTTPException, Body
from app.models.cleaning import CleaningOptions
from app.services.cleaning_service import create_clean_job, run_cleaning_job
from app.db.supabase_client import supabase

router = APIRouter(prefix="/datasets", tags=["cleaning"])

@router.post("/{dataset_id}/clean")
def start_cleaning(
    dataset_id: str,
    request_body: dict = Body(...),
    background_tasks: BackgroundTasks = None
):
    """
    Start cleaning job and return job_id for progress tracking.
    
    Request body should include:
    - session_id: str (required)
    - keep_columns: List[str] (optional) - columns to keep
    - remove_duplicates: bool (optional) - remove duplicate rows
    - missing_value_options: List[dict] (optional) - missing value handling
    - text_cleaning: dict (optional) - text cleaning options
    - column_validations: List[dict] (optional) - column validation rules
    """
    # Extract session_id from request body
    session_id = request_body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    # Extract options (everything except session_id)
    options_dict = {k: v for k, v in request_body.items() if k != "session_id"}
    
    # Validate dataset exists and belongs to session
    res = supabase.table("datasets").select("*").eq("dataset_id", dataset_id).eq("session_id", session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Dataset not found for this session")

    # Parse options into CleaningOptions model
    try:
        options = CleaningOptions(**options_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid options: {str(e)}")

    job_id = create_clean_job(dataset_id, session_id)

    # Schedule the cleaning worker in background
    if background_tasks is not None:
        background_tasks.add_task(run_cleaning_job, job_id, dataset_id, session_id, options)
    else:
        # Fallback synchronous execution (not recommended)
        run_cleaning_job(job_id, dataset_id, session_id, options)

    return {"job_id": job_id, "message": "Cleaning started"}

@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    """Get cleaning job status and metrics."""
    res = supabase.table("clean_jobs").select("*").eq("job_id", job_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return res.data[0]