import axios from "axios";
import { getCurrentIdToken, getCurrentUser } from "./auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || `${import.meta.env.VITE_API_URL || ""}/api`,
  timeout: 15_000,
});

export function getEventStreamUrl(path = "/events/stream") {
  const base = api.defaults.baseURL || "/api";
  return `${base.replace(/\/$/, "")}${path}`;
}

api.interceptors.request.use(async (config) => {
  console.log("[auth-api] Firebase user present before ready:", Boolean(getCurrentUser()));
  const token = await getCurrentIdToken();
  console.log("[auth-api] attaching bearer token:", Boolean(token));
  if (token) {
    if (config.headers && "set" in config.headers && typeof config.headers.set === "function") {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
