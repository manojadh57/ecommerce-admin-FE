import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_ADMIN_API || "http://localhost:8000/api/admin/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
