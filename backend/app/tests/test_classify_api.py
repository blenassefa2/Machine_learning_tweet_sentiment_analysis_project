import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import MagicMock
from app.services.classify_service import run_naive_job
import io

client = TestClient(app)

@pytest.fixture(autouse=True)
def fake_supabase(monkeypatch):
    # create fake dataset metadata and fake storage returning small CSV
    fake_dataset = {
        "dataset_id": "d1",
        "session_id": "s1",
        "original_file": "d1_test.csv"
    }
    class FakeQuery:
        def select(self, *a, **k): return self
        def eq(self, *a, **k): return self
        def execute(self): return MagicMock(data=[fake_dataset])
        def insert(self, payload): return self
        def update(self, payload): return self

    fake_storage = MagicMock()
    fake_csv = b"text\nI love this\nI hate this\n"
    fake_storage.from_.return_value.download.return_value = fake_csv
    fake_storage.from_.return_value.upload.return_value = {"data": None}

    fake_sb = MagicMock()
    fake_sb.table.return_value = FakeQuery()
    fake_sb.storage = fake_storage

    monkeypatch.setattr("app.services.classify_service.supabase", fake_sb)
    monkeypatch.setattr("app.routers.classify.supabase", fake_sb)
    yield

def test_naive_endpoint():
    payload = {"dataset_id":"d1","session_id":"s1","keyword_map": {"pos":["love"], "neg":["hate"]}}
    res = client.post("/datasets/d1/label/naive", json=payload)
    assert res.status_code == 200
    assert "job_id" in res.json()