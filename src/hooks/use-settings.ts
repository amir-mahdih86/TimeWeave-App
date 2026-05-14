import { useState, useEffect } from 'react';
import { AppSettings, getSettings, saveSettings } from '@/lib/settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(getSettings);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated);
  };

  useEffect(() => {
    // Load settings on mount
    setSettings(getSettings());
  }, []);

  return {
    settings,
    updateSettings,
  };
}