from fastapi.testclient import TestClient
from app.main import app
from app.db.supabase_client import supabase
from app.services.session_service import create_session

client = TestClient(app)


def get_trained_model(session_id):
    """
    Returns any model belonging to session.
    """
    models = supabase.table("trained_models").select("*").eq("session_id", session_id).execute().data
    assert len(models) > 0
    return models[0]["model_id"]


def test_predict_one():
    session = create_session()
    model_id = get_trained_model(session["session_id"])

    payload = {
        "session_id": session["session_id"],
        "model_id": model_id,
        "input_text": "I love this product"
    }

    r = client.post("/predict/one", json=payload)
    assert r.status_code == 200
    assert "prediction" in r.json()


def test_predict_many():
    session = create_session()
    model_id = get_trained_model(session["session_id"])

    payload = {
        "session_id": session["session_id"],
        "model_id": model_id,
        "texts": ["good service", "terrible experience"]
    }

    r = client.post("/predict/many", json=payload)
    assert r.status_code == 200
    assert len(r.json()["predictions"]) == 2


def test_predict_dataset():
    session = create_session()
    model_id = get_trained_model(session["session_id"])

    # dataset must exist, here we assume one already created in training tests
    dataset = supabase.table("datasets").select("*").limit(1).execute().data
    assert len(dataset) > 0
    dataset_id = dataset[0]["dataset_id"]

    payload = {
        "session_id": session["session_id"],
        "model_id": model_id,
        "dataset_id": dataset_id
    }

    r = client.post("/predict/dataset", json=payload)
    assert r.status_code == 200
    assert "predictions" in r.json()
    assert isinstance(r.json()["predictions"], list)