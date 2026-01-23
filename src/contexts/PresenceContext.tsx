import { createContext, useContext, ReactNode } from 'react';
import { usePresence, PresenceStatus } from '@/hooks/usePresence';

interface PresenceContextType {
  myStatus: PresenceStatus;
  getStatus: (userId: string) => PresenceStatus;
  setDoNotDisturb: (enabled: boolean) => Promise<void>;
  setInMeeting: (inMeeting: boolean) => Promise<void>;
}

const PresenceContext = createContext<PresenceContextType | null>(null);

export const PresenceProvider = ({ children }: { children: ReactNode }) => {
  const presence = usePresence();
  
  return (
    <PresenceContext.Provider value={presence}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresenceContext = () => {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresenceContext must be used within a PresenceProvider');
  }
  return context;
};
