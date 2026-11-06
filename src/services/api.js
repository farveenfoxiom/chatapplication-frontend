import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ||
  "https://chatapplication-backend-qrxy.onrender.com/api",
  // A stalled API request should not leave screens in a loading state forever.
  timeout: 20000,
});

export default api;
