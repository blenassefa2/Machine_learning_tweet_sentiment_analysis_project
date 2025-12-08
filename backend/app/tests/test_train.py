import time
import uuid
from fastapi.testclient import TestClient

from app.main import app
from app.services.session_service import create_session
from app.db.supabase_client import supabase

client = TestClient(app)


def wait_for_job(job_id: str, timeout=30):
    """
    Poll job status until completed/failed.
    """
    start = time.time()
    while time.time() - start < timeout:
        job = supabase.table("training_jobs").select("*").eq("job_id", job_id).execute().data
        status = job[0]["status"]
        if status in ["completed", "failed"]:
            return job[0]
        time.sleep(1)
    raise TimeoutError("Training job did not finish in time.")


def test_training_knn():
    # 1. Create session
    session = create_session()

    # 2. Dataset must already exist in DB (insert minimal fake one)
    dataset_id = str(uuid.uuid4())
    supabase.table("datasets").insert({
        "dataset_id": dataset_id,
        "session_id": session["session_id"],
        "original_file": "tests/sample_dataset.csv",  # must exist in storage
        "cleaned_file": None,
        "status": "uploaded",
        "uploaded_at": session["created_at"],
    }).execute()

    # 3. Start training request
    payload = {
        "session_id": session["session_id"],
        "dataset_id": dataset_id,
        "algorithm": "knn",
        "hyperparameters": {"k": 3, "distance": "euclidean"},
        "test_size": 0.2,
        "model_name": "test_knn",
    }

    r = client.post("/train/", json=payload)
    assert r.status_code == 200

    job_id = r.json()["job_id"]
    model_id = r.json()["model_id"]

    # 4. Wait for training job
    final_job = wait_for_job(job_id)
    assert final_job["status"] == "completed"

    # 5. Verify model saved in DB
    model = supabase.table("trained_models").select("*").eq("model_id", model_id).execute().data
    assert len(model) == 1
    assert "metrics" in model[0]
    assert model[0]["metrics"]["accuracy"] is not None

    # 6. Check artifact exists in storage
    file_path = model[0]["model_file"]
    blob = supabase.storage.from_("models").download(file_path)
    assert blob is not None