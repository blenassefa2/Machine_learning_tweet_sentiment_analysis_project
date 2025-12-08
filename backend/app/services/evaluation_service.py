from sklearn.metrics import confusion_matrix, accuracy_score, precision_score
import numpy as np

def evaluate_classification(true_labels, pred_labels):
    cm = confusion_matrix(true_labels, pred_labels).tolist()
    acc = accuracy_score(true_labels, pred_labels)
    error_rate = 1 - acc
    prec = precision_score(true_labels, pred_labels, average="weighted", zero_division=0)

    return {
        "confusion_matrix": cm,
        "accuracy": acc,
        "error_rate": error_rate,
        "precision": prec
    }


def evaluate_trained_model(model_record):
    return model_record["metrics"]


def evaluate_predictions(true_labels, pred_labels):
    acc = accuracy_score(true_labels, pred_labels)
    prec = precision_score(true_labels, pred_labels, average="weighted", zero_division=0)
    return {
        "accuracy": acc,
        "precision": prec
    }