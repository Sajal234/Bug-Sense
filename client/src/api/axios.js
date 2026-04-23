import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api/v1").trim();
const trimTrailingSlash = (value) => value.replace(/\/+$/, "");
const AUTH_MESSAGE_PATTERN = /(access token|token expired|invalid token|jwt expired|unauthorized request)/i;
const AUTH_FORM_PATHS = [
  "/users/login",
  "/users/register",
  "/users/auth/google",
  "/users/oauth/google"
];
const COLD_START_RETRYABLE_METHODS = new Set(["get", "head", "options"]);
const COLD_START_RETRYABLE_STATUSES = new Set([502, 503, 504]);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const requestUrl = error.config?.url || "";
  const stringMessage = typeof responseData === "string" ? responseData.trim() : "";
  const objectMessage =
    typeof responseData?.message === "string" ? responseData.message.trim() : "";
  const joinedErrors = Array.isArray(responseData?.errors) ? responseData.errors.join(" ") : "";
  const rawMessage = stringMessage || objectMessage || joinedErrors || error.message || "";

  if (statusCode === 401) {
    const isAuthFormRequest = AUTH_FORM_PATHS.some((path) => requestUrl.includes(path));

    if (!isAuthFormRequest && AUTH_MESSAGE_PATTERN.test(rawMessage)) {
      return "We’re reconnecting your session. Please wait a moment and try again.";
    }

    if (!isAuthFormRequest) {
      return "Please sign in and try again.";
    }
  }

  if (statusCode === 429) {
    return "Too many attempts. Please wait a bit and try again.";
  }

  if (statusCode === 502 || statusCode === 503) {
    return "Server unavailable right now. Please try again in a moment.";
  }

  if (stringMessage) {
    return stringMessage;
  }

  if (objectMessage) {
    return objectMessage;
  }

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    return responseData.errors.join(" ");
  }

  if (error.code === "ERR_NETWORK") {
    return "Unable to reach the server. Please check your connection and try again.";
  }

  return error.message || "Something went wrong";
};

const shouldRetryColdStartRequest = (error) => {
  const method = error.config?.method?.toLowerCase();
  const statusCode = error.response?.status;

  if (!method || !COLD_START_RETRYABLE_METHODS.has(method)) {
    return false;
  }

  if (error.config?._coldStartRetry) {
    return false;
  }

  return error.code === "ERR_NETWORK" || COLD_START_RETRYABLE_STATUSES.has(statusCode);
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (shouldRetryColdStartRequest(error)) {
      error.config._coldStartRetry = true;
      await wait(1500);
      return api(error.config);
    }

    error.message = getReadableErrorMessage(error);

    return Promise.reject(error);
  }
);
