# app/models/classify.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal

# Manual annotation
class ManualAnnotationRecord(BaseModel):
    row_index: int
    label: str

class ManualLabelRequest(BaseModel):
    dataset_id: str
    session_id: str
    annotations: List[ManualAnnotationRecord]

# Single-row annotate (modal)
class SingleAnnotateRequest(BaseModel):
    dataset_id: str
    session_id: str
    row_index: int
    label: str

# Naive automatic
class NaiveLabelRequest(BaseModel):
    dataset_id: str
    session_id: str
    # either provide keywords per class OR use default files in storage
    keyword_map: Optional[Dict[str, List[str]]] = None
    # if true, use default keywords stored at keywords/<class>.txt
    use_default_keywords: Optional[bool] = False

# Clustering
AlgorithmName = Literal["kmeans", "dbscan", "agglomerative"]

class ClusteringHyperparams(BaseModel):
    n_clusters: Optional[int] = None  # for kmeans/agglomerative
    eps: Optional[float] = None       # for dbscan
    min_samples: Optional[int] = None
    linkage: Optional[str] = "ward"  # for agglomerative
    random_state: Optional[int] = 42

class ClusteringRequest(BaseModel):
    dataset_id: str
    session_id: str
    algorithm: AlgorithmName
    hyperparameters: Optional[ClusteringHyperparams] = None