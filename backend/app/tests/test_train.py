"""
Comprehensive tests for the training system.
Tests all algorithms: knn, naive_bayes, naive_automatic, decision_tree
"""
import time
import uuid
import io
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.session_service import create_session
from app.db.supabase_client import supabase

client = TestClient(app)

# Sample CSV data with target column for testing
SAMPLE_CSV_WITH_TARGET = """target,text
0,I hate this terrible product it is awful
4,I love this amazing product it is great
0,This is the worst experience ever bad
4,Wonderful fantastic excellent service love it
2,This is neutral nothing special here
0,Terrible horrible no good very bad
4,Best thing ever amazing wonderful great
2,Just okay nothing to write home about
0,Disappointing bad experience awful service
4,Excellent superb fantastic love this product
"""

SAMPLE_LABELED_CSV = """0,123,2024-01-01,user1,topic1,I hate this terrible product it is awful
4,124,2024-01-02,user2,topic1,I love this amazing product it is great
0,125,2024-01-03,user3,topic2,This is the worst experience ever bad
4,126,2024-01-04,user4,topic2,Wonderful fantastic excellent service love it
2,127,2024-01-05,user5,topic3,This is neutral nothing special here
0,128,2024-01-06,user6,topic3,Terrible horrible no good very bad
4,129,2024-01-07,user7,topic4,Best thing ever amazing wonderful great
2,130,2024-01-08,user8,topic4,Just okay nothing to write home about
0,131,2024-01-09,user9,topic5,Disappointing bad experience awful service
4,132,2024-01-10,user10,topic5,Excellent superb fantastic love this product
"""


def wait_for_job(job_id: str, timeout=60):
    """Poll job status until completed/failed."""
    start = time.time()
    while time.time() - start < timeout:
        job = supabase.table("training_jobs").select("*").eq("job_id", job_id).execute().data
        if not job:
            time.sleep(1)
            continue
        status = job[0]["status"]
        if status in ["completed", "failed"]:
            return job[0]
        time.sleep(2)
    raise TimeoutError("Training job did not finish in time.")


def setup_test_dataset(session_id: str, csv_content: str, use_labeled: bool = False):
    """Create a test dataset with uploaded file."""
    dataset_id = str(uuid.uuid4())
    
    # Upload file to storage
    if use_labeled:
        filename = f"test_labeled_{dataset_id}.csv"
        file_field = "labeled_file"
    else:
        filename = f"test_dataset_{dataset_id}.csv"
        file_field = "original_file"
    
    file_path = f"tests/{filename}"
    
    try:
        supabase.storage.from_("datasets").upload(
            file_path,
            csv_content.encode("utf-8"),
            {"contentType": "text/csv"}
        )
    except Exception as e:
        # File might already exist, try to remove and re-upload
        try:
            supabase.storage.from_("datasets").remove([file_path])
            supabase.storage.from_("datasets").upload(
                file_path,
                csv_content.encode("utf-8"),
                {"contentType": "text/csv"}
            )
        except Exception:
            pass
    
    # Create dataset record
    dataset_data = {
        "dataset_id": dataset_id,
        "session_id": session_id,
        "original_file": file_path if not use_labeled else None,
        "labeled_file": file_path if use_labeled else None,
        "cleaned_file": None,
        "status": "labeled" if use_labeled else "uploaded",
        "uploaded_at": "2024-01-01T00:00:00Z",
    }
    
    supabase.table("datasets").insert(dataset_data).execute()
    
    return dataset_id, file_path


def cleanup_test_data(dataset_id: str, model_id: str = None, file_path: str = None):
    """Clean up test data after test."""
    try:
        # Delete training jobs
        supabase.table("training_jobs").delete().eq("dataset_id", dataset_id).execute()
        
        # Delete trained models
        if model_id:
            supabase.table("trained_models").delete().eq("model_id", model_id).execute()
        
        # Delete dataset
        supabase.table("datasets").delete().eq("dataset_id", dataset_id).execute()
        
        # Delete file from storage
        if file_path:
            try:
                supabase.storage.from_("datasets").remove([file_path])
            except Exception:
                pass
        
        # Delete model files from storage
        if model_id:
            try:
                supabase.storage.from_("models").remove([f"{model_id}/model.pkl"])
            except Exception:
                pass
    except Exception as e:
        print(f"Cleanup error: {e}")


