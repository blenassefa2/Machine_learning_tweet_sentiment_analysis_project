# app/routers/label.py
from fastapi import APIRouter, BackgroundTasks, HTTPException, Body
from app.models.label import (
    ManualLabelRequest, 
    SingleLabelRequest, 
    NaiveLabelRequest, 
    ClusteringLabelRequest,
    LabelingRequest
)
from app.services.label_service import (
    create_label_job, 
    run_manual_labeling_job, 
    run_naive_labeling_job, 
    run_clustering_labeling_job
)
from app.db.supabase_client import supabase

router = APIRouter(prefix="/datasets", tags=["labeling"])

@router.post("/{dataset_id}/label")
def label_dataset(
    dataset_id: str,
    request_body: dict = Body(...),
    background_tasks: BackgroundTasks = None
):
    """
    Unified labeling endpoint that handles all labeling methods.
    Request body should include:
    - session_id: str (required)
    - method: str (required) - "manual", "naive", "clustering", or "classify"
    - method-specific parameters
    """
    session_id = request_body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    method = request_body.get("method")
    if not method:
        raise HTTPException(status_code=400, detail="method is required")
    
    # Validate dataset exists
    res = supabase.table("datasets").select("*").eq("dataset_id", dataset_id).eq("session_id", session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check if dataset has a cleaned file
    ds = res.data[0]
    if not ds.get("cleaned_file"):
        raise HTTPException(status_code=400, detail="Dataset must have a cleaned file before labeling. Please clean the dataset first.")
    
    job_id = create_label_job(dataset_id, session_id, method)
    
    if method == "manual":
        annotations = request_body.get("annotations", [])
        stop_early = request_body.get("stop_early", False)
        background_tasks.add_task(
            run_manual_labeling_job, 
            job_id, 
            dataset_id, 
            session_id, 
            [a if isinstance(a, dict) else a.dict() for a in annotations],
            stop_early
        )
    elif method == "naive":
        keyword_map = request_body.get("keyword_map")
        use_default = request_body.get("use_default_keywords", False)
        background_tasks.add_task(
            run_naive_labeling_job,
            job_id,
            dataset_id,
            session_id,
            keyword_map,
            use_default
        )
    elif method == "clustering":
        algorithm = request_body.get("algorithm")
        if not algorithm:
            raise HTTPException(status_code=400, detail="algorithm is required for clustering method")
        
        from app.models.label import ClusteringHyperparams
        hp_dict = request_body.get("hyperparameters", {})
        hyperparams = ClusteringHyperparams(**hp_dict) if hp_dict else ClusteringHyperparams()
        
        background_tasks.add_task(
            run_clustering_labeling_job,
            job_id,
            dataset_id,
            session_id,
            algorithm,
            hyperparams
        )
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown method: {method}")
    
    return {"job_id": job_id, "message": "Labeling started"}

@router.post("/{dataset_id}/label/manual")
def label_manual(dataset_id: str, req: ManualLabelRequest, background_tasks: BackgroundTasks):
    """Manual batch labeling endpoint (backward compatibility)."""
    res = supabase.table("datasets").select("*").eq("dataset_id", dataset_id).eq("session_id", req.session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check if dataset has a cleaned file
    ds = res.data[0]
    if not ds.get("cleaned_file"):
        raise HTTPException(status_code=400, detail="Dataset must have a cleaned file before labeling. Please clean the dataset first.")

    job_id = create_label_job(dataset_id, req.session_id, "manual")
    background_tasks.add_task(
        run_manual_labeling_job, 
        job_id, 
        dataset_id, 
        req.session_id, 
        [a.model_dump() if hasattr(a, 'model_dump') else a.dict() if hasattr(a, 'dict') else a for a in req.annotations],
        req.stop_early or False
    )
    return {"job_id": job_id}

@router.post("/{dataset_id}/label/manual/row")
def label_single_row(dataset_id: str, req: SingleLabelRequest, background_tasks: BackgroundTasks):
    """Label a single row (for modal UI)."""
    res = supabase.table("datasets").select("*").eq("dataset_id", dataset_id).eq("session_id", req.session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check if dataset has a cleaned file
    ds = res.data[0]
    if not ds.get("cleaned_file"):
        raise HTTPException(status_code=400, detail="Dataset must have a cleaned file before labeling. Please clean the dataset first.")
    
    job_id = create_label_job(dataset_id, req.session_id, "manual_single")
    background_tasks.add_task(
        run_manual_labeling_job, 
        job_id, 
        dataset_id, 
        req.session_id, 
        [{"row_index": req.row_index, "label": req.label}],
        False
    )
    return {"job_id": job_id}

@router.post("/{dataset_id}/label/naive")
def label_naive(dataset_id: str, req: NaiveLabelRequest, background_tasks: BackgroundTasks):
    """Naive keyword-based labeling endpoint."""
    res = supabase.table("datasets").select("*").eq("dataset_id", dataset_id).eq("session_id", req.session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check if dataset has a cleaned file
    ds = res.data[0]
    if not ds.get("cleaned_file"):
        raise HTTPException(status_code=400, detail="Dataset must have a cleaned file before labeling. Please clean the dataset first.")

    job_id = create_label_job(dataset_id, req.session_id, "naive")
    background_tasks.add_task(
        run_naive_labeling_job, 
        job_id, 
        dataset_id, 
        req.session_id, 
        req.keyword_map, 
        req.use_default_keywords
    )
    return {"job_id": job_id}

@router.post("/{dataset_id}/label/clustering")
def label_clustering(dataset_id: str, req: ClusteringLabelRequest, background_tasks: BackgroundTasks):
    """Clustering-based labeling endpoint."""
    res = supabase.table("datasets").select("*").eq("dataset_id", dataset_id).eq("session_id", req.session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check if dataset has a cleaned file
    ds = res.data[0]
    if not ds.get("cleaned_file"):
        raise HTTPException(status_code=400, detail="Dataset must have a cleaned file before labeling. Please clean the dataset first.")

    job_id = create_label_job(dataset_id, req.session_id, req.algorithm)
    background_tasks.add_task(
        run_clustering_labeling_job, 
        job_id, 
        dataset_id, 
        req.session_id, 
        req.algorithm, 
        req.hyperparameters
    )
    return {"job_id": job_id}

# Job status fetcher
@router.get("/label_jobs/{job_id}")
def get_job(job_id: str):
    """Get labeling job status."""
    res = supabase.table("label_jobs").select("*").eq("job_id", job_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return res.data[0]


# Get labeling result/summary by dataset_id
@router.get("/{dataset_id}/labeling")
def get_labeling_result(dataset_id: str, session_id: str):
    """Get labeling result with summary from labelings table."""
    res = supabase.table("labelings").select("*") \
        .eq("dataset_id", dataset_id) \
        .eq("session_id", session_id) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="No labeling found for this dataset")
    
    return res.data[0]

