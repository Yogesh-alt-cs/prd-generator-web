import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_SETTINGS } from "@/lib/prd/constants";
import { loadSettings, saveSettings } from "@/lib/prd/storage";
import type { Settings } from "@/lib/prd/types";

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  replace: (next: Settings) => void;
  hydrated: boolean;
}

const SettingsCtx = createContext<Ctx>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
  replace: () => {},
  hydrated: false,
});

function applyAppearance(settings: Settings) {
  const root = document.documentElement;
  root.style.setProperty("--primary", settings.seed);
  root.style.setProperty("--radius", settings.shape === "sharp" ? "6px" : "24px");
  const prefersDark =
    settings.mode === "dark" ||
    (settings.mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", prefersDark);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSettings(settings);
    applyAppearance(settings);
  }, [settings, hydrated]);

  useEffect(() => {
    if (settings.mode !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyAppearance(settings);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const replace = useCallback((next: Settings) => setSettings(next), []);

  const value = useMemo(() => ({ settings, update, replace, hydrated }), [settings, update, replace, hydrated]);
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  return useContext(SettingsCtx);
}
