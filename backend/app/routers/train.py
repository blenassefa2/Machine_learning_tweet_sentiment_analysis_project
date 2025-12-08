from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.models.train import TrainModelRequest
from app.services.train_service import (
    create_training_job,
    run_training_job
)
from app.db.supabase_client import supabase
import uuid

router = APIRouter(prefix="/train", tags=["train"])


@router.post("/")
def start_training(req: TrainModelRequest, background: BackgroundTasks):

    # Validate dataset belongs to the session
    ds = supabase.table("datasets").select("*") \
        .eq("dataset_id", req.dataset_id) \
        .eq("session_id", req.session_id).execute().data

    if not ds:
        raise HTTPException(404, "Dataset not found")

    model_id = str(uuid.uuid4())
    job_id = create_training_job(req.dataset_id, req.session_id, req.algorithm, model_id)

    background.add_task(
        run_training_job,
        job_id, model_id,
        req.dataset_id, req.session_id,
        req.algorithm,
        req.hyperparameters or {},
        req.test_size,
        req.model_name
    )

    return {
        "job_id": job_id,
        "model_id": model_id,
        "message": "Training started"
    }


@router.get("/job/{job_id}")
def get_job(job_id: str):
    job = supabase.table("training_jobs").select("*").eq("job_id", job_id).execute().data
    if not job:
        raise HTTPException(404, "Job not found")
    return job[0]