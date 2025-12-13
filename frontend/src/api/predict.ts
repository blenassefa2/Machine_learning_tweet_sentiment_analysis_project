// src/api/predict.ts
import axios from "axios";

const API_BASE = "https://machine-learning-tweet-sentiment.onrender.com/predict";

// -------------------------------
// Types
// -------------------------------
export interface PredictSingleResponse {
  prediction: string | number;
}

export interface PredictManyResponse {
  predictions: (string | number)[];
}

export interface PredictDatasetResponse {
  predictions: (string | number)[];
}

// -------------------------------
// Predict a Single Text
// -------------------------------
export const predictOne = async (
  modelId: string,
  sessionId: string,
  inputText: string
): Promise<PredictSingleResponse> => {
  const res = await axios.post(`${API_BASE}/one`, {
    model_id: modelId,
    session_id: sessionId,
    input_text: inputText,
  });

  return res.data;
};

// -------------------------------
// Predict Many Texts
// -------------------------------
export const predictMany = async (
  modelId: string,
  sessionId: string,
  texts: string[]
): Promise<PredictManyResponse> => {
  const res = await axios.post(`${API_BASE}/many`, {
    model_id: modelId,
    session_id: sessionId,
    texts: texts,
  });

  return res.data;
};

// -------------------------------
// Predict Entire Dataset
// -------------------------------
export const predictDataset = async (
  modelId: string,
  sessionId: string,
  datasetId: string
): Promise<PredictDatasetResponse> => {
  const res = await axios.post(`${API_BASE}/dataset`, {
    model_id: modelId,
    session_id: sessionId,
    dataset_id: datasetId,
  });

  return res.data;
};