// src/api/training.ts
import axios from "axios";

const API_BASE = "https://machine-learning-tweet-sentiment.onrender.com/train";

// ----------------------------
// Interfaces
// ----------------------------
export interface TrainRequest {
  dataset_id: string;
  session_id: string;
  algorithm: string; // "knn" | "naive_bayes" | "naive_automatic" | "decision_tree"
  hyperparameters?: Record<string, any>;
  test_size: number; // e.g. 0.2
  model_name?: string;
}

export interface TrainingJob {
  job_id: string;
  dataset_id: string;
  session_id: string;
  algorithm: string;
  status: "pending" | "running" | "completed" | "error";
  model_id?: string;
  logs?: string;
  created_at?: string;
  finished_at?: string;
}

// ----------------------------
// Start Training Job
// ----------------------------
export const trainModel = async (body: TrainRequest) => {
  const res = await axios.post(`${API_BASE}/`, body);
  return res.data as {
    job_id: string;
    model_id: string;
    message: string;
  };
};

// ----------------------------
// Get Job Status
// ----------------------------
export const getTrainingJob = async (jobId: string) => {
  const res = await axios.get(`${API_BASE}/job/${jobId}`);
  return res.data as TrainingJob;
};

// ----------------------------
// Wait Until Training Completes
// ----------------------------
export const waitForTrainingCompletion = async (
  jobId: string,
  onStatusUpdate?: (status: string) => void,
  intervalMs: number = 1800
): Promise<TrainingJob> => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const job = await getTrainingJob(jobId);

        if (onStatusUpdate) onStatusUpdate(job.status);

        if (job.status === "completed") {
          clearInterval(interval);
          resolve(job);
        }

        if (job.status === "error") {
          clearInterval(interval);
          reject(new Error(job.logs || "Training failed."));
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, intervalMs);
  });
};