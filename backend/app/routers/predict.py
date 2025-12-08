from fastapi import APIRouter, HTTPException
from app.services.predict_service import (
    predict_one,
    predict_many,
    predict_dataset
)
from app.models.train import PredictModelRequest

router = APIRouter(prefix="/predict", tags=["predict"])


@router.post("/one")
def predict_single(req: PredictModelRequest):
    try:
        pred = predict_one(req.model_id, req.session_id, req.input_text)
        return {"prediction": pred}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/many")
def predict_list(req: PredictModelRequest):
    try:
        preds = predict_many(req.model_id, req.session_id, req.texts)
        return {"predictions": preds}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/dataset")
def predict_on_dataset(req: PredictModelRequest):
    try:
        preds = predict_dataset(req.model_id, req.session_id, req.dataset_id)
        return {"predictions": preds}
    except Exception as e:
        raise HTTPException(400, str(e))