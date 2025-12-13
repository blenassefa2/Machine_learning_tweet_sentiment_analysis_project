// src/api/cleaning.ts
import axios from "axios";

const API_BASE = "https://machine-learning-tweet-sentiment.onrender.com";

// ----------------------------
// Cleaning Request Interfaces (matching backend models)
// ----------------------------

export interface MissingValueOption {
  strategy: "drop_rows" | "fill_constant" | "fill_mean" | "fill_median" | "fill_mode";
  constant_value?: string;
  columns?: string[];
}

export interface TextCleaningOptions {
  text_columns?: string[];
  remove_urls?: boolean;
  remove_retweets?: boolean;
  remove_hashtags?: boolean;
  remove_mentions?: boolean;
  remove_numbers?: boolean;
  remove_html_tags?: boolean;
  remove_extra_spaces?: boolean;
  remove_contradictory_emojis?: boolean;
  remove_not_french?: boolean;
  remove_not_english?: boolean;
}

export interface ColumnValidationOptions {
  column: string;
  validation_type: "polarity" | "unique_id" | "date" | "not_empty" | "max_length";
  allowed_values?: any[];
  max_length?: number;
  date_format?: string;
}

export interface ColumnMapping {
  index: number;
  name: string;
}

export interface CleaningOptions {
  keep_columns?: ColumnMapping[];
  remove_duplicates?: boolean;
  missing_value_options?: MissingValueOption[];
  text_cleaning?: TextCleaningOptions;
  column_validations?: ColumnValidationOptions[];
  preview_top_n?: number;
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
    progress?: number;
    message?: string;
    result_file?: string;
    cleaned_file?: string;
    created_at?: string;
    finished_at?: string;
    logs?: string;
    metrics?: Record<string, number>;
  };
};

// ----------------------------
// Poll Until Cleaning Done
// ----------------------------
export const waitForCleaningCompletion = async (
  jobId: string,
  onUpdate?: (status: string, progress?: number) => void,
  intervalMs: number = 1500
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const job = await getCleaningJob(jobId);

        if (onUpdate) onUpdate(job.status, job.progress);

        if (job.status === "completed") {
          clearInterval(interval);
          resolve(job);
        }

        if (job.status === "error") {
          clearInterval(interval);
          reject(new Error(job.logs || job.message || "Cleaning failed."));
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, intervalMs);
  });
};
