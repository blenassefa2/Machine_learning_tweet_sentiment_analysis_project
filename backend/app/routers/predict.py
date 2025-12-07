from fastapi import APIRouter

router = APIRouter()

@router.post("/predict/one_tweet")
async def predict_one_tweet(model: str, tweet: str):
    return {"status": "ok"} 

@router.post("/predict/multiple_tweets")
async def predict_multiple_tweets(model: str, file_to_be_predicted: str):
    return {"status": "ok"} 

@router.get("/predict/status")
async def get_predict_status(file_name: str):
    return {"status": "ok"} 