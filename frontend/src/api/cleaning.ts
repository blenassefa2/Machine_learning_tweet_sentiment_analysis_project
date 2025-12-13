// src/api/cleaning.ts
import axios from "axios";

const API_BASE = "https://machine-learning-tweet-sentiment.onrender.com";

// ----------------------------
// Cleaning Request Interface
// ----------------------------
export interface CleaningOptions {
  columns_to_keep?: string[];
  remove_duplicates?: boolean;
  missing_values?: {
    strategy: "drop" | "mean" | "median" | "mode";
  };
  remove_outliers?: boolean;
  outlier_threshold?: number;
  fill_value?: any;
  normalize?: "minmax" | "standard" | "robust";
}

// ----------------------------
// Start Cleaning Job
// ----------------------------
export const cleanDataset = async (
  datasetId: string,
  sessionId: string,
  options: CleaningOptions
) => {
  const body = {
    session_id: sessionId,
    ...options,
  };

  const res = await axios.post(`${API_BASE}/datasets/${datasetId}/clean`, body);
  return res.data as {
    job_id: string;
    message: string;
  };
};



// ----------------------------
// Fetch Job Status
// ----------------------------
export const getCleaningJob = async (jobId: string) => {
  const res = await axios.get(`${API_BASE}/datasets/jobs/${jobId}`);
  return res.data as {
    job_id: string;
    dataset_id: string;
    session_id: string;
    status: "pending" | "running" | "completed" | "error";
    result_file?: string;
    cleaned_file?: string;
    created_at?: string;
    finished_at?: string;
    logs?: string;
  };
};

// ----------------------------
// Poll Until Cleaning Done
// ----------------------------
export const waitForCleaningCompletion = async (
  jobId: string,
  onUpdate?: (status: string) => void,
  intervalMs: number = 1500
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const job = await getCleaningJob(jobId);

        if (onUpdate) onUpdate(job.status);

        if (job.status === "completed") {
          clearInterval(interval);
          resolve(job);
        }

        if (job.status === "error") {
          clearInterval(interval);
          reject(new Error(job.logs || "Cleaning failed."));
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, intervalMs);
  });
};