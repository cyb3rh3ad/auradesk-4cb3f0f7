import React, { createContext, useContext } from 'react';
import { usePresence, PresenceStatus } from '@/hooks/usePresence';

interface PresenceContextType {
  myStatus: PresenceStatus;
  setManualStatus: (status: 'online' | 'dnd') => Promise<void>;
  setInCall: (inCall: boolean) => Promise<void>;
  getStatus: (userId: string) => PresenceStatus;
}

const PresenceContext = createContext<PresenceContextType | null>(null);

export const usePresenceContext = () => {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error('usePresenceContext must be used within PresenceProvider');
  return ctx;
};

export const PresenceProvider = ({ children }: { children: React.ReactNode }) => {
  const presence = usePresence();
  return (
    <PresenceContext.Provider value={presence}>
      {children}
    </PresenceContext.Provider>
  );
};
