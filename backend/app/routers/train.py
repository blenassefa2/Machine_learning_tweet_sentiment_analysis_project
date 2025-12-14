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


@router.get("/evaluate/{dataset_id}")
def evaluate_dataset(dataset_id: str, session_id: str):
    """
    Get evaluation metrics for a trained model associated with a dataset.
    Returns the metrics from the trained_models table.
    """
    # Find trained model for this dataset
    models = supabase.table("trained_models").select("*") \
        .eq("dataset_id", dataset_id) \
        .eq("session_id", session_id) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute().data
    
    if not models:
        raise HTTPException(404, "No trained model found for this dataset. Please train a model first.")
    
    model = models[0]
    metrics = model.get("metrics", {})
    
    # Ensure we have all required metrics
    if not metrics or not metrics.get("accuracy"):
        raise HTTPException(400, "Model metrics not available. Training may have failed.")
    
    return {
        "model_id": model["model_id"],
        "model_name": model.get("model_name"),
        "algorithm": model.get("algorithm"),
        "dataset_id": dataset_id,
        "train_size": model.get("train_size"),
        "val_size": model.get("val_size"),
        "metrics": {
            "accuracy": metrics.get("accuracy", 0),
            "precision": metrics.get("precision", 0),
            "recall": metrics.get("recall", 0),
            "f1": metrics.get("f1", 0),
            "error_rate": metrics.get("error_rate", 0),
            "confusion_matrix": metrics.get("confusion_matrix", []),
            "rand_index": metrics.get("rand_index", metrics.get("accuracy", 0)),  # Use accuracy as rand_index if not available
        }
    }