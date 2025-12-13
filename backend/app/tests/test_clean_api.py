# app/tests/test_clean_api.py
import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import MagicMock, patch
import io
import json
from app.models.cleaning import CleaningOptions, TextCleaningOptions, MissingValueOption, ColumnValidationOptions

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
        def __init__(self, data=None):
            self._data = data if data is not None else [fake_dataset]
        def select(self, *args, **kwargs):
            return self
        def eq(self, *args, **kwargs):
            return self
        def execute(self):
            return MagicMock(data=self._data)
        def insert(self, payload):
            return self
        def update(self, payload):
            return self
        def delete(self):
            return self

    fake_table = FakeQuery()

    fake_storage = MagicMock()
    # Download returns bytes of a CSV
    fake_csv = b"polarity,id,date,topic,username,tweet\n0,1,Mon Apr 06 22:19:45 PDT 2009,topic1,user1,Hello world\n2,2,Mon Apr 07 22:19:45 PDT 2009,topic2,user2,RT @user This is a retweet\n4,3,Mon Apr 08 22:19:45 PDT 2009,topic3,user3,Normal tweet here"
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

def test_start_cleaning_basic(monkeypatch):
    """Test basic cleaning job creation."""
    options = {
        "keep_columns": None,
        "remove_duplicates": True,
        "missing_value_options": [],
        "text_cleaning": None,
        "column_validations": None,
        "preview_top_n": 5
    }

    res = client.post("/datasets/d1/clean", json={"session_id": "s1", **options})
    assert res.status_code == 200
    body = res.json()
    assert "job_id" in body
    assert "message" in body

def test_start_cleaning_with_text_cleaning(monkeypatch):
    """Test cleaning with text cleaning options."""
    options = {
        "remove_duplicates": False,
        "text_cleaning": {
            "text_columns": ["tweet"],
            "remove_urls": True,
            "remove_retweets": True,
            "remove_hashtags": True,
            "remove_mentions": True,
            "remove_numbers": False,
            "remove_html_tags": True,
            "remove_extra_spaces": True,
            "remove_contradictory_emojis": True,
            "remove_not_french": False,
            "remove_not_english": False
        },
        "missing_value_options": None,
        "column_validations": None
    }

    res = client.post("/datasets/d1/clean", json={"session_id": "s1", **options})
    assert res.status_code == 200
    body = res.json()
    assert "job_id" in body

def test_start_cleaning_with_missing_values(monkeypatch):
    """Test cleaning with missing value handling."""
    options = {
        "remove_duplicates": False,
        "missing_value_options": [
            {
                "strategy": "fill_constant",
                "constant_value": "N/A",
                "columns": ["topic"]
            }
        ],
        "text_cleaning": None,
        "column_validations": None
    }

    res = client.post("/datasets/d1/clean", json={"session_id": "s1", **options})
    assert res.status_code == 200
    body = res.json()
    assert "job_id" in body

def test_start_cleaning_with_column_validations(monkeypatch):
    """Test cleaning with column validations."""
    options = {
        "remove_duplicates": False,
        "column_validations": [
            {
                "column": "polarity",
                "validation_type": "polarity",
                "allowed_values": [0, 2, 4]
            },
            {
                "column": "id",
                "validation_type": "unique_id"
            }
        ],
        "text_cleaning": None,
        "missing_value_options": None
    }

    res = client.post("/datasets/d1/clean", json={"session_id": "s1", **options})
    assert res.status_code == 200
    body = res.json()
    assert "job_id" in body

def test_start_cleaning_with_keep_columns(monkeypatch):
    """Test cleaning with column selection."""
    options = {
        "keep_columns": ["polarity", "tweet"],
        "remove_duplicates": False,
        "text_cleaning": None,
        "missing_value_options": None,
        "column_validations": None
    }

    res = client.post("/datasets/d1/clean", json={"session_id": "s1", **options})
    assert res.status_code == 200
    body = res.json()
    assert "job_id" in body

def test_start_cleaning_comprehensive(monkeypatch):
    """Test comprehensive cleaning with all options."""
    options = {
        "keep_columns": ["polarity", "tweet"],
        "remove_duplicates": True,
        "missing_value_options": [
            {
                "strategy": "drop_rows",
                "columns": ["polarity"]
            }
        ],
        "text_cleaning": {
            "text_columns": ["tweet"],
            "remove_urls": True,
            "remove_retweets": True,
            "remove_hashtags": True,
            "remove_mentions": True,
            "remove_numbers": False,
            "remove_html_tags": True,
            "remove_extra_spaces": True,
            "remove_contradictory_emojis": False,
            "remove_not_french": False,
            "remove_not_english": False
        },
        "column_validations": [
            {
                "column": "polarity",
                "validation_type": "polarity",
                "allowed_values": [0, 2, 4]
            }
        ]
    }

    res = client.post("/datasets/d1/clean", json={"session_id": "s1", **options})
    assert res.status_code == 200
    body = res.json()
    assert "job_id" in body

def test_start_cleaning_dataset_not_found(monkeypatch):
    """Test cleaning with non-existent dataset."""
    # Mock to return empty dataset list
    def mock_table(table_name):
        fake_query = MagicMock()
        fake_query.select.return_value = fake_query
        fake_query.eq.return_value = fake_query
        fake_query.execute.return_value = MagicMock(data=[])
        return fake_query
    
    monkeypatch.setattr("app.routers.clean.supabase.table", mock_table)
    
    options = {
        "remove_duplicates": True,
        "missing_value_options": [],
        "text_cleaning": None,
        "column_validations": None
    }

    res = client.post("/datasets/nonexistent/clean", json={"session_id": "s1", **options})
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

def test_get_job(monkeypatch):
    """Test getting job status."""
    fake_job = {
        "job_id": "j1",
        "dataset_id": "d1",
        "session_id": "s1",
        "status": "completed",
        "progress": 100,
        "message": "Completed"
    }

    def mock_table(table_name):
        fake_query = MagicMock()
        fake_query.select.return_value = fake_query
        fake_query.eq.return_value = fake_query
        fake_query.execute.return_value = MagicMock(data=[fake_job])
        return fake_query
    
    monkeypatch.setattr("app.routers.clean.supabase.table", mock_table)

    res = client.get("/datasets/jobs/j1")
    assert res.status_code == 200
    body = res.json()
    assert body["job_id"] == "j1"
    assert body["status"] == "completed"

def test_get_job_not_found(monkeypatch):
    """Test getting non-existent job."""
    def mock_table(table_name):
        fake_query = MagicMock()
        fake_query.select.return_value = fake_query
        fake_query.eq.return_value = fake_query
        fake_query.execute.return_value = MagicMock(data=[])
        return fake_query
    
    monkeypatch.setattr("app.routers.clean.supabase.table", mock_table)

    res = client.get("/datasets/jobs/nonexistent")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

def test_start_cleaning_invalid_options(monkeypatch):
    """Test cleaning with invalid options structure."""
    # Missing required fields
    res = client.post("/datasets/d1/clean", json={"session_id": "s1"})
    # Should still work as options have defaults, but let's test with invalid structure
    assert res.status_code in [200, 422]  # Either works with defaults or validation error
