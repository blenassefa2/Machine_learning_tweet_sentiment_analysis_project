// src/api/classify.ts
import axios from "axios";

const API_BASE = "https://machine-learning-tweet-sentiment.onrender.com/datasets";

// -------------------------
// Types from FastAPI models
// -------------------------
export interface ManualAnnotation {
  row_index: number;
  label: string;
}

export interface ManualLabelRequest {
  session_id: string;
  annotations: ManualAnnotation[];
}

export interface SingleAnnotateRequest {
  session_id: string;
  row_index: number;
  label: string;
}

export interface NaiveLabelRequest {
  session_id: string;
  keyword_map?: Record<string, string[]>; // { positive: ["good"], negative: ["bad"] }
  use_default_keywords: boolean;
}

export interface ClusteringRequest {
  session_id: string;
  algorithm: string;
  hyperparameters: Record<string, any>;
}

// -------------------------------
// Start Manual (Batch) Label Job
// -------------------------------
export const labelManual = async (
  datasetId: string,
  req: ManualLabelRequest
) => {
  const res = await axios.post(`${API_BASE}/${datasetId}/label/manual`, req);
  return res.data as { job_id: string };
};

// -------------------------------
// Manual Label - Single Row
// -------------------------------
export const labelSingleRow = async (
  datasetId: string,
  req: SingleAnnotateRequest
) => {
  const res = await axios.post(`${API_BASE}/${datasetId}/label/manual/row`, req);
  return res.data as { job_id: string };
};

// -------------------------------
// Naive Automatic Labeling
// -------------------------------
export const labelNaive = async (
  datasetId: string,
  req: NaiveLabelRequest
) => {
  const res = await axios.post(`${API_BASE}/${datasetId}/label/naive`, req);
  return res.data as { job_id: string };
};

// -------------------------------
// Clustering Based Labeling
// -------------------------------
export const labelClustering = async (
  datasetId: string,
  req: ClusteringRequest
) => {
  const res = await axios.post(`${API_BASE}/${datasetId}/label/clustering`, req);
  return res.data as { job_id: string };
};

// -------------------------------
// Fetch Classification Job Status
// -------------------------------
export const getClassifyJob = async (jobId: string) => {
  const res = await axios.get(
    `${API_BASE}/classify_jobs/${jobId}`
  );

  return res.data as {
    job_id: string;
    dataset_id: string;
    session_id: string;
    status: "pending" | "running" | "completed" | "error";
    created_at?: string;
    finished_at?: string;
    logs?: string;
  };
};

// -------------------------------
// Poll Until Classification Done
// -------------------------------
export const waitForClassificationCompletion = async (
  jobId: string,
  onUpdate?: (status: string) => void,
  intervalMs: number = 1500
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const job = await getClassifyJob(jobId);

        if (onUpdate) onUpdate(job.status);

        if (job.status === "completed") {
          clearInterval(interval);
          resolve(job);
        }

        if (job.status === "error") {
          clearInterval(interval);
          reject(new Error(job.logs || "Classification failed."));
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, intervalMs);
  });
};