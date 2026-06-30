import axios from 'axios';

const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `http://${host}:8000/api/v1`,
  withCredentials: true, // Crucial for Sanctum cookie-based session auth
  withXSRFToken: true, // Crucial for Axios 1.6.0+ to send X-XSRF-TOKEN header in cross-origin requests
  headers: {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Setup CSRF Cookie helper
export const getCsrfCookie = () => {
  const sanctumUrl = (import.meta.env.VITE_API_URL || `http://${host}:8000`).replace('/api/v1', '');
  return axios.get(`${sanctumUrl}/sanctum/csrf-cookie`, { withCredentials: true });
};

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Trigger auth state cleanup in UI
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
