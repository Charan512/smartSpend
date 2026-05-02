import axios from "axios";
import { API_BASE } from "./config";

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || "";
      // Skip redirect for auth endpoints — let the component handle the error
      const isAuthEndpoint = requestUrl.includes("/login") || requestUrl.includes("/register");

      if (!isAuthEndpoint) {
        // Expired session: clear storage and return to landing page
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("email");
        localStorage.removeItem("monthly_budget");
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