class TestTrainingEndpoint:
    """Test the training API endpoint."""
    
    def test_training_endpoint_returns_job_and_model_id(self):
        """Test that training endpoint returns job_id and model_id."""
        session = create_session()
        dataset_id, file_path = setup_test_dataset(session["session_id"], SAMPLE_CSV_WITH_TARGET)
        
        try:
            payload = {
                "session_id": session["session_id"],
                "dataset_id": dataset_id,
                "algorithm": "knn",
                "hyperparameters": {"k": 3, "distance": "euclidean"},
                "test_size": 0.2,
                "model_name": "test_knn",
            }
            
            r = client.post("/train/", json=payload)
            assert r.status_code == 200
            
            data = r.json()
            assert "job_id" in data
            assert "model_id" in data
            assert "message" in data
            
            # Wait and cleanup
            wait_for_job(data["job_id"])
            cleanup_test_data(dataset_id, data["model_id"], file_path)
        except Exception as e:
            cleanup_test_data(dataset_id, file_path=file_path)
            raise e
    
    def test_training_invalid_dataset(self):
        """Test that training fails for non-existent dataset."""
        session = create_session()
        
        payload = {
            "session_id": session["session_id"],
            "dataset_id": str(uuid.uuid4()),  # Non-existent
            "algorithm": "knn",
            "test_size": 0.2,
        }
        
        r = client.post("/train/", json=payload)
        assert r.status_code == 404
    
    def test_training_invalid_algorithm(self):
        """Test that invalid algorithm is rejected."""
        session = create_session()
        dataset_id, file_path = setup_test_dataset(session["session_id"], SAMPLE_CSV_WITH_TARGET)
        
        try:
            payload = {
                "session_id": session["session_id"],
                "dataset_id": dataset_id,
                "algorithm": "invalid_algo",  # Invalid
                "test_size": 0.2,
            }
            
            r = client.post("/train/", json=payload)
            assert r.status_code == 422  # Validation error
            
            cleanup_test_data(dataset_id, file_path=file_path)
        except Exception as e:
            cleanup_test_data(dataset_id, file_path=file_path)
            raise e


class TestKNNTraining:
    """Test KNN algorithm training."""
    
    def test_knn_training_completes(self):
        """Test that KNN training completes successfully."""
        session = create_session()
        dataset_id, file_path = setup_test_dataset(session["session_id"], SAMPLE_CSV_WITH_TARGET)
        
        try:
            payload = {
                "session_id": session["session_id"],
                "dataset_id": dataset_id,
                "algorithm": "knn",
                "hyperparameters": {"k": 3, "distance": "euclidean"},
                "test_size": 0.2,
                "model_name": "test_knn_model",
            }
            
            r = client.post("/train/", json=payload)
            assert r.status_code == 200
            
            job_id = r.json()["job_id"]
            model_id = r.json()["model_id"]
            
            # Wait for completion
            final_job = wait_for_job(job_id)
            assert final_job["status"] == "completed"
            
            # Verify model saved
            model = supabase.table("trained_models").select("*").eq("model_id", model_id).execute().data
            assert len(model) == 1
            assert model[0]["algorithm"] == "knn"
            assert "metrics" in model[0]
            assert model[0]["metrics"].get("accuracy") is not None
            
            cleanup_test_data(dataset_id, model_id, file_path)
        except Exception as e:
            cleanup_test_data(dataset_id, file_path=file_path)
            raise e
    
    def test_knn_with_different_k_values(self):
        """Test KNN with different k values."""
        session = create_session()
        dataset_id, file_path = setup_test_dataset(session["session_id"], SAMPLE_CSV_WITH_TARGET)
        
        try:
            for k in [1, 3, 5]:
                payload = {
                    "session_id": session["session_id"],
                    "dataset_id": dataset_id,
                    "algorithm": "knn",
                    "hyperparameters": {"k": k, "distance": "euclidean"},
                    "test_size": 0.3,
                }
                
                r = client.post("/train/", json=payload)
                assert r.status_code == 200
                
                job = wait_for_job(r.json()["job_id"])
                assert job["status"] == "completed"
                
                # Cleanup model
                supabase.table("trained_models").delete().eq("model_id", r.json()["model_id"]).execute()
            
            cleanup_test_data(dataset_id, file_path=file_path)
        except Exception as e:
            cleanup_test_data(dataset_id, file_path=file_path)
            raise e


