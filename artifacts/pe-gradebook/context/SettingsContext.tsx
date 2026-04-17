import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";

import { GradingConfig, DEFAULT_GRADING_CONFIG } from "@/utils/grading";

const STORAGE_KEY = "pe_gb_settings_v1";
const THEME_KEY   = "pe_gb_theme_v1";

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

const SWIPE_ORDER_KEY = "pe_gb_swipe_order_v1";

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
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<GradingConfig>;
          setGradingConfig(prev => ({
            ...prev,
            ...saved,
            specialLabels: { ...prev.specialLabels, ...(saved.specialLabels ?? {}) },
          }));
        } catch {}
      }
      setSettingsReady(true);
    });

    AsyncStorage.getItem(THEME_KEY).then(raw => {
      if (raw === "light" || raw === "dark" || raw === "system") {
        setThemeState(raw);
        Appearance.setColorScheme(raw === "system" ? null : raw);
      }
    });

    AsyncStorage.getItem(SWIPE_ORDER_KEY).then(raw => {
      if (raw === "roll" || raw === "firstName" || raw === "lastName") {
        setSwipeState(raw);
      }
    });
  }, []);

  const persist = useCallback((cfg: GradingConfig) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)).catch(() => {});
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
        const next = {
          ...prev,
          specialLabels: { ...prev.specialLabels, [key]: value },
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const resetToDefaults = useCallback(() => {
    setGradingConfig(DEFAULT_GRADING_CONFIG);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemeState(pref);
    Appearance.setColorScheme(pref === "system" ? null : pref);
    AsyncStorage.setItem(THEME_KEY, pref).catch(() => {});
  }, []);

  const setSwipeOrder = useCallback((order: SwipeOrder) => {
    setSwipeState(order);
    AsyncStorage.setItem(SWIPE_ORDER_KEY, order).catch(() => {});
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
