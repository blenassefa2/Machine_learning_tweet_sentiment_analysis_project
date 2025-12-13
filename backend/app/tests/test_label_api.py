import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import MagicMock
from app.services.label_service import run_naive_labeling_job, run_clustering_labeling_job, run_manual_labeling_job
import io

client = TestClient(app)

@pytest.fixture(autouse=True)
def fake_supabase(monkeypatch):
    """Mock Supabase client for testing."""
    fake_dataset = {
        "dataset_id": "d1",
        "session_id": "s1",
        "original_file": "d1_test.csv",
        "cleaned_file": None,
    }
    
    fake_jobs = {}  # Store created jobs
    
    class FakeQuery:
        def __init__(self, table_name):
            self.table_name = table_name
            self.eq_conditions = {}  # Store multiple eq conditions
            self.insert_payload = None
        
        def select(self, *a, **k): 
            return self
        
        def eq(self, *a, **k): 
            if a and len(a) >= 2:
                self.eq_conditions[a[0]] = a[1]
            return self
        
        def execute(self):
            if self.table_name == "datasets":
                # Check if dataset_id is nonexistent
                if self.eq_conditions.get("dataset_id") == "nonexistent":
                    return MagicMock(data=[])
                return MagicMock(data=[fake_dataset])
            elif self.table_name == "label_jobs":
                # Handle insert
                if self.insert_payload and "job_id" in self.insert_payload:
                    fake_jobs[self.insert_payload["job_id"]] = self.insert_payload
                    return MagicMock(data=[self.insert_payload])
                # Handle select with eq
                if "job_id" in self.eq_conditions:
                    job_id = self.eq_conditions["job_id"]
                    if job_id == "nonexistent":
                        return MagicMock(data=[])
                    if job_id in fake_jobs:
                        return MagicMock(data=[fake_jobs[job_id]])
                    return MagicMock(data=[])
                # Return all jobs if no filter
                return MagicMock(data=list(fake_jobs.values()))
            return MagicMock(data=[])
        
        def insert(self, payload):
            self.insert_payload = payload
            return self
        
        def update(self, payload):
            return self
    
    fake_storage = MagicMock()
    fake_csv = b"0,id1,2023-01-01,topic1,user1,I love this\n0,id2,2023-01-02,topic2,user2,I hate this\n"
    fake_storage.from_.return_value.download.return_value = fake_csv
    fake_storage.from_.return_value.upload.return_value = {"data": None}
    
    fake_sb = MagicMock()
    fake_sb.table = lambda table_name: FakeQuery(table_name)
    fake_sb.storage = fake_storage
    
    monkeypatch.setattr("app.services.label_service.supabase", fake_sb)
    monkeypatch.setattr("app.routers.label.supabase", fake_sb)
    yield

def test_naive_labeling_endpoint():
    """Test naive labeling endpoint."""
    payload = {
        "dataset_id": "d1",
        "session_id": "s1",
        "keyword_map": {"pos": ["love"], "neg": ["hate"]},
        "use_default_keywords": False,
    }
    res = client.post("/datasets/d1/label/naive", json=payload)
    assert res.status_code == 200
    assert "job_id" in res.json()

def test_naive_labeling_with_default_keywords():
    """Test naive labeling with default keywords."""
    payload = {
        "dataset_id": "d1",
        "session_id": "s1",
        "use_default_keywords": True,
    }
    res = client.post("/datasets/d1/label/naive", json=payload)
    assert res.status_code == 200
    assert "job_id" in res.json()

def test_clustering_labeling_endpoint():
    """Test clustering labeling endpoint."""
    payload = {
        "dataset_id": "d1",
        "session_id": "s1",
        "algorithm": "kmeans",
        "hyperparameters": {
            "n_clusters": 3,
            "random_state": 42,
        },
    }
    res = client.post("/datasets/d1/label/clustering", json=payload)
    assert res.status_code == 200
    assert "job_id" in res.json()

def test_hierarchical_clustering_endpoint():
    """Test hierarchical clustering labeling endpoint."""
    payload = {
        "dataset_id": "d1",
        "session_id": "s1",
        "algorithm": "hierarchical",
        "hyperparameters": {
            "n_clusters": 3,
            "linkage": "average",
        },
    }
    res = client.post("/datasets/d1/label/clustering", json=payload)
    assert res.status_code == 200
    assert "job_id" in res.json()

