// src/api/evaluate.ts
import axios from "axios";

const API_BASE = "https://machine-learning-tweet-sentiment.onrender.com/evaluate";

// -------------------------------
// Types
// -------------------------------
export interface EvaluationMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  confusion_matrix?: number[][];
  error_rate?: number;
  [key: string]: any; // allow extra backend metrics
}

// -------------------------------
// Evaluate Trained Model
// GET /evaluate/model/{model_id}?session_id=...
// -------------------------------
export const evaluateModel = async (modelId: string, sessionId: string) => {
  const res = await axios.get(`${API_BASE}/model/${modelId}`, {
    params: { session_id: sessionId }
  });

  return res.data as { metrics: EvaluationMetrics };
};

// -------------------------------
// Evaluate Classification
// POST /evaluate/classification
// body: { true_labels[], predicted[] }
// -------------------------------
export const evaluateClassification = async (
  trueLabels: string[],
  predicted: string[]
) => {
  const res = await axios.post(`${API_BASE}/classification`, {
    true_labels: trueLabels,
    predicted: predicted
  });

  return res.data as { metrics: EvaluationMetrics };
};

// -------------------------------
// Evaluate Predictions Only
// POST /evaluate/predictions
// -------------------------------
export const evaluatePredictions = async (
  trueLabels: string[],
  predicted: string[]
) => {
  const res = await axios.post(`${API_BASE}/predictions`, {
    true_labels: trueLabels,
    predicted: predicted
  });

  return res.data as { metrics: EvaluationMetrics };
};