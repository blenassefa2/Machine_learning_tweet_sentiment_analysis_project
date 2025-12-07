from fastapi import APIRouter

router = APIRouter()

@router.post("/train/naive_automatic")
async def train_model_using_naive_automatic(file_name: str, class_word_files: [str]):
    return {"status": "ok"} 

@router.post("/train/KNN")
async def train_model_using_KNN(file_name: str, class_word_files: [str]):
    return {"status": "ok"} 

@router.post("/train/Decision_Tree")
async def train_model_using_Decision_Tree(file_name: str, class_word_files: [str]):
    return {"status": "ok"} 

@router.post("/train/Naive_Bayes")
async def train_model_using_Naive_Bayes(file_name: str, class_word_files: [str]):
    return {"status": "ok"} 

@router.get("/train/status")
async def get_train_status(file_name: str):
    return {"status": "ok"} 
