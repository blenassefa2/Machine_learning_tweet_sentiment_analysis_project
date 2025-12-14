// src/api/label.ts
import axios from "axios";

const API_BASE = "https://machine-learning-tweet-sentiment.onrender.com/datasets";

// -------------------------
// Types from FastAPI models
// -------------------------
export interface ManualAnnotation {
  row_index: number;
  label: number; // 0 (negative), 2 (neutral), or 4 (positive)
}

export interface ManualLabelRequest {
  session_id: string;
  annotations: ManualAnnotation[];
  stop_early?: boolean;
}

export interface SingleLabelRequest {
  session_id: string;
  row_index: number;
  label: number; // 0, 2, or 4
}

export interface NaiveLabelRequest {
  session_id: string;
  keyword_map?: Record<string, string[]>; // { positive: ["good"], negative: ["bad"] }
  use_default_keywords: boolean;
}

export interface ClusteringHyperparams {
  n_clusters?: number;
  eps?: number;
  min_samples?: number;
  linkage?: string; // "average", "complete", "ward"
  random_state?: number;
}

export interface ClusteringLabelRequest {
  session_id: string;
  algorithm: "kmeans" | "dbscan" | "agglomerative" | "hierarchical";
  hyperparameters?: ClusteringHyperparams;
}

export interface LabelingRequest {
  session_id: string;
  method: "manual" | "naive" | "clustering" | "classify";
  annotations?: ManualAnnotation[];
  stop_early?: boolean;
  keyword_map?: Record<string, string[]>;
  use_default_keywords?: boolean;
  algorithm?: string;
  hyperparameters?: ClusteringHyperparams;
  classifier_params?: Record<string, any>;
}

// -------------------------------
// Unified Labeling Endpoint
// -------------------------------
export const labelDataset = async (
  datasetId: string,
  req: LabelingRequest
) => {
  const res = await axios.post(`${API_BASE}/${datasetId}/label`, req);
  return res.data as { job_id: string; message: string };
};

// -------------------------------
// Start Manual (Batch) Label Job
// -------------------------------
export const labelManual = async (
  datasetId: string,
  req: ManualLabelRequest
) => {
  const res = await axios.post(`${API_BASE}/${datasetId}/label/manual`, {
    dataset_id: datasetId,
    ...req,
  });
  return res.data as { job_id: string };
};

// -------------------------------
// Manual Label - Single Row
// -------------------------------
export const labelSingleRow = async (
  datasetId: string,
  req: SingleLabelRequest
) => {
  const res = await axios.post(`${API_BASE}/${datasetId}/label/manual/row`, {
    dataset_id: datasetId,
    ...req,
  });
  return res.data as { job_id: string };
};

// -------------------------------
// Naive Automatic Labeling
// -------------------------------
export const labelNaive = async (
  datasetId: string,
  req: NaiveLabelRequest
) => {
  const res = await axios.post(`${API_BASE}/${datasetId}/label/naive`, {
    dataset_id: datasetId,
    ...req,
  });
  return res.data as { job_id: string };
};

// -------------------------------
// Clustering Based Labeling
// -------------------------------
export const labelClustering = async (
  datasetId: string,
  req: ClusteringLabelRequest
) => {
  const res = await axios.post(`${API_BASE}/${datasetId}/label/clustering`, {
    dataset_id: datasetId,
    ...req,
  });
  return res.data as { job_id: string };
};

// -------------------------------
// Fetch Labeling Job Status
// -------------------------------
export const getLabelJob = async (jobId: string) => {
  const res = await axios.get(`${API_BASE}/label_jobs/${jobId}`);

  return res.data as {
    job_id: string;
    dataset_id: string;
    session_id: string;
    method: string;
    status: "pending" | "running" | "completed" | "error";
    progress?: number;
    message?: string;
    created_at?: string;
    started_at?: string;
    finished_at?: string;
    labeled_file?: string;
    logs?: string;
  };
};

// -------------------------------
// Poll Until Labeling Done
// -------------------------------
export const waitForLabelingCompletion = async (
  jobId: string,
  onUpdate?: (status: string, progress?: number) => void,
  intervalMs: number = 1500
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const job = await getLabelJob(jobId);

        if (onUpdate) onUpdate(job.status, job.progress);

        if (job.status === "completed") {
          clearInterval(interval);
          resolve(job);
        }

        if (job.status === "error") {
          clearInterval(interval);
          reject(new Error(job.logs || job.message || "Labeling failed."));
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, intervalMs);
  });
};

// -------------------------------
// Dataset Preview (used by manual labeling + review flows)
// Backend: GET /datasets/{dataset_id}/preview
// -------------------------------
export const previewDataset = async (
  datasetId: string,
  sessionId: string,
  useCleaned: boolean = false
) => {
  const res = await axios.get(`${API_BASE}/${datasetId}/preview`, {
    params: { session_id: sessionId, use_cleaned: useCleaned },
  });
  return res.data.preview as string[][];
};

