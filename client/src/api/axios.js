import axios from "axios";

// Create a centralized Axios instance
export const api = axios.create({
    baseURL: "/api/v1", // Proxied in Vite config or absolute URL in prod
    withCredentials: true, // Crucial for sending/receiving secure HttpOnly cookies
    headers: {
        "Content-Type": "application/json"
    }
});

// We can add interceptors later here (e.g., to handle 401 token refresh automatically)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // TODO: Implement Token Refresh logic if error.response.status === 401
        return Promise.reject(error);
    }
);
