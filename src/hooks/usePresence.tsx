import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PresenceStatus = 'online' | 'away' | 'dnd' | 'in_meeting' | 'offline';

interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  manual_status: 'dnd' | null;
  last_seen_at: string;
}

const HEARTBEAT_INTERVAL = 8000; // 8 seconds
const AWAY_THRESHOLD = 60000; // 1 minute of inactivity = away

export const usePresence = () => {
  const { user } = useAuth();
  const [myStatus, setMyStatus] = useState<PresenceStatus>('offline');
  const [presenceMap, setPresenceMap] = useState<Map<string, UserPresence>>(new Map());
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isInMeetingRef = useRef(false);

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Set manual DND status
  const setDoNotDisturb = useCallback(async (enabled: boolean) => {
    if (!user) return;
    
    const newStatus = enabled ? 'dnd' : 'online';
    const manualStatus = enabled ? 'dnd' : null;
    
    await supabase
      .from('user_presence')
      .upsert({
        user_id: user.id,
        status: newStatus,
        manual_status: manualStatus,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    
    setMyStatus(newStatus);
  }, [user]);

  // Set in-meeting status
  const setInMeeting = useCallback(async (inMeeting: boolean) => {
    if (!user) return;
    isInMeetingRef.current = inMeeting;
    
    const newStatus = inMeeting ? 'in_meeting' : 'online';
    
    await supabase
      .from('user_presence')
      .upsert({
        user_id: user.id,
        status: newStatus,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    
    setMyStatus(newStatus);
  }, [user]);

  // Get status for a specific user
  const getStatus = useCallback((userId: string): PresenceStatus => {
    const presence = presenceMap.get(userId);
    if (!presence) return 'offline';
    
    // Check if last_seen is too old (more than 30 seconds)
    const lastSeen = new Date(presence.last_seen_at).getTime();
    const now = Date.now();
    if (now - lastSeen > 30000) return 'offline';
    
    return presence.status;
  }, [presenceMap]);

  // Heartbeat: update presence and calculate status
  const sendHeartbeat = useCallback(async () => {
    if (!user) return;
    
    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    
    // Determine status based on activity and manual settings
    let currentStatus: PresenceStatus = 'online';
    
    // Check for manual DND first
    const { data: currentPresence } = await supabase
      .from('user_presence')
      .select('manual_status')
      .eq('user_id', user.id)
      .single();
    
    if (currentPresence?.manual_status === 'dnd') {
      currentStatus = 'dnd';
    } else if (isInMeetingRef.current) {
      currentStatus = 'in_meeting';
    } else if (timeSinceActivity > AWAY_THRESHOLD) {
      currentStatus = 'away';
    }
    
    await supabase
      .from('user_presence')
      .upsert({
        user_id: user.id,
        status: currentStatus,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    
    setMyStatus(currentStatus);
  }, [user]);

  // Fetch all presence data
  const fetchPresence = useCallback(async () => {
    const { data } = await supabase
      .from('user_presence')
      .select('*');
    
    if (data) {
      const newMap = new Map<string, UserPresence>();
      data.forEach((p) => {
        newMap.set(p.user_id, p as UserPresence);
      });
      setPresenceMap(newMap);
    }
  }, []);

  // Initialize presence tracking
  useEffect(() => {
    if (!user) return;

    // Initial setup
    sendHeartbeat();
    fetchPresence();

    // Set up heartbeat interval
    heartbeatRef.current = setInterval(() => {
      sendHeartbeat();
      fetchPresence();
    }, HEARTBEAT_INTERVAL);

    // Track user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Subscribe to realtime presence updates
    const channel = supabase
      .channel('presence-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newPresence = payload.new as UserPresence;
            setPresenceMap(prev => {
              const updated = new Map(prev);
              updated.set(newPresence.user_id, newPresence);
              return updated;
            });
          }
        }
      )
      .subscribe();

    // Set offline on page unload
    const handleUnload = () => {
      // Use sendBeacon for reliable offline status
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${user.id}`;
      navigator.sendBeacon(url, JSON.stringify({ status: 'offline' }));
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      window.removeEventListener('beforeunload', handleUnload);
      channel.unsubscribe();
      
      // Set offline when unmounting
      supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          status: 'offline',
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    };
  }, [user, sendHeartbeat, fetchPresence, updateActivity]);

  return {
    myStatus,
    getStatus,
    setDoNotDisturb,
    setInMeeting,
    presenceMap,
  };
};
