import axios from "axios";

const API_BASE = "https://machine-learning-tweet-sentiment.onrender.com/session";

export const start = async () => {
  
  const res = await axios.post(`${API_BASE}/`, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data; // contains session_id
};