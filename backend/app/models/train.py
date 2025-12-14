from pydantic import BaseModel
from typing import Optional, Literal, Dict, List

# ---- Training Parameters ----

DistanceMetric = Literal["euclidean", "manhattan", "cosine"]
NgramOption = Literal["unigram", "bigram", "trigram"]
FeatureRep = Literal["frequency", "binary"]

class KNNParams(BaseModel):
    k: int = 5
    distance: DistanceMetric = "euclidean"

class NaiveBayesParams(BaseModel):
    ngram: NgramOption = "unigram"
    feature_rep: FeatureRep = "frequency"
    vocabulary: Optional[List[str]] = None

AlgorithmName = Literal["knn", "naive_bayes", "naive_automatic", "decision_tree"]

class TrainModelRequest(BaseModel):
    dataset_id: str
    session_id: str
    algorithm: AlgorithmName
    hyperparameters: Optional[dict] = None
    test_size: float = 0.2   # train/val split
    model_name: Optional[str] = None

class EvaluateModelRequest(BaseModel):
    model_id: str
    session_id: str

class PredictModelRequest(BaseModel):
    model_id: str
    session_id: str
    dataset_id: str