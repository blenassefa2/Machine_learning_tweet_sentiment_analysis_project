# app/models/label.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal

# Manual labeling
class ManualAnnotationRecord(BaseModel):
    row_index: int
    label: int = Field(..., description="Label value: 0 (negative), 2 (neutral), or 4 (positive)")

class ManualLabelRequest(BaseModel):
    dataset_id: str
    session_id: str
    annotations: List[ManualAnnotationRecord]
    stop_early: Optional[bool] = False  # If True, only keep labeled rows in output

# Single-row label (for modal UI)
class SingleLabelRequest(BaseModel):
    dataset_id: str
    session_id: str
    row_index: int
    label: int = Field(..., description="Label value: 0, 2, or 4")

# Naive automatic labeling
class NaiveLabelRequest(BaseModel):
    dataset_id: str
    session_id: str
    # either provide keywords per class OR use default files in storage
    keyword_map: Optional[Dict[str, List[str]]] = None
    # if true, use default keywords stored at keywords/<class>.txt
    use_default_keywords: Optional[bool] = False

# Clustering-based labeling
AlgorithmName = Literal["kmeans", "dbscan", "agglomerative", "hierarchical"]

class ClusteringHyperparams(BaseModel):
    n_clusters: Optional[int] = None  # for kmeans/agglomerative/hierarchical
    eps: Optional[float] = None       # for dbscan
    min_samples: Optional[int] = None  # for dbscan
    linkage: Optional[str] = "average"  # for agglomerative/hierarchical: "average", "complete", "ward"
    random_state: Optional[int] = 42

class ClusteringLabelRequest(BaseModel):
    dataset_id: str
    session_id: str
    algorithm: AlgorithmName
    hyperparameters: Optional[ClusteringHyperparams] = None

# Unified labeling request (for frontend)
class LabelingRequest(BaseModel):
    dataset_id: str
    session_id: str
    method: Literal["manual", "naive", "clustering", "classify"]
    # Manual options
    annotations: Optional[List[ManualAnnotationRecord]] = None
    stop_early: Optional[bool] = False
    # Naive options
    keyword_map: Optional[Dict[str, List[str]]] = None
    use_default_keywords: Optional[bool] = False
    # Clustering options
    algorithm: Optional[AlgorithmName] = None
    hyperparameters: Optional[ClusteringHyperparams] = None
    # Classify options (for future ML-based classification)
    classifier_params: Optional[Dict[str, Any]] = None

