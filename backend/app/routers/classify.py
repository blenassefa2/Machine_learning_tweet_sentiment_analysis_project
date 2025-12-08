# app/routers/classify.py
from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.models.classify import ManualLabelRequest, SingleAnnotateRequest, NaiveLabelRequest, ClusteringRequest
from app.services.classify_service import create_classify_job, run_manual_annotation_job, run_naive_job, run_clustering_job
from app.db.supabase_client import supabase

router = APIRouter(prefix="/datasets", tags=["classification"])

@router.post("/{dataset_id}/label/manual")
def label_manual(dataset_id: str, req: ManualLabelRequest, background_tasks: BackgroundTasks):
    # validate dataset exists and belongs to session
    res = supabase.table("datasets").select("*").eq("dataset_id", dataset_id).eq("session_id", req.session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    job_id = create_classify_job(dataset_id, req.session_id, "manual")
    # schedule
    background_tasks.add_task(run_manual_annotation_job, job_id, dataset_id, req.session_id, [a.dict() for a in req.annotations])
    return {"job_id": job_id}

@router.post("/{dataset_id}/label/manual/row")
def label_single_row(dataset_id: str, req: SingleAnnotateRequest, background_tasks: BackgroundTasks):
    # implement by creating a tiny job that annotates single row
    job_id = create_classify_job(dataset_id, req.session_id, "manual_single")
    background_tasks.add_task(run_manual_annotation_job, job_id, dataset_id, req.session_id, [{"row_index": req.row_index, "label": req.label}])
    return {"job_id": job_id}

@router.post("/{dataset_id}/label/naive")
def label_naive(dataset_id: str, req: NaiveLabelRequest, background_tasks: BackgroundTasks):
    res = supabase.table("datasets").select("*").eq("dataset_id", dataset_id).eq("session_id", req.session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    job_id = create_classify_job(dataset_id, req.session_id, "naive")
    background_tasks.add_task(run_naive_job, job_id, dataset_id, req.session_id, req.keyword_map, req.use_default_keywords)
    return {"job_id": job_id}

@router.post("/{dataset_id}/label/clustering")
def label_clustering(dataset_id: str, req: ClusteringRequest, background_tasks: BackgroundTasks):
    res = supabase.table("datasets").select("*").eq("dataset_id", dataset_id).eq("session_id", req.session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    job_id = create_classify_job(dataset_id, req.session_id, req.algorithm)
    background_tasks.add_task(run_clustering_job, job_id, dataset_id, req.session_id, req.algorithm, req.hyperparameters)
    return {"job_id": job_id}

# job status fetcher
@router.get("/classify_jobs/{job_id}")
def get_job(job_id: str):
    res = supabase.table("classify_jobs").select("*").eq("job_id", job_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return res.data[0]