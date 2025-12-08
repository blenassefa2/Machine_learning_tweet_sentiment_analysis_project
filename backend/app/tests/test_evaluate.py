from fastapi.testclient import TestClient
from app.main import app
from app.db.supabase_client import supabase
from app.services.session_service import create_session

client = TestClient(app)


def get_model(session_id):
    m = supabase.table("trained_models").select("*").eq("session_id", session_id).execute().data
    assert len(m) > 0
    return m[0]["model_id"]


def test_evaluate_model():
    session = create_session()
    model_id = get_model(session["session_id"])

    r = client.get(f"/evaluate/model/{model_id}?session_id={session['session_id']}")
    assert r.status_code == 200
    assert "metrics" in r.json()


def test_evaluate_classification():
    payload = {
        "true_labels": [1, 0, 1],
        "predicted": [1, 0, 0]
    }

    r = client.post("/evaluate/classification", json=payload)
    assert r.status_code == 200
    data = r.json()["metrics"]
    assert "accuracy" in data
    assert "precision" in data


def test_evaluate_predictions_only():
    payload = {
        "true_labels": [1, 1, 0, 0],
        "predicted": [1, 0, 0, 0]
    }

    r = client.post("/evaluate/predictions", json=payload)
    assert r.status_code == 200
    assert "accuracy" in r.json()["metrics"]