import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api/v1").trim();
const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

export const buildApiUrl = (path = "") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimTrailingSlash(apiBaseUrl)}${normalizedPath}`;
};

// Create a centralized Axios instance
export const api = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true, // Crucial for sending/receiving secure HttpOnly cookies
    headers: {
        "Content-Type": "application/json"
    }
});

export const setApiAccessToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
};

const getReadableErrorMessage = (error) => {
  const responseData = error.response?.data;
  const statusCode = error.response?.status;

  if (statusCode === 401) {
    return "Your session is no longer valid. Please sign in again.";
  }

  if (statusCode === 429) {
    return "Too many attempts. Please wait a bit and try again.";
  }

  if (statusCode === 502 || statusCode === 503) {
    return "Server unavailable right now. Please try again in a moment.";
  }

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (typeof responseData?.message === "string" && responseData.message.trim()) {
    return responseData.message;
  }

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    return responseData.errors.join(" ");
  }

  if (error.code === "ERR_NETWORK") {
    return "Unable to reach the server. Please check your connection and try again.";
  }

  return error.message || "Something went wrong";
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.message = getReadableErrorMessage(error);

    return Promise.reject(error);
  }
);
