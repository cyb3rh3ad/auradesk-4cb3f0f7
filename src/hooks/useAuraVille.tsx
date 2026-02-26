import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/useFriends';
import {
  SpatialProfile,
  RemotePlayer,
  PlayerPosition,
  House,
  WorldDecoration,
  DEFAULT_PROFILE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_SPEED,
  HOUSE_COLORS,
} from '@/components/auraville/gameTypes';

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function useAuraVille() {
  const { user } = useAuth();
  const { friends } = useFriends();
  const [profile, setProfile] = useState<SpatialProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [remotePlayers, setRemotePlayers] = useState<Map<string, RemotePlayer>>(new Map());
  const [houses, setHouses] = useState<House[]>([]);
  const [decorations, setDecorations] = useState<WorldDecoration[]>([]);
  const positionRef = useRef<PlayerPosition>({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, direction: 'down', isMoving: false });
  const [position, setPosition] = useState<PlayerPosition>(positionRef.current);
  const channelRef = useRef<any>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // ─── Load / Create Profile ─────────────────────────
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setProfileLoading(true);
      const { data } = await supabase
        .from('spatial_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setProfile({
          skinColor: data.skin_color,
          hairColor: data.hair_color,
          hairStyle: data.hair_style,
          faceStyle: data.face_style,
          shirtStyle: data.shirt_style,
          shirtColor: data.shirt_color,
          pantsStyle: data.pants_style,
          pantsColor: data.pants_color,
          houseStyle: data.house_style,
          displayName: data.display_name || user.user_metadata?.full_name || 'Player',
        });
      }
      setProfileLoading(false);
    };
    load();
  }, [user]);

  // ─── Save Profile ──────────────────────────────────
  const saveProfile = useCallback(async (p: SpatialProfile) => {
    if (!user) return;
    setProfile(p);
    const row = {
      user_id: user.id,
      skin_color: p.skinColor,
      hair_color: p.hairColor,
      hair_style: p.hairStyle,
      face_style: p.faceStyle,
      shirt_style: p.shirtStyle,
      shirt_color: p.shirtColor,
      pants_style: p.pantsStyle,
      pants_color: p.pantsColor,
      house_style: p.houseStyle,
      display_name: p.displayName,
    };
    await supabase.from('spatial_profiles').upsert(row, { onConflict: 'user_id' });
  }, [user]);

  // ─── Generate Village Layout ───────────────────────
  useEffect(() => {
    if (!user) return;
    const cx = WORLD_WIDTH / 2;
    const cy = WORLD_HEIGHT / 2;

    // Build houses
    const h: House[] = [];
    const colors = HOUSE_COLORS[profile?.houseStyle ?? 0];
    h.push({ x: cx, y: cy, ownerId: user.id, ownerName: 'You', style: profile?.houseStyle ?? 0, roofColor: colors.roof, wallColor: colors.wall });

    const ring = 280;
    friends.forEach((f, i) => {
      const angle = (i / Math.max(friends.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const fx = cx + Math.cos(angle) * ring * (1 + Math.floor(i / 8) * 0.6);
      const fy = cy + Math.sin(angle) * ring * (1 + Math.floor(i / 8) * 0.6);
      const hc = HOUSE_COLORS[i % HOUSE_COLORS.length];
      h.push({ x: fx, y: fy, ownerId: f.id, ownerName: f.full_name || f.username || 'Friend', style: i % 4, roofColor: hc.roof, wallColor: hc.wall });
    });
    setHouses(h);

    // Decorations
    const rng = seededRandom(42);
    const decs: WorldDecoration[] = [];
    for (let i = 0; i < 120; i++) {
      const dx = rng() * WORLD_WIDTH;
      const dy = rng() * WORLD_HEIGHT;
      // Skip if too close to any house
      if (h.some(house => Math.abs(house.x - dx) < 120 && Math.abs(house.y - dy) < 120)) continue;
      const types: WorldDecoration['type'][] = ['tree', 'flower', 'rock', 'bush', 'lamp'];
      decs.push({ x: dx, y: dy, type: types[Math.floor(rng() * 5)], variant: Math.floor(rng() * 3) });
    }
    setDecorations(decs);
  }, [user, friends, profile?.houseStyle]);

  // ─── Realtime Presence ─────────────────────────────
  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase.channel('auraville-world', {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const newPlayers = new Map<string, RemotePlayer>();
        Object.entries(state).forEach(([uid, presences]) => {
          if (uid === user.id) return;
          const p = (presences as any[])[0];
          if (!p) return;
          newPlayers.set(uid, {
            userId: uid,
            displayName: p.displayName || 'Player',
            position: p.position || { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, direction: 'down', isMoving: false },
            profile: p.profile || DEFAULT_PROFILE,
          });
        });
        setRemotePlayers(newPlayers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            position: positionRef.current,
            profile,
            displayName: profile.displayName,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, profile]);

  // ─── Broadcast position periodically ───────────────
  useEffect(() => {
    if (!channelRef.current || !profile) return;
    const iv = setInterval(() => {
      channelRef.current?.track({
        position: positionRef.current,
        profile,
        displayName: profile.displayName,
      });
    }, 100); // 10 updates/sec
    return () => clearInterval(iv);
  }, [profile]);

  // ─── Movement (game loop tick) ─────────────────────
  const updateMovement = useCallback(() => {
    const keys = keysRef.current;
    const joy = joystickRef.current;
    let dx = 0, dy = 0;

    // Keyboard
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) dy += 1;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx += 1;

    // Joystick
    if (Math.abs(joy.dx) > 0.1 || Math.abs(joy.dy) > 0.1) {
      dx += joy.dx;
      dy += joy.dy;
    }

    // Normalize diagonal
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx = (dx / len) * PLAYER_SPEED;
      dy = (dy / len) * PLAYER_SPEED;
    }

    const isMoving = len > 0;
    const pos = positionRef.current;
    const newX = Math.max(40, Math.min(WORLD_WIDTH - 40, pos.x + dx));
    const newY = Math.max(40, Math.min(WORLD_HEIGHT - 40, pos.y + dy));

    let direction = pos.direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left';
    } else if (dy !== 0) {
      direction = dy > 0 ? 'down' : 'up';
    }

    positionRef.current = { x: newX, y: newY, direction, isMoving };
    setPosition({ x: newX, y: newY, direction, isMoving });
  }, []);

  // ─── Keyboard listeners ────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        e.preventDefault();
        keysRef.current.add(e.key);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const setJoystick = useCallback((dx: number, dy: number) => {
    joystickRef.current = { dx, dy };
  }, []);

  return {
    profile,
    profileLoading,
    saveProfile,
    position,
    remotePlayers,
    houses,
    decorations,
    updateMovement,
    setJoystick,
    channelRef,
  };
}
