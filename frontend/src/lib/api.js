import axios from "axios";
import { useEffect, useState, useCallback } from "react";
import { FALLBACK_SERVICES } from "@/lib/site";

export const api = axios.create({ baseURL: `${process.env.REACT_APP_BACKEND_URL}` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errorText(e) {
    const d = e?.response?.data?.detail || e?.response?.data?.message || e?.message;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map((x) => x?.msg || x?.message || JSON.stringify(x)).filter(Boolean).join(" ");
    if (d && typeof d === "object") return d.msg || d.message || JSON.stringify(d);
    return e?.response?.statusText || "Algo deu errado. Tente novamente.";
}

export function useServices() {
  const [services, setServices] = useState(FALLBACK_SERVICES);
  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/services");
      if (Array.isArray(data) && data.length) setServices(data);
    } catch {
      setServices(FALLBACK_SERVICES);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { services, reload: load };
}
