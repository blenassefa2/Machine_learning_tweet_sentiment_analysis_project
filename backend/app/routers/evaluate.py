from fastapi import APIRouter

router = APIRouter()

@router.post("/evaluate/model_performance")
async def evaluate_model_performance(model: str, file_to_be_evaluated: str):
    return {"status": "ok"} 

@router.get("/evaluate/clustering_performance")
async def evaluate_labeling_performance(model: str, file_to_be_evaluated: str):
    return {"status": "ok"} 

@router.get("/evaluate/automatic_labeling_performance")
async def evaluate_automatic_labeling_performance(model: str, file_to_be_evaluated: str):
    return {"status": "ok"} 