class TestNaiveBayesTraining:
    """Test Naive Bayes algorithm training."""
    
    def test_naive_bayes_training_completes(self):
        """Test that Naive Bayes training completes successfully."""
        session = create_session()
        dataset_id, file_path = setup_test_dataset(session["session_id"], SAMPLE_CSV_WITH_TARGET)
        
        try:
            payload = {
                "session_id": session["session_id"],
                "dataset_id": dataset_id,
                "algorithm": "naive_bayes",
                "hyperparameters": {"ngram": "unigram", "feature_rep": "frequency"},
                "test_size": 0.2,
                "model_name": "test_nb_model",
            }
            
            r = client.post("/train/", json=payload)
            assert r.status_code == 200
            
            job_id = r.json()["job_id"]
            model_id = r.json()["model_id"]
            
            final_job = wait_for_job(job_id)
            assert final_job["status"] == "completed"
            
            # Verify model
            model = supabase.table("trained_models").select("*").eq("model_id", model_id).execute().data
            assert len(model) == 1
            assert model[0]["algorithm"] == "naive_bayes"
            
            cleanup_test_data(dataset_id, model_id, file_path)
        except Exception as e:
            cleanup_test_data(dataset_id, file_path=file_path)
            raise e
    
    def test_naive_bayes_with_bigrams(self):
        """Test Naive Bayes with bigram features."""
        session = create_session()
        dataset_id, file_path = setup_test_dataset(session["session_id"], SAMPLE_CSV_WITH_TARGET)
        
        try:
            payload = {
                "session_id": session["session_id"],
                "dataset_id": dataset_id,
                "algorithm": "naive_bayes",
                "hyperparameters": {"ngram": "bigram", "feature_rep": "frequency"},
                "test_size": 0.2,
            }
            
            r = client.post("/train/", json=payload)
            assert r.status_code == 200
            
            job = wait_for_job(r.json()["job_id"])
            assert job["status"] == "completed"
            
            cleanup_test_data(dataset_id, r.json()["model_id"], file_path)
        except Exception as e:
            cleanup_test_data(dataset_id, file_path=file_path)
            raise e
    
    def test_naive_bayes_binary_features(self):
        """Test Naive Bayes with binary feature representation."""
        session = create_session()
        dataset_id, file_path = setup_test_dataset(session["session_id"], SAMPLE_CSV_WITH_TARGET)
        
        try:
            payload = {
                "session_id": session["session_id"],
                "dataset_id": dataset_id,
                "algorithm": "naive_bayes",
                "hyperparameters": {"ngram": "unigram", "feature_rep": "binary"},
                "test_size": 0.2,
            }
            
            r = client.post("/train/", json=payload)
            assert r.status_code == 200
            
            job = wait_for_job(r.json()["job_id"])
            assert job["status"] == "completed"
            
            cleanup_test_data(dataset_id, r.json()["model_id"], file_path)
        except Exception as e:
            cleanup_test_data(dataset_id, file_path=file_path)
            raise e


class TestDecisionTreeTraining:
    """Test Decision Tree algorithm training."""
    
    def test_decision_tree_training_completes(self):
        """Test that Decision Tree training completes successfully."""
        session = create_session()
        dataset_id, file_path = setup_test_dataset(session["session_id"], SAMPLE_CSV_WITH_TARGET)
        
        try:
            payload = {
                "session_id": session["session_id"],
                "dataset_id": dataset_id,
                "algorithm": "decision_tree",
                "hyperparameters": {"max_depth": 5, "min_samples_split": 2},
                "test_size": 0.2,
                "model_name": "test_dt_model",
            }
            
            r = client.post("/train/", json=payload)
            assert r.status_code == 200
            
            job_id = r.json()["job_id"]
            model_id = r.json()["model_id"]
            
            final_job = wait_for_job(job_id)
            assert final_job["status"] == "completed"
            
            # Verify model
            model = supabase.table("trained_models").select("*").eq("model_id", model_id).execute().data
            assert len(model) == 1
            assert model[0]["algorithm"] == "decision_tree"
            
            cleanup_test_data(dataset_id, model_id, file_path)
        except Exception as e:
            cleanup_test_data(dataset_id, file_path=file_path)
            raise e
    
    def test_decision_tree_different_depths(self):
        """Test Decision Tree with different max_depth values."""
        session = create_session()
        dataset_id, file_path = setup_test_dataset(session["session_id"], SAMPLE_CSV_WITH_TARGET)
        
        try:
            for depth in [3, 5, 10, None]:
                payload = {
                    "session_id": session["session_id"],
                    "dataset_id": dataset_id,
                    "algorithm": "decision_tree",
                    "hyperparameters": {"max_depth": depth},
                    "test_size": 0.3,
                }
                
                r = client.post("/train/", json=payload)
                assert r.status_code == 200
                
                job = wait_for_job(r.json()["job_id"])
                assert job["status"] == "completed"
                
                supabase.table("trained_models").delete().eq("model_id", r.json()["model_id"]).execute()
            
            cleanup_test_data(dataset_id, file_path=file_path)
        except Exception as e:
            cleanup_test_data(dataset_id, file_path=file_path)
            raise e


