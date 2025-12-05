import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'dismissed_help_requests';

export const useDismissedHelpRequests = (userId: string | undefined) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load dismissed IDs from localStorage on mount or when userId changes
  useEffect(() => {
    if (!userId) {
      setDismissedIds(new Set());
      setIsLoaded(false);
      return;
    }
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setDismissedIds(new Set(parsed));
        } else {
          setDismissedIds(new Set());
        }
      } else {
        setDismissedIds(new Set());
      }
    } catch (e) {
      console.error('Error loading dismissed help requests:', e);
      setDismissedIds(new Set());
    }
    setIsLoaded(true);
  }, [userId]);

  const dismissRequest = useCallback((requestId: string) => {
    if (!userId) return;
    
    setDismissedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(requestId);
      
      // Persist to localStorage
      try {
        localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify([...newSet]));
      } catch (e) {
        console.error('Error saving dismissed help requests:', e);
      }
      
      return newSet;
    });
  }, [userId]);

  const isDismissed = useCallback((requestId: string) => {
    return dismissedIds.has(requestId);
  }, [dismissedIds]);

  // Read directly from localStorage to avoid stale state issues
  const filterDismissed = useCallback(<T extends { id: string }>(requests: T[]): T[] => {
    if (!userId) return requests;
    
    // Read fresh from localStorage to avoid any race conditions
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const dismissed = new Set(parsed);
          return requests.filter(r => !dismissed.has(r.id));
        }
      }
    } catch (e) {
      console.error('Error filtering dismissed requests:', e);
    }
    
    // Fallback to state
    return requests.filter(r => !dismissedIds.has(r.id));
  }, [userId, dismissedIds]);

  return {
    dismissRequest,
    isDismissed,
    filterDismissed,
    dismissedIds,
    isLoaded,
  };
};
