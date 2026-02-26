import { useRef, useEffect, useState, useCallback } from 'react';
import {
  PlayerPosition,
  RemotePlayer,
  SpatialProfile,
  House,
  HouseInterior,
  WorldDecoration,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TILE_SIZE,
  HEARING_DISTANCE,
  HOUSE_ENTER_DISTANCE,
  INTERIOR_WIDTH,
  INTERIOR_HEIGHT,
} from './gameTypes';
import { drawCharacter, roundRect, darkenColor, lightenColor } from './characterRenderer';
import { drawInterior, getInteriorBounds } from './interiorRenderer';

interface GameCanvasProps {
  position: PlayerPosition;
  profile: SpatialProfile;
  remotePlayers: Map<string, RemotePlayer>;
  houses: House[];
  decorations: WorldDecoration[];
  updateMovement: () => void;
  insideHouseId: string | null;
  onEnterHouse: (houseId: string) => void;
  onExitHouse: () => void;
}

// ─── World Drawing ──────────────────────────────────
function drawGrass(ctx: CanvasRenderingContext2D, camX: number, camY: number, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#4ade80');
  grad.addColorStop(0.5, '#3bcc6e');
  grad.addColorStop(1, '#34d399');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const startTX = Math.floor(camX / TILE_SIZE);
  const startTY = Math.floor(camY / TILE_SIZE);
  const endTX = startTX + Math.ceil(w / TILE_SIZE) + 1;
  const endTY = startTY + Math.ceil(h / TILE_SIZE) + 1;

  for (let tx = startTX; tx <= endTX; tx++) {
    for (let ty = startTY; ty <= endTY; ty++) {
      if (tx < 0 || ty < 0 || tx >= WORLD_WIDTH / TILE_SIZE || ty >= WORLD_HEIGHT / TILE_SIZE) continue;
      const sx = tx * TILE_SIZE - camX;
      const sy = ty * TILE_SIZE - camY;
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.025)';
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      }
      const seed = (tx * 73 + ty * 137) % 100;
      if (seed < 12) {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(sx + 12, sy + 8, 2, 5);
        ctx.fillRect(sx + 20, sy + 14, 2, 4);
      }
    }
  }
}

