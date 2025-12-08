# app/tests/test_clean_api.py
import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import MagicMock, patch
import io
import json
from app.models.cleaning import CleaningOptions

client = TestClient(app)

@pytest.fixture(autouse=True)
def mock_supabase(monkeypatch):
    # Mock supabase.table(...).select(...).eq(...).execute() => dataset metadata
    fake_dataset = {
        "dataset_id": "d1",
        "session_id": "s1",
        "original_file": "d1_test.csv",
        "uploaded_at": "2025-01-01T00:00:00+00:00",
        "status": "Uploaded"
    }

    class FakeQuery:
        def __init__(self, data):
            self._data = data
        def select(self, *args, **kwargs):
            return self
        def eq(self, *args, **kwargs):
            return self
        def execute(self):
            return MagicMock(data=[self._data])

        def insert(self, payload):
            return self
        def update(self, payload):
            return self
        def delete(self):
            return self

    fake_table = FakeQuery(fake_dataset)

    fake_storage = MagicMock()
    # download returns bytes of a CSV
    fake_csv = b"col1,col2\n1,a\n2,b\n3,c\n4,d\n5,e\n6,f\n"
    fake_storage.from_.return_value.download.return_value = fake_csv
    fake_storage.from_.return_value.upload.return_value = {"data": None}
    fake_storage.from_.return_value.remove.return_value = {"data": None}

    fake_supabase = MagicMock()
    fake_supabase.table.return_value = fake_table
    fake_supabase.storage = fake_storage

    monkeypatch.setattr("app.services.cleaning_service.supabase", fake_supabase)
    monkeypatch.setattr("app.routers.clean.supabase", fake_supabase)
    monkeypatch.setattr("app.services.dataset_service.supabase", fake_supabase)
    yield

def test_start_cleaning_background(monkeypatch):
    # Create dataset and session in mocked DB already satisfied by fixture
    options = {
        "keep_columns": None,
        "remove_duplicates": True,
        "missing_value_options": [],
        "preview_top_n": 5
    }

    # Start cleaning (this will schedule background task; TestClient runs background tasks synchronously)
    res = client.post("/datasets/d1/clean", json={"session_id": "s1", "options": options})
    assert res.status_code == 200
    body = res.json()
    assert "job_id" in body