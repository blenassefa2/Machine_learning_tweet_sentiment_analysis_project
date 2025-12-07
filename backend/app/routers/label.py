from fastapi import APIRouter

router = APIRouter()

@router.post("/lable/manual")
async def manual_labeling(file_name: str):
    return {"status": "ok"} 

@router.get("/lable/naive_automatic/")
async def naive_automatic_labeling(file_name: str, class_word_files: [str]):
    return {"status": "ok"} 

@router.get("/label/cluster")
async def hierarchical_clustering(file_name: str):
    return {"status": "ok"} 


