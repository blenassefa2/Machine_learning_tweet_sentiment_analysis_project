import pickle
import io
import pandas as pd
from app.db.supabase_client import supabase

MODEL_BUCKET = "models"
DATA_BUCKET = "datasets"

def load_model(model_id: str, session_id: str):
    md = supabase.table("trained_models").select("*").eq("model_id", model_id).eq("session_id", session_id).execute().data
    if not md: raise ValueError("Model not found")
    md = md[0]

    raw = supabase.storage.from_(MODEL_BUCKET).download(md["model_file"])
    return pickle.loads(raw), md


def _predict_naive_automatic(model_obj, texts: list[str]):
    pos = set(model_obj["positive_words"])
    neg = set(model_obj["negative_words"])

    def cls(t):
        tokens = t.lower().split()
        p = len([x for x in tokens if x in pos])
        n = len([x for x in tokens if x in neg])
        if p > n: return 1
        if n > p: return -1
        return 0

    return [cls(t) for t in texts]


def predict_one(model_id: str, session_id: str, text: str):
    model_obj, meta = load_model(model_id, session_id)
    if meta["algorithm"] == "naive_automatic":
        return _predict_naive_automatic(model_obj["model"], [text])[0]

    vectorizer = model_obj["vectorizer"]
    model = model_obj["model"]
    vec = vectorizer.transform([text])
    return model.predict(vec)[0]


def predict_many(model_id: str, session_id: str, texts: list[str]):
    model_obj, meta = load_model(model_id, session_id)
    if meta["algorithm"] == "naive_automatic":
        return _predict_naive_automatic(model_obj["model"], texts)

    vectorizer = model_obj["vectorizer"]
    model = model_obj["model"]
    vec = vectorizer.transform(texts)
    return model.predict(vec).tolist()


def predict_dataset(model_id: str, session_id: str, dataset_id: str):
    ds = supabase.table("datasets").select("*").eq("dataset_id", dataset_id).eq("session_id", session_id).execute().data
    if not ds:
        raise ValueError("Dataset not found")
    ds = ds[0]

    raw = supabase.storage.from_(DATA_BUCKET).download(ds["original_file"]).decode("utf-8")
    df = pd.read_csv(io.StringIO(raw))

    # extract text column
    for col in ["text","tweet","content","message"]:
        if col in df.columns:
            texts = df[col].astype(str).tolist()
            preds = predict_many(model_id, session_id, texts)
            return preds

    raise ValueError("No text column found")