import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PresenceStatus = 'online' | 'idle' | 'offline' | 'dnd' | 'in_call';

interface PresenceState {
  status: PresenceStatus;
  lastSeenAt: string;
}

const HEARTBEAT_INTERVAL = 8000; // 8 seconds
const IDLE_TIMEOUT = 300000; // 5 minutes

export const usePresence = () => {
  const { user } = useAuth();
  const [myStatus, setMyStatus] = useState<PresenceStatus>('online');
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceState>>(new Map());
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const manualStatusRef = useRef<string | null>(null);
  const isIdleRef = useRef(false);

  // Reset idle timer on user activity
  const resetIdleTimer = useCallback(() => {
    if (manualStatusRef.current === 'dnd') return;
    if (isIdleRef.current) {
      isIdleRef.current = false;
      setMyStatus('online');
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (manualStatusRef.current !== 'dnd') {
        isIdleRef.current = true;
        setMyStatus('idle');
      }
    }, IDLE_TIMEOUT);
  }, []);

  // Set manual status (user can toggle DND)
  const setManualStatus = useCallback(async (status: 'online' | 'dnd') => {
    if (!user) return;
    manualStatusRef.current = status === 'dnd' ? 'dnd' : null;
    setMyStatus(status);
    await supabase.from('user_presence').upsert({
      user_id: user.id,
      status: status,
      manual_status: status === 'dnd' ? 'dnd' : null,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  }, [user]);

  // Set in_call status (called by CallContext)
  const setInCall = useCallback(async (inCall: boolean) => {
    if (!user) return;
    if (manualStatusRef.current === 'dnd') return; // DND takes priority
    const newStatus = inCall ? 'in_call' : 'online';
    setMyStatus(newStatus as PresenceStatus);
    await supabase.from('user_presence').upsert({
      user_id: user.id,
      status: newStatus,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  }, [user]);

  // Heartbeat - update presence periodically
  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = async () => {
      const currentStatus = manualStatusRef.current === 'dnd' ? 'dnd' 
        : isIdleRef.current ? 'idle' : 'online';
      
      await supabase.from('user_presence').upsert({
        user_id: user.id,
        status: currentStatus,
        manual_status: manualStatusRef.current,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    };

    // Initial heartbeat
    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Activity listeners for idle detection
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    // Set offline on unload
    const handleUnload = () => {
      navigator.sendBeacon && supabase.from('user_presence').upsert({
        user_id: user.id,
        status: 'offline',
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      window.removeEventListener('beforeunload', handleUnload);
      // Mark offline on cleanup
      supabase.from('user_presence').upsert({
        user_id: user.id,
        status: 'offline',
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    };
  }, [user, resetIdleTimer]);

  // Subscribe to presence changes for all users
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    const fetchAll = async () => {
      const { data } = await supabase.from('user_presence').select('user_id, status, last_seen_at');
      if (data) {
        const map = new Map<string, PresenceState>();
        const now = Date.now();
        data.forEach(row => {
          // If last heartbeat > 30s ago, consider offline
          const lastSeen = new Date(row.last_seen_at).getTime();
          const isStale = now - lastSeen > 30000;
          map.set(row.user_id, {
            status: isStale ? 'offline' : row.status as PresenceStatus,
            lastSeenAt: row.last_seen_at,
          });
        });
        setPresenceMap(map);
      }
    };
    fetchAll();

    // Realtime subscription
    const channel = supabase
      .channel('presence-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence',
      }, (payload) => {
        const row = payload.new as any;
        if (row) {
          setPresenceMap(prev => {
            const next = new Map(prev);
            next.set(row.user_id, {
              status: row.status as PresenceStatus,
              lastSeenAt: row.last_seen_at,
            });
            return next;
          });
        }
      })
      .subscribe();

    // Periodic refresh to catch stale presence
    const refreshInterval = setInterval(fetchAll, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [user]);

  const getStatus = useCallback((userId: string): PresenceStatus => {
    const state = presenceMap.get(userId);
    if (!state) return 'offline';
    // Check staleness
    const isStale = Date.now() - new Date(state.lastSeenAt).getTime() > 30000;
    return isStale ? 'offline' : state.status;
  }, [presenceMap]);

  return { myStatus, setManualStatus, setInCall, getStatus, presenceMap };
};
