import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, BACKEND_URL } from "@/lib/api";

const LogoCtx = createContext({ url: null, refresh: () => {} });

export function LogoProvider({ children }) {
  const [url, setUrl] = useState(null);
  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/settings");
      setUrl(data?.has_logo ? `${BACKEND_URL}/api/logo?v=${data.logo_version}` : null);
    } catch {
      setUrl(null);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const link = document.querySelector("link[rel='icon']");
    if (link) link.href = url || "/favicon.ico";
  }, [url]);
  return <LogoCtx.Provider value={{ url, refresh }}>{children}</LogoCtx.Provider>;
}

export const useLogo = () => useContext(LogoCtx);