function drawHouse(ctx: CanvasRenderingContext2D, house: House, camX: number, camY: number, isNearby: boolean) {
  const x = house.x - camX;
  const y = house.y - camY;
  const w = 96, h = 70;

  // Ground pad
  ctx.fillStyle = 'rgba(139,115,85,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + h / 2 + 6, w / 2 + 20, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(x - w / 2 + 6, y + h / 2, w - 6, 8);

  // Walls with gradient
  const wallGrad = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
  wallGrad.addColorStop(0, house.wallColor);
  wallGrad.addColorStop(1, darkenColor(house.wallColor, 0.88));
  ctx.fillStyle = wallGrad;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Wall texture lines
  ctx.strokeStyle = 'rgba(0,0,0,0.03)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < h; i += 8) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - h / 2 + i);
    ctx.lineTo(x + w / 2, y - h / 2 + i);
    ctx.stroke();
  }

  // Roof with gradient and overhang
  const roofGrad = ctx.createLinearGradient(x, y - h / 2 - 40, x, y - h / 2 + 4);
  roofGrad.addColorStop(0, house.roofColor);
  roofGrad.addColorStop(1, darkenColor(house.roofColor, 0.82));
  ctx.fillStyle = roofGrad;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 16, y - h / 2 + 4);
  ctx.lineTo(x, y - h / 2 - 40);
  ctx.lineTo(x + w / 2 + 16, y - h / 2 + 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Roof shingle lines
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  for (let i = 0; i < 4; i++) {
    const ry = y - h / 2 - 30 + i * 10;
    const rw = (i + 1) * (w + 32) / 5;
    ctx.beginPath();
    ctx.moveTo(x - rw / 2, ry);
    ctx.lineTo(x + rw / 2, ry);
    ctx.stroke();
  }

  // Door
  const doorGrad = ctx.createLinearGradient(x - 10, y, x + 10, y + 30);
  doorGrad.addColorStop(0, '#8B5E3C');
  doorGrad.addColorStop(1, '#5C3A1E');
  ctx.fillStyle = doorGrad;
  roundRect(ctx, x - 10, y - 2, 20, 30, [5, 5, 0, 0]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Door panels
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.strokeRect(x - 7, y + 2, 14, 10);
  ctx.strokeRect(x - 7, y + 15, 14, 10);
  // Handle
  ctx.fillStyle = '#D4A017';
  ctx.beginPath(); ctx.arc(x + 6, y + 14, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.arc(x + 5.5, y + 13.5, 1, 0, Math.PI * 2); ctx.fill();

  // Windows
  [[-28, -12], [28, -12]].forEach(([wx, wy]) => {
    ctx.fillStyle = 'rgba(135,206,235,0.15)';
    ctx.beginPath(); ctx.arc(x + wx, y + wy, 15, 0, Math.PI * 2); ctx.fill();
    
    ctx.fillStyle = '#87CEEB';
    roundRect(ctx, x + wx - 10, y + wy - 10, 20, 20, 2);
    ctx.fill();
    // Reflection
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + wx - 8, y + wy - 8, 6, 6);
    // Frame
    ctx.strokeStyle = darkenColor(house.wallColor, 0.65);
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x + wx - 10, y + wy - 10, 20, 20);
    // Cross pane
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + wx, y + wy - 10); ctx.lineTo(x + wx, y + wy + 10);
    ctx.moveTo(x + wx - 10, y + wy); ctx.lineTo(x + wx + 10, y + wy);
    ctx.stroke();
    // Curtains
    ctx.fillStyle = 'rgba(220,200,180,0.5)';
    ctx.fillRect(x + wx - 9, y + wy - 9, 4, 18);
    ctx.fillRect(x + wx + 5, y + wy - 9, 4, 18);
  });

  // Chimney
  ctx.fillStyle = '#5C3A1E';
  roundRect(ctx, x + 20, y - h / 2 - 34, 14, 20, 2);
  ctx.fill();
  ctx.fillStyle = '#4A2E16';
  ctx.fillRect(x + 18, y - h / 2 - 36, 18, 5);
  // Smoke puffs
  ctx.fillStyle = 'rgba(200,200,200,0.2)';
  const smokeOff = Math.sin(Date.now() * 0.002) * 3;
  ctx.beginPath(); ctx.arc(x + 27 + smokeOff, y - h / 2 - 42, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 25 - smokeOff, y - h / 2 - 50, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 28, y - h / 2 - 57, 3, 0, Math.PI * 2); ctx.fill();

  // Flower box under window
  ctx.fillStyle = '#654321';
  ctx.fillRect(x - 38, y + 2, 20, 6);
  ctx.fillStyle = '#16a34a';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.arc(x - 36 + i * 5, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath(); ctx.arc(x - 34, y - 2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 24, y - 1, 2, 0, Math.PI * 2); ctx.fill();

  // Enter prompt when nearby
  if (isNearby) {
    const pulseAlpha = 0.6 + Math.sin(Date.now() * 0.005) * 0.3;
    ctx.fillStyle = `rgba(59,130,246,${pulseAlpha})`;
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    const promptText = 'Press E or Tap to Enter';
    const ptw = ctx.measureText(promptText).width;
    roundRect(ctx, x - ptw / 2 - 10, y - h / 2 - 56, ptw + 20, 20, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(promptText, x, y - h / 2 - 42);
  }

  // Name plate
  const name = house.ownerName;
  ctx.font = 'bold 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(name).width;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, x - tw / 2 - 8, y + h / 2 + 10, tw + 16, 18, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(name, x, y + h / 2 + 23);
}

function drawDecoration(ctx: CanvasRenderingContext2D, dec: WorldDecoration, camX: number, camY: number) {
  const x = dec.x - camX;
  const y = dec.y - camY;

  if (dec.type === 'tree') {
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath(); ctx.ellipse(x, y + 14, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
    // Trunk with bark texture
    const trunkGrad = ctx.createLinearGradient(x - 6, y, x + 6, y);
    trunkGrad.addColorStop(0, '#5D3A1A');
    trunkGrad.addColorStop(0.5, '#7B5B3A');
    trunkGrad.addColorStop(1, '#5D3A1A');
    ctx.fillStyle = trunkGrad;
    roundRect(ctx, x - 6, y - 10, 12, 26, 3);
    ctx.fill();
    // Bark lines
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x - 2, y - 6); ctx.lineTo(x - 3, y + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 2, y - 4); ctx.lineTo(x + 1, y + 10); ctx.stroke();
    // Multi-layer canopy
    const colors = ['#15803d', '#166534', '#14532d'];
    const base = colors[dec.variant];
    ctx.fillStyle = darkenColor(base, 0.9);
    ctx.beginPath(); ctx.arc(x, y - 16, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = base;
    ctx.beginPath(); ctx.arc(x - 5, y - 20, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 7, y - 14, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lightenColor(base, 1.15);
    ctx.beginPath(); ctx.arc(x - 2, y - 24, 11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5, y - 20, 8, 0, Math.PI * 2); ctx.fill();
    // Highlight shimmer
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.arc(x - 6, y - 26, 6, 0, Math.PI * 2); ctx.fill();
  } else if (dec.type === 'flower') {
    const flowerColors = ['#f43f5e', '#a855f7', '#f59e0b'];
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x - 1, y - 2, 2, 10);
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.ellipse(x - 3, y + 3, 3, 1.5, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = flowerColors[dec.variant];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(angle) * 3.5, y - 5 + Math.sin(angle) * 3.5, 2.8, 2, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(x, y - 5, 2.2, 0, Math.PI * 2); ctx.fill();
  } else if (dec.type === 'rock') {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.ellipse(x, y + 4, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    const rockGrad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, 14);
    rockGrad.addColorStop(0, '#C0C8D0');
    rockGrad.addColorStop(1, '#8A929A');
    ctx.fillStyle = rockGrad;
    ctx.beginPath(); ctx.ellipse(x, y, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.ellipse(x - 4, y - 4, 5, 3, -0.3, 0, Math.PI * 2); ctx.fill();
  } else if (dec.type === 'bush') {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + 7, 20, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.arc(x - 5, y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#15803d';
    ctx.beginPath(); ctx.arc(x + 8, y + 2, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.arc(x + 2, y - 5, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lightenColor('#22c55e', 1.1);
    ctx.beginPath(); ctx.arc(x - 1, y - 8, 5, 0, Math.PI * 2); ctx.fill();
    if (dec.variant === 0) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(x - 3, y - 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 6, y, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 1, y - 6, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (dec.type === 'lamp') {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath(); ctx.ellipse(x, y + 5, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#374151';
    roundRect(ctx, x - 3, y - 24, 6, 28, 2);
    ctx.fill();
    ctx.fillStyle = '#1f2937';
    roundRect(ctx, x - 9, y - 30, 18, 9, 4);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(x, y - 24, 4.5, 0, Math.PI * 2); ctx.fill();
    const glow = ctx.createRadialGradient(x, y - 24, 3, x, y - 24, 35);
    glow.addColorStop(0, 'rgba(251,191,36,0.14)');
    glow.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y - 24, 35, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPaths(ctx: CanvasRenderingContext2D, houses: House[], camX: number, camY: number) {
  if (houses.length < 2) return;
  const center = houses[0];

  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 28;
  ctx.lineCap = 'round';
  for (let i = 1; i < houses.length; i++) {
    ctx.beginPath();
    ctx.moveTo(center.x - camX, center.y + 35 - camY);
    ctx.lineTo(houses[i].x - camX, houses[i].y + 35 - camY);
    ctx.stroke();
  }

  ctx.strokeStyle = '#c9a05c';
  ctx.lineWidth = 24;
  for (let i = 1; i < houses.length; i++) {
    ctx.beginPath();
    ctx.moveTo(center.x - camX, center.y + 34 - camY);
    ctx.lineTo(houses[i].x - camX, houses[i].y + 34 - camY);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 8;
  for (let i = 1; i < houses.length; i++) {
    ctx.beginPath();
    ctx.moveTo(center.x - camX, center.y + 33 - camY);
    ctx.lineTo(houses[i].x - camX, houses[i].y + 33 - camY);
    ctx.stroke();
  }
}

function drawVoiceRange(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const pulse = 1 + Math.sin(frame * 0.03) * 0.02;
  const radius = HEARING_DISTANCE * pulse;

  ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  const rangeGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  rangeGrad.addColorStop(0, 'rgba(59, 130, 246, 0.04)');
  rangeGrad.addColorStop(0.7, 'rgba(59, 130, 246, 0.02)');
  rangeGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = rangeGrad;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  playerX: number,
  playerY: number,
  houses: House[],
  remotePlayers: Map<string, RemotePlayer>
) {
  const size = 130;
  const padding = 14;
  const mx = canvasW - size - padding;
  const my = padding;
  const scaleX = size / WORLD_WIDTH;
  const scaleY = size / WORLD_HEIGHT;

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, mx - 2, my - 2, size + 4, size + 4, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(74,222,128,0.3)';
  roundRect(ctx, mx, my, size, size, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  houses.forEach(h => {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    roundRect(ctx, mx + h.x * scaleX - 3, my + h.y * scaleY - 3, 6, 6, 1);
    ctx.fill();
  });

  remotePlayers.forEach(rp => {
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath(); ctx.arc(mx + rp.position.x * scaleX, my + rp.position.y * scaleY, 2.5, 0, Math.PI * 2); ctx.fill();
  });

  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.arc(mx + playerX * scaleX, my + playerY * scaleY, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(251,191,36,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MAP', mx + size / 2, my + size + 14);
}

// ─── Main Component ─────────────────────────────────
export const GameCanvas = ({
  position, profile, remotePlayers, houses, decorations,
  updateMovement, insideHouseId, onEnterHouse, onExitHouse
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  const posRef = useRef(position);
  const profileRef = useRef(profile);
  const remoteRef = useRef(remotePlayers);
  const housesRef = useRef(houses);
  const decsRef = useRef(decorations);
  const updateRef = useRef(updateMovement);
  const sizeRef = useRef({ w: 0, h: 0 });
  const insideRef = useRef(insideHouseId);
  const onEnterRef = useRef(onEnterHouse);
  const onExitRef = useRef(onExitHouse);
  // Interior player position (separate from world position)
  const interiorPosRef = useRef({ x: 0, y: 0 });

  posRef.current = position;
  profileRef.current = profile;
  remoteRef.current = remotePlayers;
  housesRef.current = houses;
  decsRef.current = decorations;
  updateRef.current = updateMovement;
  insideRef.current = insideHouseId;
  onEnterRef.current = onEnterHouse;
  onExitRef.current = onExitHouse;

  // Handle enter key for house entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') {
        if (insideRef.current) {
          // Check if near exit door
          const w = sizeRef.current.w;
          const h = sizeRef.current.h;
          const bounds = getInteriorBounds(w, h);
          const ip = interiorPosRef.current;
          if (ip.y > bounds.maxY - 30) {
            onExitRef.current();
          }
        } else {
          // Check if near any house door
          const pos = posRef.current;
          for (const house of housesRef.current) {
            const dist = Math.sqrt((pos.x - house.x) ** 2 + (pos.y - house.y) ** 2);
            if (dist < HOUSE_ENTER_DISTANCE) {
              onEnterRef.current(house.ownerId);
              // Reset interior position to center
              const w = sizeRef.current.w;
              const h = sizeRef.current.h;
              interiorPosRef.current = {
                x: (w - INTERIOR_WIDTH) / 2 + INTERIOR_WIDTH / 2,
                y: (h - INTERIOR_HEIGHT) / 2 + INTERIOR_HEIGHT / 2 - 30
              };
              break;
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle canvas click for mobile house entry
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.changedTouches[0].clientY : e.clientY;
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;

      if (insideRef.current) {
        // Check exit door click
        const w = sizeRef.current.w;
        const h = sizeRef.current.h;
        const ox = (w - INTERIOR_WIDTH) / 2;
        const oy = (h - INTERIOR_HEIGHT) / 2;
        const doorX = ox + INTERIOR_WIDTH / 2;
        const doorY = oy + INTERIOR_HEIGHT + 5;
        if (Math.abs(cx - doorX) < 25 && Math.abs(cy - doorY) < 20) {
          onExitRef.current();
        }
      } else {
        // Check house click
        const pos = posRef.current;
        const camX = pos.x - sizeRef.current.w / 2;
        const camY = pos.y - sizeRef.current.h / 2;
        for (const house of housesRef.current) {
          const hx = house.x - camX;
          const hy = house.y - camY;
          if (Math.abs(cx - hx) < 50 && Math.abs(cy - hy) < 45) {
            const dist = Math.sqrt((pos.x - house.x) ** 2 + (pos.y - house.y) ** 2);
            if (dist < HOUSE_ENTER_DISTANCE) {
              onEnterRef.current(house.ownerId);
              const w = sizeRef.current.w;
              const h = sizeRef.current.h;
              interiorPosRef.current = {
                x: (w - INTERIOR_WIDTH) / 2 + INTERIOR_WIDTH / 2,
                y: (h - INTERIOR_HEIGHT) / 2 + INTERIOR_HEIGHT / 2 - 30
              };
              break;
            }
          }
        }
      }
    };
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchend', handleClick);
    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchend', handleClick);
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      sizeRef.current = { w: rect.width, h: rect.height };
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Game loop
  useEffect(() => {
    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(tick); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

      const dpr = window.devicePixelRatio || 1;
      const w = sizeRef.current.w || canvas.width / dpr;
      const h = sizeRef.current.h || canvas.height / dpr;

      frameRef.current++;
      updateRef.current();

      ctx.save();
      ctx.scale(dpr, dpr);

      const pos = posRef.current;
      const prof = profileRef.current;
      const remote = remoteRef.current;
      const houseList = housesRef.current;
      const decList = decsRef.current;
      const inside = insideRef.current;

      if (inside) {
        // ─── Interior Mode ────────────────────────────
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        const house = houseList.find(h => h.ownerId === inside);
        const interior: HouseInterior = {
          houseId: inside,
          ownerName: house?.ownerName || 'Unknown',
          width: INTERIOR_WIDTH,
          height: INTERIOR_HEIGHT,
          style: house?.style || 0,
        };

        drawInterior(ctx, interior, w, h, frameRef.current);

        // Move interior player
        const bounds = getInteriorBounds(w, h);
        const ip = interiorPosRef.current;
        // Apply movement from the game's key state
        const speed = 2.5;
        let dx = 0, dy = 0;
        // We read movement from the position delta
        if (pos.isMoving) {
          if (pos.direction === 'up') dy = -speed;
          if (pos.direction === 'down') dy = speed;
          if (pos.direction === 'left') dx = -speed;
          if (pos.direction === 'right') dx = speed;
        }
        interiorPosRef.current = {
          x: Math.max(bounds.minX, Math.min(bounds.maxX, ip.x + dx)),
          y: Math.max(bounds.minY, Math.min(bounds.maxY, ip.y + dy)),
        };

        // Draw character in interior
        drawCharacter(ctx, interiorPosRef.current.x, interiorPosRef.current.y, prof, pos.direction, pos.isMoving, frameRef.current, 2.2);

        // Draw other players inside same house
        remote.forEach(rp => {
          if (rp.insideHouseId === inside) {
            // Place them at a relative position in the room
            const rpx = (w - INTERIOR_WIDTH) / 2 + INTERIOR_WIDTH / 2 + (Math.sin(rp.userId.charCodeAt(0)) * 60);
            const rpy = (h - INTERIOR_HEIGHT) / 2 + INTERIOR_HEIGHT / 2 + (Math.cos(rp.userId.charCodeAt(1)) * 30);
            drawCharacter(ctx, rpx, rpy, rp.profile, rp.position.direction, rp.position.isMoving, frameRef.current, 2.2);
            // Name
            ctx.font = 'bold 10px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            const tw = ctx.measureText(rp.displayName).width;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            roundRect(ctx, rpx - tw / 2 - 6, rpy - 36, tw + 12, 16, 5);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText(rp.displayName, rpx, rpy - 24);
          }
        });

        // Interior HUD
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        roundRect(ctx, 10, h - 35, 200, 25, 6);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '11px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Press E or tap EXIT to leave', 20, h - 18);

      } else {
        // ─── Outdoor Mode ─────────────────────────────
        const camX = pos.x - w / 2;
        const camY = pos.y - h / 2;

        ctx.fillStyle = '#1a3320';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.beginPath();
        ctx.rect(
          Math.max(0, -camX),
          Math.max(0, -camY),
          Math.min(w, WORLD_WIDTH - Math.max(0, camX)),
          Math.min(h, WORLD_HEIGHT - Math.max(0, camY))
        );
        ctx.clip();
        drawGrass(ctx, camX, camY, w, h);
        ctx.restore();

        drawPaths(ctx, houseList, camX, camY);
        drawVoiceRange(ctx, pos.x - camX, pos.y - camY, frameRef.current);

        type Drawable = { y: number; draw: () => void };
        const drawables: Drawable[] = [];

        houseList.forEach(house => {
          const dist = Math.sqrt((pos.x - house.x) ** 2 + (pos.y - house.y) ** 2);
          const isNearby = dist < HOUSE_ENTER_DISTANCE;
          drawables.push({ y: house.y + 35, draw: () => drawHouse(ctx, house, camX, camY, isNearby) });
        });

        decList.forEach(dec => {
          drawables.push({ y: dec.y, draw: () => drawDecoration(ctx, dec, camX, camY) });
        });

        remote.forEach(rp => {
          if (rp.insideHouseId) return; // Don't show players inside houses
          drawables.push({
            y: rp.position.y,
            draw: () => {
              drawCharacter(ctx, rp.position.x - camX, rp.position.y - camY, rp.profile, rp.position.direction, rp.position.isMoving, frameRef.current);
              const labelX = rp.position.x - camX;
              const labelY = rp.position.y - camY - 32;
              ctx.font = 'bold 11px "Segoe UI", sans-serif';
              ctx.textAlign = 'center';
              const tw = ctx.measureText(rp.displayName).width;
              ctx.fillStyle = 'rgba(0,0,0,0.65)';
              roundRect(ctx, labelX - tw / 2 - 7, labelY - 9, tw + 14, 18, 6);
              ctx.fill();
              ctx.fillStyle = '#fff';
              ctx.fillText(rp.displayName, labelX, labelY + 4);

              const dist = Math.sqrt((pos.x - rp.position.x) ** 2 + (pos.y - rp.position.y) ** 2);
              if (dist < HEARING_DISTANCE) {
                const vol = 1 - dist / HEARING_DISTANCE;
                ctx.fillStyle = `rgba(59,130,246,${vol * 0.7})`;
                ctx.beginPath(); ctx.arc(rp.position.x - camX, rp.position.y - camY - 44, 5, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = `rgba(59,130,246,${vol * 0.35})`;
                ctx.lineWidth = 1.2;
                for (let i = 1; i <= 3; i++) {
                  ctx.beginPath();
                  ctx.arc(rp.position.x - camX, rp.position.y - camY - 44, 5 + i * 5, -Math.PI * 0.35, Math.PI * 0.35);
                  ctx.stroke();
                }
              }
            },
          });
        });

        drawables.push({
          y: pos.y,
          draw: () => {
            drawCharacter(ctx, pos.x - camX, pos.y - camY, prof, pos.direction, pos.isMoving, frameRef.current);
            ctx.font = 'bold 11px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            const labelY = pos.y - camY - 32;
            const tw = ctx.measureText(prof.displayName).width;
            ctx.fillStyle = 'rgba(180,130,20,0.75)';
            roundRect(ctx, pos.x - camX - tw / 2 - 7, labelY - 9, tw + 14, 18, 6);
            ctx.fill();
            ctx.strokeStyle = 'rgba(251,191,36,0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.fillText(prof.displayName, pos.x - camX, labelY + 4);
          },
        });

        drawables.sort((a, b) => a.y - b.y);
        drawables.forEach(d => d.draw());

        drawMinimap(ctx, w, h, pos.x, pos.y, houseList, remote);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ imageRendering: 'auto', cursor: 'default' }}
      tabIndex={0}
    />
  );
};
