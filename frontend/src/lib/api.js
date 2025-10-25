import axios from "axios";
import { API_BASE } from "./config";

export const login = (email, password) =>
  axios.post(`${API_BASE}/login`, { email, password });

export const registerUser = (payload) =>
  axios.post(`${API_BASE}/register`, payload);

export const parseChatREST = (userId, text) =>
  axios.post(`${API_BASE}/chat/parse`, { user_id: userId, text });

export const getExpenses = (userId) =>
  axios.get(`${API_BASE}/expenses/${userId}`);

export const getTrends = (userId) =>
  axios.get(`${API_BASE}/expenses/trends/${userId}`);

export const updateBudget = (userId, category, monthly_limit) =>
  axios.post(`${API_BASE}/budget/update/${userId}`, { category, monthly_limit });

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

export const getGoalAlerts = (userId) =>
  axios.get(`${API_BASE}/goals/alerts/${userId}`);

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
