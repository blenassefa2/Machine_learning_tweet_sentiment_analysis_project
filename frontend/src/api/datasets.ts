import axios from "axios";

const API_BASE = "https://machine-learning-tweet-sentiment.onrender.com/datasets";

export const uploadDataset = async (file: File, sessionId: string) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("session_id", sessionId);

  const res = await axios.post(`${API_BASE}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data; // contains dataset_id
};

export const listDatasets = async (sessionId: string) => {
  const res = await axios.get(`${API_BASE}`, { params: { session_id: sessionId } });
  return res.data;
};

export const getDatasetInfo = async (datasetId: string, sessionId: string) => {
  const res = await axios.get(`${API_BASE}/${datasetId}/info`, {
    params: { session_id: sessionId },
  });
  return res.data;
};

export const getDatasetStatus = async (datasetId: string, sessionId: string) => {
  const res = await axios.get(`${API_BASE}/${datasetId}/status`, {
    params: { session_id: sessionId },
  });
  return res.data.status;
};

export const previewDataset = async (datasetId: string, sessionId: string) => {
  const res = await axios.get(`${API_BASE}/${datasetId}/preview`, {
    params: { session_id: sessionId },
  });
  return res.data.preview;
};

export const downloadDataset = async (datasetId: string, sessionId: string) => {
  const res = await axios.get(`${API_BASE}/${datasetId}/download`, {
    params: { session_id: sessionId },
    responseType: "blob", // important for file downloads
  });
  return res.data;
};

export const deleteDataset = async (datasetId: string, sessionId: string) => {
  const res = await axios.delete(`${API_BASE}/${datasetId}`, {
    params: { session_id: sessionId },
  });
  return res.data;
};