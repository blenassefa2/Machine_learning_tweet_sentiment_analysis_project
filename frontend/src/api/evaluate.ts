// src/api/evaluate.ts
import axios from "axios";

const API_BASE = "https://machine-learning-tweet-sentiment.onrender.com/train";

// -------------------------------
// Types
// -------------------------------
export interface EvaluationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  error_rate: number;
  rand_index: number;
  confusion_matrix: number[][];
}

export interface EvaluationResponse {
  model_id: string;
  model_name: string;
  algorithm: string;
  dataset_id: string;
  train_size: number;
  val_size: number;
  metrics: EvaluationMetrics;
}

// -------------------------------
// Evaluate by Dataset ID
// GET /train/evaluate/{dataset_id}?session_id=...
// Returns metrics from trained model for this dataset
// -------------------------------
export const evaluateDataset = async (
  datasetId: string,
  sessionId: string
): Promise<EvaluationResponse> => {
  const res = await axios.get(`${API_BASE}/evaluate/${datasetId}`, {
    params: { session_id: sessionId },
  });

  return res.data as EvaluationResponse;
};

// -------------------------------
// Legacy: Evaluate by Model ID
// -------------------------------
export const evaluateModel = async (modelId: string, sessionId: string) => {
  const res = await axios.get(`${API_BASE}/evaluate/model/${modelId}`, {
    params: { session_id: sessionId },
  });

  return res.data as { metrics: EvaluationMetrics };
};
