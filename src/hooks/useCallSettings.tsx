import { useState, useEffect, useCallback } from 'react';

export interface CallSettings {
  micSensitivity: number; // 0-100, threshold for voice detection
  masterVolume: number; // 0-100, global call volume
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
}

const DEFAULT_SETTINGS: CallSettings = {
  micSensitivity: 50,
  masterVolume: 100,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
};

const STORAGE_KEY = 'auradesk-call-settings';

export function useCallSettings() {
  const [settings, setSettings] = useState<CallSettings>(DEFAULT_SETTINGS);
  const [participantVolumes, setParticipantVolumes] = useState<Map<string, number>>(new Map());

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.warn('Failed to load call settings:', e);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: Partial<CallSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save call settings:', e);
      }
      return updated;
    });
  }, []);

  // Set volume for a specific participant
  const setParticipantVolume = useCallback((participantId: string, volume: number) => {
    setParticipantVolumes(prev => {
      const newMap = new Map(prev);
      newMap.set(participantId, Math.max(0, Math.min(200, volume))); // Allow up to 200% volume
      return newMap;
    });
  }, []);

  // Get volume for a specific participant (default to master volume)
  const getParticipantVolume = useCallback((participantId: string): number => {
    return participantVolumes.get(participantId) ?? settings.masterVolume;
  }, [participantVolumes, settings.masterVolume]);

  // Reset participant volume to master
  const resetParticipantVolume = useCallback((participantId: string) => {
    setParticipantVolumes(prev => {
      const newMap = new Map(prev);
      newMap.delete(participantId);
      return newMap;
    });
  }, []);

  return {
    settings,
    saveSettings,
    participantVolumes,
    setParticipantVolume,
    getParticipantVolume,
    resetParticipantVolume,
  };
}

export type UseCallSettingsReturn = ReturnType<typeof useCallSettings>;
