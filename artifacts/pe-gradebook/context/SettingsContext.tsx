import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { GradingConfig, DEFAULT_GRADING_CONFIG } from "@/utils/grading";

const STORAGE_KEY = "pe_gb_settings_v1";

type SettingsContextType = {
  gradingConfig: GradingConfig;
  updateGradingConfig: (updates: Partial<GradingConfig>) => void;
  updateSpecialLabel: (key: keyof GradingConfig["specialLabels"], value: string) => void;
  resetToDefaults: () => void;
  settingsReady: boolean;
};

const SettingsContext = createContext<SettingsContextType>({
  gradingConfig: DEFAULT_GRADING_CONFIG,
  updateGradingConfig: () => {},
  updateSpecialLabel: () => {},
  resetToDefaults: () => {},
  settingsReady: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [gradingConfig, setGradingConfig] = useState<GradingConfig>(DEFAULT_GRADING_CONFIG);
  const [settingsReady, setSettingsReady] = useState(false);

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

  return (
    <SettingsContext.Provider value={{ gradingConfig, updateGradingConfig, updateSpecialLabel, resetToDefaults, settingsReady }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
