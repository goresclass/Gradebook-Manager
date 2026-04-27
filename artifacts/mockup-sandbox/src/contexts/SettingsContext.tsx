import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { GradingConfig, DEFAULT_GRADING_CONFIG } from "../utils/grading";

const STORAGE_KEY    = "pe_gb_settings_v1";
const THEME_KEY      = "pe_gb_theme_v1";
const SWIPE_ORDER_KEY = "pe_gb_swipe_order_v1";

export type ThemePreference = "system" | "light" | "dark";
export type SwipeOrder = "roll" | "firstName" | "lastName";

type SettingsContextType = {
  gradingConfig: GradingConfig;
  updateGradingConfig: (updates: Partial<GradingConfig>) => void;
  updateSpecialLabel: (key: keyof GradingConfig["specialLabels"], value: string) => void;
  resetToDefaults: () => void;
  settingsReady: boolean;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  swipeOrder: SwipeOrder;
  setSwipeOrder: (order: SwipeOrder) => void;
};

const SettingsContext = createContext<SettingsContextType>({
  gradingConfig: DEFAULT_GRADING_CONFIG,
  updateGradingConfig: () => {},
  updateSpecialLabel: () => {},
  resetToDefaults: () => {},
  settingsReady: false,
  themePreference: "system",
  setThemePreference: () => {},
  swipeOrder: "roll",
  setSwipeOrder: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [gradingConfig, setGradingConfig] = useState<GradingConfig>(DEFAULT_GRADING_CONFIG);
  const [settingsReady, setSettingsReady] = useState(false);
  const [themePreference, setThemeState] = useState<ThemePreference>("system");
  const [swipeOrder, setSwipeState] = useState<SwipeOrder>("roll");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<GradingConfig>;
        setGradingConfig(prev => ({
          ...prev,
          ...saved,
          specialLabels: { ...prev.specialLabels, ...(saved.specialLabels ?? {}) },
        }));
      }
    } catch {}
    setSettingsReady(true);

    try {
      const raw = localStorage.getItem(THEME_KEY);
      if (raw === "light" || raw === "dark" || raw === "system") setThemeState(raw);
    } catch {}

    try {
      const raw = localStorage.getItem(SWIPE_ORDER_KEY);
      if (raw === "roll" || raw === "firstName" || raw === "lastName") setSwipeState(raw);
    } catch {}
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (themePreference === "dark" || (themePreference === "system" && prefersDark)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [themePreference]);

  const persist = useCallback((cfg: GradingConfig) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch {}
  }, []);

  const updateGradingConfig = useCallback((updates: Partial<GradingConfig>) => {
    setGradingConfig(prev => {
      const next = { ...prev, ...updates };
      persist(next);
      return next;
    });
  }, [persist]);

  const updateSpecialLabel = useCallback(
    (key: keyof GradingConfig["specialLabels"], value: string) => {
      setGradingConfig(prev => {
        const next = { ...prev, specialLabels: { ...prev.specialLabels, [key]: value } };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetToDefaults = useCallback(() => {
    setGradingConfig(DEFAULT_GRADING_CONFIG);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemeState(pref);
    try { localStorage.setItem(THEME_KEY, pref); } catch {}
  }, []);

  const setSwipeOrder = useCallback((order: SwipeOrder) => {
    setSwipeState(order);
    try { localStorage.setItem(SWIPE_ORDER_KEY, order); } catch {}
  }, []);

  return (
    <SettingsContext.Provider value={{
      gradingConfig, updateGradingConfig, updateSpecialLabel, resetToDefaults, settingsReady,
      themePreference, setThemePreference,
      swipeOrder, setSwipeOrder,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
