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

// ─── Interpolation target store for smooth remote movement ───
interface InterpolatedPlayer {
  current: PlayerPosition;
  target: PlayerPosition;
  displayName: string;
  profile: SpatialProfile;
  insideHouseId?: string | null;
  lastUpdate: number;
}

export function useAuraVille() {
  const { user } = useAuth();
  const { friends } = useFriends();
  const [profile, setProfile] = useState<SpatialProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  // remotePlayers state is throttled — only updated ~10x/sec for React consumers
  const [remotePlayers, setRemotePlayers] = useState<Map<string, RemotePlayer>>(new Map());
  const [houses, setHouses] = useState<House[]>([]);
  const [decorations, setDecorations] = useState<WorldDecoration[]>([]);
  const positionRef = useRef<PlayerPosition>({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, direction: 'down', isMoving: false });
  const [position, setPosition] = useState<PlayerPosition>(positionRef.current);
  const channelRef = useRef<any>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  
  // Smooth interpolation store (updated every frame, never triggers React render)
  const interpRef = useRef<Map<string, InterpolatedPlayer>>(new Map());
  // Snapshot for React consumers, updated at throttled rate
  const lastStateUpdateRef = useRef(0);
  const STATE_UPDATE_INTERVAL = 100; // ms — ~10 updates/sec for React state

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
          bodyType: (data as any).body_type || 'male',
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
      body_type: p.bodyType,
    };
    await supabase.from('spatial_profiles').upsert(row, { onConflict: 'user_id' });
  }, [user]);

  // ─── Generate Grid Village Layout ─────────────────
  useEffect(() => {
    if (!user) return;

    const allPlayers = [
      { id: user.id, name: 'You', style: profile?.houseStyle ?? 0 },
      ...friends.map((f, i) => ({
        id: f.id,
        name: f.full_name || f.username || 'Friend',
        style: i % 4,
      })),
    ];

    // Grid neighborhood layout
    const HOUSE_SPACING_X = 220;
    const HOUSE_SPACING_Y = 200;
    const COLS = Math.max(2, Math.ceil(Math.sqrt(allPlayers.length)));
    
    // Center the grid in the world
    const gridW = COLS * HOUSE_SPACING_X;
    const gridH = Math.ceil(allPlayers.length / COLS) * HOUSE_SPACING_Y;
    const startX = (WORLD_WIDTH - gridW) / 2 + HOUSE_SPACING_X / 2;
    const startY = (WORLD_HEIGHT - gridH) / 2 + HOUSE_SPACING_Y / 2;

    const h: House[] = allPlayers.map((p, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const xOffset = col * HOUSE_SPACING_X;
      const yOffset = row * HOUSE_SPACING_Y;
      // Slight random offset for organic feel
      const rng = seededRandom(p.id.charCodeAt(0) * 100 + p.id.charCodeAt(1));
      const jitterX = (rng() - 0.5) * 30;
      const jitterY = (rng() - 0.5) * 20;
      
      const hc = HOUSE_COLORS[p.style % HOUSE_COLORS.length];
      return {
        x: startX + xOffset + jitterX,
        y: startY + yOffset + jitterY,
        ownerId: p.id,
        ownerName: p.name,
        style: p.style,
        roofColor: hc.roof,
        wallColor: hc.wall,
      };
    });
    setHouses(h);

    // Set player spawn near their house
    if (h.length > 0) {
      const myHouse = h[0];
      positionRef.current = { x: myHouse.x, y: myHouse.y + 80, direction: 'down', isMoving: false };
      setPosition(positionRef.current);
    }

    // Decorations — fill empty areas
    const rng = seededRandom(42);
    const decs: WorldDecoration[] = [];
    for (let i = 0; i < 150; i++) {
      const dx = rng() * WORLD_WIDTH;
      const dy = rng() * WORLD_HEIGHT;
      if (h.some(house => Math.abs(house.x - dx) < 130 && Math.abs(house.y - dy) < 130)) continue;
      const types: WorldDecoration['type'][] = ['tree', 'flower', 'rock', 'bush', 'lamp'];
      decs.push({ x: dx, y: dy, type: types[Math.floor(rng() * 5)], variant: Math.floor(rng() * 3) });
    }
    setDecorations(decs);
  }, [user, friends, profile?.houseStyle]);

  // ─── Realtime Presence with Smooth Interpolation ───
  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase.channel('auraville-world', {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const now = Date.now();
        const interp = interpRef.current;
        
        Object.entries(state).forEach(([uid, presences]) => {
          if (uid === user.id) return;
          const p = (presences as any[])[0];
          if (!p) return;
          
          const targetPos = p.position || { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, direction: 'down', isMoving: false };
          const existing = interp.get(uid);
          
          if (existing) {
            existing.target = targetPos;
            existing.displayName = p.displayName || 'Player';
            existing.profile = p.profile || DEFAULT_PROFILE;
            existing.lastUpdate = now;
          } else {
            interp.set(uid, {
              current: { ...targetPos },
              target: targetPos,
              displayName: p.displayName || 'Player',
              profile: p.profile || DEFAULT_PROFILE,
              lastUpdate: now,
            });
          }
        });
        
        // Remove players no longer present
        const presentIds = new Set(Object.keys(state));
        interp.forEach((_, uid) => {
          if (uid !== user.id && !presentIds.has(uid)) interp.delete(uid);
        });
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
    }, 80); // 12.5 updates/sec for smoother sync
    return () => clearInterval(iv);
  }, [profile]);

  // ─── Interpolation tick (runs every frame via game loop) ───
  // This updates the interp ref without triggering React renders.
  // React state is only updated at a throttled rate for consumers like useProximityVoice.
  const interpolateRemotePlayers = useCallback(() => {
    const LERP_SPEED = 0.15;
    const interp = interpRef.current;
    
    interp.forEach((player) => {
      player.current.x += (player.target.x - player.current.x) * LERP_SPEED;
      player.current.y += (player.target.y - player.current.y) * LERP_SPEED;
      player.current.direction = player.target.direction;
      player.current.isMoving = player.target.isMoving;
    });
    
    // Throttled React state update for non-canvas consumers
    const now = Date.now();
    if (now - lastStateUpdateRef.current >= STATE_UPDATE_INTERVAL) {
      lastStateUpdateRef.current = now;
      const newMap = new Map<string, RemotePlayer>();
      interp.forEach((player, uid) => {
        newMap.set(uid, {
          userId: uid,
          displayName: player.displayName,
          position: { ...player.current },
          profile: player.profile,
          insideHouseId: player.insideHouseId,
        });
      });
      setRemotePlayers(newMap);
    }
  }, []);

  // ─── Build snapshot for canvas (ref-based, no React overhead) ───
  const getRemotePlayersSnapshot = useCallback((): Map<string, RemotePlayer> => {
    const interp = interpRef.current;
    const snap = new Map<string, RemotePlayer>();
    interp.forEach((player, uid) => {
      snap.set(uid, {
        userId: uid,
        displayName: player.displayName,
        position: { ...player.current },
        profile: player.profile,
        insideHouseId: player.insideHouseId,
      });
    });
    return snap;
  }, []);

  // Track whether player is inside a house (ref for game loop access)
  const insideHouseRef = useRef<string | null>(null);
  const setInsideHouse = useCallback((id: string | null) => {
    insideHouseRef.current = id;
  }, []);

  // ─── Movement (game loop tick) ─────────────────────
  const updateMovement = useCallback(() => {
    const keys = keysRef.current;
    const joy = joystickRef.current;
    let dx = 0, dy = 0;

    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) dy += 1;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx += 1;

    if (Math.abs(joy.dx) > 0.1 || Math.abs(joy.dy) > 0.1) {
      dx += joy.dx;
      dy += joy.dy;
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx = (dx / len) * PLAYER_SPEED;
      dy = (dy / len) * PLAYER_SPEED;
    }

    const isMoving = len > 0;

    let direction = positionRef.current.direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left';
    } else if (dy !== 0) {
      direction = dy > 0 ? 'down' : 'up';
    }

    // When inside a house, freeze world position but still track direction/movement
    // so the interior renderer can use it for indoor movement
    if (insideHouseRef.current) {
      positionRef.current = { ...positionRef.current, direction, isMoving };
      setPosition({ ...positionRef.current });
    } else {
      const pos = positionRef.current;
      const newX = Math.max(40, Math.min(WORLD_WIDTH - 40, pos.x + dx));
      const newY = Math.max(40, Math.min(WORLD_HEIGHT - 40, pos.y + dy));
      positionRef.current = { x: newX, y: newY, direction, isMoving };
      setPosition({ x: newX, y: newY, direction, isMoving });
    }
    
    // Interpolate remote players every frame
    interpolateRemotePlayers();
  }, [interpolateRemotePlayers]);

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
    getRemotePlayersSnapshot,
    setInsideHouse,
  };
}