from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.predict_service import (
    predict_one,
    predict_many,
    predict_new_dataset
)

router = APIRouter(prefix="/predict", tags=["predict"])


class PredictDatasetRequest(BaseModel):
    dataset_id: str
    session_id: str


class PredictTextRequest(BaseModel):
    session_id: str
    model_id: Optional[str] = None
    text: Optional[str] = None
    texts: Optional[list[str]] = None


@router.post("/dataset")
def predict_dataset_endpoint(req: PredictDatasetRequest):
    """
    Predict labels for a dataset using the session's trained model.
    Returns predictions, metrics (if target column exists), and label distribution.
    """
    try:
        result = predict_new_dataset(req.session_id, req.dataset_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/one")
def predict_single(req: PredictTextRequest):
    """Predict single text using a specific model."""
    if not req.model_id or not req.text:
        raise HTTPException(400, "model_id and text are required")
    try:
        pred = predict_one(req.model_id, req.session_id, req.text)
        return {"prediction": pred}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/many")
def predict_list(req: PredictTextRequest):
    """Predict multiple texts using a specific model."""
    if not req.model_id or not req.texts:
        raise HTTPException(400, "model_id and texts are required")
    try:
        preds = predict_many(req.model_id, req.session_id, req.texts)
        return {"predictions": preds}
    except Exception as e:
        raise HTTPException(400, str(e))
