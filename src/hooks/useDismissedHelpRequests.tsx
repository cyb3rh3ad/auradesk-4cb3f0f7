import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'dismissed_help_requests';

export const useDismissedHelpRequests = (userId: string | undefined) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Load dismissed IDs from localStorage on mount
  useEffect(() => {
    if (!userId) return;
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setDismissedIds(new Set(parsed));
        }
      }
    } catch (e) {
      console.error('Error loading dismissed help requests:', e);
    }
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

  const filterDismissed = useCallback(<T extends { id: string }>(requests: T[]): T[] => {
    return requests.filter(r => !dismissedIds.has(r.id));
  }, [dismissedIds]);

  return {
    dismissRequest,
    isDismissed,
    filterDismissed,
    dismissedIds,
  };
};