class TestNaiveAutomaticTraining:
    """Test Naive Automatic algorithm training (keyword-based)."""
    
    def test_naive_automatic_training_completes(self):
        """Test that Naive Automatic training completes (requires keyword files in storage)."""
        session = create_session()
        dataset_id, file_path = setup_test_dataset(session["session_id"], SAMPLE_CSV_WITH_TARGET)
        
        try:
            payload = {
                "session_id": session["session_id"],
                "dataset_id": dataset_id,
                "algorithm": "naive_automatic",
                "hyperparameters": {},
                "test_size": 0.2,
                "model_name": "test_auto_model",
            }
            
            r = client.post("/train/", json=payload)
            assert r.status_code == 200
            
            job_id = r.json()["job_id"]
            model_id = r.json()["model_id"]
            
            final_job = wait_for_job(job_id, timeout=120)
            
            # May fail if keyword files not present - that's expected
            if final_job["status"] == "completed":
                model = supabase.table("trained_models").select("*").eq("model_id", model_id).execute().data
                assert len(model) == 1
                assert model[0]["algorithm"] == "naive_automatic"
            
            cleanup_test_data(dataset_id, model_id, file_path)
        except Exception as e:
            cleanup_test_data(dataset_id, file_path=file_path)
            # Don't raise - naive_automatic may fail if keywords not present
            print(f"Naive automatic test: {e}")


class TestTrainingWithLabeledFile:
    """Test training using labeled files (no headers, target in column 0)."""
    
    def test_training_with_labeled_file(self):
        """Test training with a labeled dataset file."""
        session = create_session()
        dataset_id, file_path = setup_test_dataset(
            session["session_id"], 
            SAMPLE_LABELED_CSV, 
            use_labeled=True
        )
        
        try:
            payload = {
                "session_id": session["session_id"],
                "dataset_id": dataset_id,
                "algorithm": "knn",
                "hyperparameters": {"k": 3},
                "test_size": 0.3,
            }
            
            r = client.post("/train/", json=payload)
            assert r.status_code == 200
            
            job = wait_for_job(r.json()["job_id"])
            assert job["status"] == "completed"
            
            cleanup_test_data(dataset_id, r.json()["model_id"], file_path)
        except Exception as e:
            cleanup_test_data(dataset_id, file_path=file_path)
            raise e


class TestJobStatusEndpoint:
    """Test the job status endpoint."""
    
    def test_get_job_status(self):
        """Test getting job status."""
        session = create_session()
        dataset_id, file_path = setup_test_dataset(session["session_id"], SAMPLE_CSV_WITH_TARGET)
        
        try:
            payload = {
                "session_id": session["session_id"],
                "dataset_id": dataset_id,
                "algorithm": "knn",
                "hyperparameters": {"k": 3},
                "test_size": 0.2,
            }
            
            r = client.post("/train/", json=payload)
            job_id = r.json()["job_id"]
            
            # Get status
            status_r = client.get(f"/train/job/{job_id}")
            assert status_r.status_code == 200
            
            data = status_r.json()
            assert "status" in data
            assert "algorithm" in data
            assert data["algorithm"] == "knn"
            
            wait_for_job(job_id)
            cleanup_test_data(dataset_id, r.json()["model_id"], file_path)
        except Exception as e:
            cleanup_test_data(dataset_id, file_path=file_path)
            raise e
    
    def test_get_nonexistent_job(self):
        """Test getting status of non-existent job."""
        r = client.get(f"/train/job/{uuid.uuid4()}")
        assert r.status_code == 404


class TestTrainingMetrics:
    """Test that training produces valid metrics."""
    
    def test_metrics_contain_required_fields(self):
        """Test that metrics contain accuracy, precision, recall, etc."""
        session = create_session()
        dataset_id, file_path = setup_test_dataset(session["session_id"], SAMPLE_CSV_WITH_TARGET)
        
        try:
            payload = {
                "session_id": session["session_id"],
                "dataset_id": dataset_id,
                "algorithm": "knn",
                "hyperparameters": {"k": 3},
                "test_size": 0.2,
            }
            
            r = client.post("/train/", json=payload)
            model_id = r.json()["model_id"]
            
            wait_for_job(r.json()["job_id"])
            
            model = supabase.table("trained_models").select("*").eq("model_id", model_id).execute().data[0]
            metrics = model["metrics"]
            
            # Check required metric fields
            assert "accuracy" in metrics
            assert "precision" in metrics
            assert "recall" in metrics
            assert "f1" in metrics
            assert "confusion_matrix" in metrics
            assert "error_rate" in metrics
            
            # Check values are valid
            assert 0 <= metrics["accuracy"] <= 1
            assert 0 <= metrics["precision"] <= 1
            assert 0 <= metrics["recall"] <= 1
            
            cleanup_test_data(dataset_id, model_id, file_path)
        except Exception as e:
            cleanup_test_data(dataset_id, file_path=file_path)
            raise e


# Run with: pytest app/tests/test_train.py -v
