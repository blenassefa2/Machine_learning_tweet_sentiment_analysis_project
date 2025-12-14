import pickle
import io
import pandas as pd
from typing import Dict, Any, Optional, List
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from app.db.supabase_client import supabase

MODEL_BUCKET = "models"
DATA_BUCKET = "datasets"
MAX_FILE_SIZE = 1 * 1024 * 1024  # 1MB


def get_trained_model_for_session(session_id: str) -> Optional[Dict]:
    """Get the most recent trained model for a session."""
    result = supabase.table("trained_models").select("*") \
        .eq("session_id", session_id) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    
    if result.data:
        return result.data[0]
    return None


def load_model_artifact(model_file: str) -> Dict:
    """Load pickled model artifact from storage."""
    raw = supabase.storage.from_(MODEL_BUCKET).download(model_file)
    return pickle.loads(raw)


def compute_metrics(y_true: List, y_pred: List) -> Dict:
    """Compute classification metrics."""
    accuracy = accuracy_score(y_true, y_pred)
    p, r, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="weighted", zero_division=0)
    cm = confusion_matrix(y_true, y_pred).tolist()
    
    return {
        "accuracy": float(accuracy),
        "precision": float(p),
        "recall": float(r),
        "f1": float(f1),
        "confusion_matrix": cm,
        "error_rate": float(1 - accuracy),
    }


def predict_with_custom_model(model_obj: Dict, algorithm: str, texts: List[str]) -> List[int]:
    """
    Predict using custom model classes.
    Returns predictions as list of integers (0, 2, 4).
    """
    model = model_obj.get("model")
    
    if algorithm == "naive_automatic":
        # NaiveAutomaticClassifier already returns 0, 2, 4
        return model.predict(texts)
    
    elif algorithm == "knn":
        # CustomKNN - uses Jaccard distance on raw text
        return model.predict(texts)
    
    elif algorithm == "naive_bayes":
        # CustomNaiveBayes - works on raw text
        return model.predict(texts)
    
    elif algorithm == "decision_tree":
        # sklearn DecisionTree needs vectorizer
        vectorizer = model_obj.get("vectorizer")
        if vectorizer is None:
            raise ValueError("Decision tree model requires vectorizer")
        vec = vectorizer.transform(texts)
        preds = model.predict(vec)
        return [int(p) for p in preds]
    
    else:
        raise ValueError(f"Unknown algorithm: {algorithm}")


def find_text_column(df: pd.DataFrame) -> Optional[str]:
    """Find the text/tweet column in a dataframe."""
    for col in ["text", "tweet", "content", "message"]:
        if col in df.columns:
            return col
    
    # Fallback: find first string column with avg length > 20
    for col in df.columns:
        if df[col].dtype == object:
            try:
                avg_len = df[col].astype(str).str.len().mean()
                if avg_len > 20:
                    return col
            except:
                continue
    
    return None


def find_target_column(df: pd.DataFrame) -> Optional[str]:
    """Find the target/label column in a dataframe."""
    for col in ["target", "polarity", "sentiment", "label"]:
        if col in df.columns:
            return col
    return None


def predict_new_dataset(session_id: str, dataset_id: str) -> Dict[str, Any]:
    """
    Predict labels for a new dataset using an existing trained model.
    
    Returns:
        {
            "predictions": [{"tweet": "...", "predicted_label": 0}, ...],
            "metrics": {...} or None,
            "total_rows": int,
            "label_distribution": {"0": n, "2": n, "4": n}
        }
    """
    # Check for trained model
    trained_model = get_trained_model_for_session(session_id)
    if not trained_model or not trained_model.get("model_file"):
        raise ValueError("You need to train a model first. Clean, label, and train at least one dataset before predicting on new data.")
    
    # Get dataset
    ds = supabase.table("datasets").select("*") \
        .eq("dataset_id", dataset_id) \
        .eq("session_id", session_id) \
        .execute().data
    
    if not ds:
        raise ValueError("Dataset not found")
    ds = ds[0]
    
    # Determine which file to use (cleaned preferred, then original)
    file_to_use = ds.get("cleaned_file") or ds.get("original_file")
    if not file_to_use:
        raise ValueError("No dataset file found")
    
    # Download and check file size
    raw = supabase.storage.from_(DATA_BUCKET).download(file_to_use)
    
    if len(raw) > MAX_FILE_SIZE:
        raise ValueError(f"File too large. Maximum size is 1MB, got {len(raw) / (1024*1024):.2f}MB")
    
    # Try to decode as UTF-8
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise ValueError("File encoding error. Please ensure the file is UTF-8 encoded.")
    
    # Parse CSV
    df = pd.read_csv(io.StringIO(text))
    
    # Find text column
    text_col = find_text_column(df)
    if not text_col:
        raise ValueError("No tweet/text column found in dataset. Ensure your data has a 'tweet' or 'text' column.")
    
    texts = df[text_col].astype(str).tolist()
    
    # Load model artifact
    model_obj = load_model_artifact(trained_model["model_file"])
    algorithm = trained_model["algorithm"]
    
    # Predict
    predictions = predict_with_custom_model(model_obj, algorithm, texts)
    
    # Build result
    result_data = []
    for tweet, pred in zip(texts, predictions):
        result_data.append({
            "tweet": tweet[:200] + "..." if len(tweet) > 200 else tweet,  # Truncate for display
            "predicted_label": int(pred)
        })
    
    # Calculate label distribution
    label_counts = {"0": 0, "2": 0, "4": 0}
    for pred in predictions:
        key = str(int(pred))
        if key in label_counts:
            label_counts[key] += 1
    
    response = {
        "predictions": result_data[:100],  # Limit to first 100 for display
        "total_rows": len(predictions),
        "label_distribution": label_counts,
        "algorithm": algorithm,
        "model_name": trained_model.get("model_name", "Unknown"),
    }
    
    # Check if dataset has target column for metrics
    target_col = find_target_column(df)
    if target_col:
        try:
            true_labels = df[target_col].astype(int).tolist()
            metrics = compute_metrics(true_labels, predictions)
            response["metrics"] = metrics
        except Exception as e:
            # Target column exists but couldn't compute metrics
            response["metrics"] = None
            response["metrics_error"] = str(e)
    else:
        response["metrics"] = None
    
    return response


# Keep legacy functions for backward compatibility
def load_model(model_id: str, session_id: str):
    """Legacy function - load model by model_id."""
    md = supabase.table("trained_models").select("*") \
        .eq("model_id", model_id) \
        .eq("session_id", session_id) \
        .execute().data
    
    if not md:
        raise ValueError("Model not found")
    md = md[0]
    
    raw = supabase.storage.from_(MODEL_BUCKET).download(md["model_file"])
    return pickle.loads(raw), md


def predict_one(model_id: str, session_id: str, text: str):
    """Predict single text using model_id."""
    model_obj, meta = load_model(model_id, session_id)
    preds = predict_with_custom_model(model_obj, meta["algorithm"], [text])
    return preds[0]


def predict_many(model_id: str, session_id: str, texts: list[str]):
    """Predict multiple texts using model_id."""
    model_obj, meta = load_model(model_id, session_id)
    return predict_with_custom_model(model_obj, meta["algorithm"], texts)