def test_manual_labeling_endpoint():
    """Test manual labeling endpoint."""
    payload = {
        "dataset_id": "d1",
        "session_id": "s1",
        "annotations": [
            {"row_index": 0, "label": 4},
            {"row_index": 1, "label": 0},
        ],
        "stop_early": False,
    }
    res = client.post("/datasets/d1/label/manual", json=payload)
    assert res.status_code == 200
    assert "job_id" in res.json()

def test_manual_labeling_single_row():
    """Test single row manual labeling endpoint."""
    payload = {
        "dataset_id": "d1",
        "session_id": "s1",
        "row_index": 0,
        "label": 4,
    }
    res = client.post("/datasets/d1/label/manual/row", json=payload)
    assert res.status_code == 200
    assert "job_id" in res.json()

def test_unified_labeling_endpoint_naive():
    """Test unified labeling endpoint with naive method."""
    payload = {
        "session_id": "s1",
        "method": "naive",
        "use_default_keywords": True,
    }
    res = client.post("/datasets/d1/label", json=payload)
    assert res.status_code == 200
    assert "job_id" in res.json()
    assert "message" in res.json()

def test_unified_labeling_endpoint_clustering():
    """Test unified labeling endpoint with clustering method."""
    payload = {
        "session_id": "s1",
        "method": "clustering",
        "algorithm": "kmeans",
        "hyperparameters": {
            "n_clusters": 3,
        },
    }
    res = client.post("/datasets/d1/label", json=payload)
    assert res.status_code == 200
    assert "job_id" in res.json()

def test_unified_labeling_endpoint_manual():
    """Test unified labeling endpoint with manual method."""
    payload = {
        "session_id": "s1",
        "method": "manual",
        "annotations": [
            {"row_index": 0, "label": 4},
        ],
        "stop_early": False,
    }
    res = client.post("/datasets/d1/label", json=payload)
    assert res.status_code == 200
    assert "job_id" in res.json()

def test_unified_labeling_endpoint_invalid_method():
    """Test unified labeling endpoint with invalid method."""
    payload = {
        "session_id": "s1",
        "method": "invalid_method",
    }
    res = client.post("/datasets/d1/label", json=payload)
    assert res.status_code == 400

def test_unified_labeling_endpoint_missing_session():
    """Test unified labeling endpoint without session_id."""
    payload = {
        "method": "naive",
    }
    res = client.post("/datasets/d1/label", json=payload)
    assert res.status_code == 400

def test_get_label_job():
    """Test getting label job status."""
    # First create a job
    payload = {
        "dataset_id": "d1",
        "session_id": "s1",
        "keyword_map": {"pos": ["love"]},
        "use_default_keywords": False,
    }
    create_res = client.post("/datasets/d1/label/naive", json=payload)
    assert create_res.status_code == 200
    job_id = create_res.json()["job_id"]
    
    # Get job status
    res = client.get(f"/datasets/label_jobs/{job_id}")
    assert res.status_code == 200
    assert "job_id" in res.json()

def test_get_label_job_not_found():
    """Test getting non-existent label job."""
    res = client.get("/datasets/label_jobs/nonexistent")
    assert res.status_code == 404

def test_labeling_dataset_not_found():
    """Test labeling with non-existent dataset."""
    payload = {
        "dataset_id": "nonexistent",
        "session_id": "s1",
        "keyword_map": {"pos": ["love"]},
        "use_default_keywords": False,
    }
    res = client.post("/datasets/nonexistent/label/naive", json=payload)
    assert res.status_code == 404

def test_clustering_with_all_algorithms():
    """Test clustering with all supported algorithms."""
    algorithms = ["kmeans", "dbscan", "agglomerative", "hierarchical"]
    
    for algo in algorithms:
        payload = {
            "dataset_id": "d1",
            "session_id": "s1",
            "algorithm": algo,
            "hyperparameters": {
                "n_clusters": 3 if algo != "dbscan" else None,
                "eps": 0.5 if algo == "dbscan" else None,
                "min_samples": 2 if algo == "dbscan" else None,
                "linkage": "average" if algo in ["agglomerative", "hierarchical"] else None,
            },
        }
        res = client.post("/datasets/d1/label/clustering", json=payload)
        assert res.status_code == 200, f"Failed for algorithm: {algo}"
        assert "job_id" in res.json()

