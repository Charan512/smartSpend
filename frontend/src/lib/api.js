import axios from "axios";
import { API_BASE } from "./config";

export const login = (email, password) =>
  axios.post(`${API_BASE}/login`, { email, password });

export const registerUser = (payload) =>
  axios.post(`${API_BASE}/register`, payload);

export const uploadReceipt = (userId, file) => {
  const form = new FormData();
  form.append("file", file);
  // backend expects user_id as query param
  return axios.post(`${API_BASE}/upload/receipt?user_id=${userId}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// -----------------------------
// Goals API
// -----------------------------
export const getGoals = (userId) =>
  axios.get(`${API_BASE}/goals/${userId}`);

export const createGoal = (payload) =>
  axios.post(`${API_BASE}/goals`, payload);

// -----------------------------
// CSV Import API
// -----------------------------
export const uploadCSV = (userId, file) => {
  const form = new FormData();
  form.append("file", file);
  return axios.post(`${API_BASE}/upload/csv?user_id=${userId}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
