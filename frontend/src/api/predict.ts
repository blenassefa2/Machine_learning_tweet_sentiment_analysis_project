import axios from 'axios';

const API_BASE = 'https://machine-learning-tweet-sentiment.onrender.com';

export interface PredictionResult {
  tweet: string;
  predicted_label: number;
}

export interface PredictionMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusion_matrix: number[][];
  error_rate: number;
}

export interface PredictResponse {
  predictions: PredictionResult[];
  total_rows: number;
  label_distribution: {
    '0': number;
    '2': number;
    '4': number;
  };
  algorithm: string;
  model_name: string;
  metrics?: PredictionMetrics | null;
  metrics_error?: string;
}

export const predictDataset = async (
  datasetId: string,
  sessionId: string
): Promise<PredictResponse> => {
  const res = await axios.post(`${API_BASE}/predict/dataset`, {
    dataset_id: datasetId,
    session_id: sessionId,
  });
  return res.data;
};
