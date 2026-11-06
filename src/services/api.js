import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ||
  "https://chatapplication-backend-qrxy.onrender.com/api",
  // A stalled API request should not leave screens in a loading state forever.
  // Render free services can take about a minute to wake after idle time.
  timeout: 90000,
});

export default api;
