from fastapi import APIRouter, HTTPException
from app.services.evaluation_service import (
    evaluate_classification,
    evaluate_trained_model,
    evaluate_predictions
)
from app.db.supabase_client import supabase

router = APIRouter(prefix="/evaluate", tags=["evaluate"])


# ------------------------------------
# Evaluate a trained model (built-in metrics)
# ------------------------------------
@router.get("/model/{model_id}")
def eval_model(model_id: str, session_id: str):
    data = supabase.table("trained_models").select("*") \
        .eq("model_id", model_id).eq("session_id", session_id).execute().data

    if not data:
        raise HTTPException(404, "Model not found")

    return {"metrics": evaluate_trained_model(data[0])}


# ------------------------------------
# Evaluate classification dataset (true vs predicted)
# ------------------------------------
@router.post("/classification")
def eval_classification(true_labels: list, predicted: list):
    metrics = evaluate_classification(true_labels, predicted)
    return {"metrics": metrics}


# ------------------------------------
# Evaluate predictions only (accuracy/precision)
# ------------------------------------
@router.post("/predictions")
def eval_preds(true_labels: list, predicted: list):
    return {"metrics": evaluate_predictions(true_labels, predicted)}