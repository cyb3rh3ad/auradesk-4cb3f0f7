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
import { PlacedFurniture } from './furnitureTypes';
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
  furniture?: PlacedFurniture[];
  getRemotePlayersSnapshot?: () => Map<string, RemotePlayer>;
}

// ─── Ambient Particle System ────────────────────────
interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number; life: number; maxLife: number;
  type: 'leaf' | 'butterfly' | 'firefly' | 'dust';
  color: string; angle: number;
}

function createParticle(camX: number, camY: number, w: number, h: number, type: Particle['type']): Particle {
  const colors: Record<string, string[]> = {
    leaf: ['#4ade80', '#22c55e', '#f59e0b', '#ef4444'],
    butterfly: ['#a855f7', '#ec4899', '#3b82f6', '#f59e0b'],
    firefly: ['#fbbf24', '#fde68a'],
    dust: ['#fff', '#fef3c7'],
  };
  const c = colors[type];
  return {
    x: camX + Math.random() * w,
    y: camY + Math.random() * h,
    vx: (Math.random() - 0.5) * 0.4,
    vy: type === 'leaf' ? Math.random() * 0.3 + 0.1 : (Math.random() - 0.5) * 0.2,
    size: type === 'butterfly' ? 3 + Math.random() * 2 : type === 'firefly' ? 2 + Math.random() : 1 + Math.random(),
    alpha: 0.3 + Math.random() * 0.5,
    life: 0,
    maxLife: 200 + Math.random() * 300,
    type,
    color: c[Math.floor(Math.random() * c.length)],
    angle: Math.random() * Math.PI * 2,
  };
}

// ─── Day/Night Cycle ────────────────────────────────
function getDayNightOverlay(frame: number): { overlay: string; skyTint: string; isNight: boolean } {
  // One full cycle = ~10 minutes (36000 frames at 60fps)
  const cycleLen = 36000;
  const t = (frame % cycleLen) / cycleLen; // 0-1
  // 0-0.25 = dawn, 0.25-0.5 = day, 0.5-0.75 = dusk, 0.75-1 = night
  let overlay: string;
  let skyTint: string;
  let isNight = false;
  if (t < 0.2) { // dawn
    const d = t / 0.2;
    overlay = `rgba(20,10,40,${0.25 * (1 - d)})`;
    skyTint = `rgba(255,180,100,${0.08 * (1 - d)})`;
  } else if (t < 0.55) { // day
    overlay = 'rgba(0,0,0,0)';
    skyTint = 'rgba(0,0,0,0)';
  } else if (t < 0.75) { // dusk
    const d = (t - 0.55) / 0.2;
    overlay = `rgba(40,20,60,${0.15 * d})`;
    skyTint = `rgba(255,100,50,${0.06 * d})`;
  } else { // night
    isNight = true;
    overlay = 'rgba(10,10,30,0.3)';
    skyTint = 'rgba(20,20,60,0.1)';
  }
  return { overlay, skyTint, isNight };
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
      // Extra grass detail
      if (seed > 85) {
        ctx.fillStyle = 'rgba(34,197,94,0.4)';
        ctx.fillRect(sx + 6, sy + 20, 1, 4);
        ctx.fillRect(sx + 24, sy + 4, 1, 3);
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

  // Find grid structure: identify rows
  const sorted = [...houses].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: House[][] = [];
  let currentRow: House[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].y - currentRow[0].y) < 100) {
      currentRow.push(sorted[i]);
    } else {
      rows.push(currentRow);
      currentRow = [sorted[i]];
    }
  }
  rows.push(currentRow);

  const ROAD_W = 36;
  
  // Draw horizontal roads between rows
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 1) continue;
    const minX = Math.min(...row.map(h => h.x)) - 80;
    const maxX = Math.max(...row.map(h => h.x)) + 80;
    const roadY = row[0].y + 50;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(minX - camX, roadY - ROAD_W / 2 - camY + 2, maxX - minX, ROAD_W + 4);
    // Road surface
    ctx.fillStyle = '#9E8E7E';
    ctx.fillRect(minX - camX, roadY - ROAD_W / 2 - camY, maxX - minX, ROAD_W);
    // Center line (dashed)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(minX - camX, roadY - camY);
    ctx.lineTo(maxX - camX, roadY - camY);
    ctx.stroke();
    ctx.setLineDash([]);
    // Edge lines
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(minX - camX, roadY - ROAD_W / 2 - camY);
    ctx.lineTo(maxX - camX, roadY - ROAD_W / 2 - camY);
    ctx.moveTo(minX - camX, roadY + ROAD_W / 2 - camY);
    ctx.lineTo(maxX - camX, roadY + ROAD_W / 2 - camY);
    ctx.stroke();
  }

  // Draw vertical connectors between row roads
  if (rows.length >= 2) {
    const midX = houses.reduce((s, h) => s + h.x, 0) / houses.length;
    for (let r = 0; r < rows.length - 1; r++) {
      const y1 = rows[r][0].y + 50 + ROAD_W / 2;
      const y2 = rows[r + 1][0].y + 50 - ROAD_W / 2;
      ctx.fillStyle = '#9E8E7E';
      ctx.fillRect(midX - ROAD_W / 2 - camX, y1 - camY, ROAD_W, y2 - y1);
      // Center line
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(midX - camX, y1 - camY);
      ctx.lineTo(midX - camX, y2 - camY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Driveways from houses to road
  houses.forEach(house => {
    const roadY = house.y + 50;
    ctx.fillStyle = '#B5A595';
    ctx.fillRect(house.x - 8 - camX, house.y + 35 - camY, 16, roadY - ROAD_W / 2 - house.y - 35);
  });
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

// ─── Furniture Drawing ──────────────────────────────
function drawFurnitureItem(ctx: CanvasRenderingContext2D, f: PlacedFurniture, ox: number, oy: number) {
  const x = ox + f.x;
  const y = oy + f.y;

  ctx.save();
  switch (f.furnitureType) {
    case 'sofa':
      ctx.fillStyle = '#5D3A1A'; roundRect(ctx, x, y, 80, 28, 4); ctx.fill();
      ctx.fillStyle = '#B22222'; roundRect(ctx, x + 3, y + 3, 74, 22, 3); ctx.fill();
      break;
    case 'armchair':
      ctx.fillStyle = '#5D3A1A'; roundRect(ctx, x, y, 28, 28, 4); ctx.fill();
      ctx.fillStyle = '#336699'; roundRect(ctx, x + 3, y + 3, 22, 22, 3); ctx.fill();
      break;
    case 'coffee_table':
      ctx.fillStyle = '#654321'; roundRect(ctx, x, y, 44, 18, 3); ctx.fill();
      ctx.fillStyle = '#7B5B3A'; roundRect(ctx, x + 2, y + 2, 40, 14, 2); ctx.fill();
      break;
    case 'tv_stand':
      ctx.fillStyle = '#333'; roundRect(ctx, x, y, 50, 10, 2); ctx.fill();
      ctx.fillStyle = '#111'; roundRect(ctx, x + 10, y - 16, 30, 16, 2); ctx.fill();
      ctx.fillStyle = '#1a1a3e'; roundRect(ctx, x + 12, y - 14, 26, 12, 1); ctx.fill();
      break;
    case 'bookshelf':
      ctx.fillStyle = '#5D3A1A'; roundRect(ctx, x, y, 12, 50, 1); ctx.fill();
      const bkColors = ['#B22222', '#4169E1', '#228B22', '#FFD700'];
      for (let i = 0; i < 4; i++) { ctx.fillStyle = bkColors[i]; ctx.fillRect(x + 2, y + 3 + i * 12, 8, 9); }
      break;
    case 'floor_lamp':
      ctx.fillStyle = '#444'; ctx.fillRect(x + 3, y + 5, 3, 28);
      ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(x + 4.5, y + 3, 6, 0, Math.PI * 2); ctx.fill();
      break;
    case 'bed_single':
      ctx.fillStyle = '#8B7355'; roundRect(ctx, x, y, 36, 50, 3); ctx.fill();
      ctx.fillStyle = '#4169E1'; roundRect(ctx, x + 2, y + 2, 32, 38, 2); ctx.fill();
      ctx.fillStyle = '#FFF'; roundRect(ctx, x + 5, y + 3, 16, 10, 3); ctx.fill();
      break;
    case 'bed_double':
      ctx.fillStyle = '#8B7355'; roundRect(ctx, x, y, 56, 50, 3); ctx.fill();
      ctx.fillStyle = '#4169E1'; roundRect(ctx, x + 2, y + 2, 52, 38, 2); ctx.fill();
      ctx.fillStyle = '#FFF'; roundRect(ctx, x + 5, y + 3, 18, 10, 3); ctx.fill();
      ctx.fillStyle = '#FFF'; roundRect(ctx, x + 30, y + 3, 18, 10, 3); ctx.fill();
      break;
    case 'nightstand':
      ctx.fillStyle = '#5D3A1A'; roundRect(ctx, x, y, 16, 16, 2); ctx.fill();
      ctx.fillStyle = '#D4A017'; ctx.beginPath(); ctx.arc(x + 8, y + 8, 1.5, 0, Math.PI * 2); ctx.fill();
      break;
    case 'dresser':
      ctx.fillStyle = '#5D3A1A'; roundRect(ctx, x, y, 34, 22, 2); ctx.fill();
      ctx.fillStyle = '#7B5B3A';
      for (let d = 0; d < 3; d++) ctx.fillRect(x + 2 + d * 10, y + 3, 9, 7);
      for (let d = 0; d < 3; d++) ctx.fillRect(x + 2 + d * 10, y + 12, 9, 7);
      break;
    case 'counter':
      ctx.fillStyle = '#5D3A1A'; ctx.fillRect(x, y, 60, 18);
      ctx.fillStyle = '#D2B48C'; ctx.fillRect(x + 1, y + 1, 58, 12);
      break;
    case 'stove':
      ctx.fillStyle = '#333'; roundRect(ctx, x, y, 24, 12, 1); ctx.fill();
      ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x + 8, y + 6, 3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 18, y + 6, 3, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'fridge':
      ctx.fillStyle = '#E8E8E8'; roundRect(ctx, x, y, 20, 36, 2); ctx.fill();
      ctx.strokeStyle = '#CCC'; ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, 18, 15);
      ctx.strokeRect(x + 1, y + 17, 18, 18);
      break;
    case 'dining_table':
      ctx.fillStyle = '#654321'; roundRect(ctx, x, y, 40, 28, 3); ctx.fill();
      ctx.fillStyle = '#7B5B3A'; roundRect(ctx, x + 2, y + 2, 36, 24, 2); ctx.fill();
      break;
    case 'toilet':
      ctx.fillStyle = '#F0F0F0'; roundRect(ctx, x, y, 16, 22, 3); ctx.fill();
      ctx.fillStyle = '#E8E8E8'; ctx.fillRect(x + 1, y, 14, 6);
      break;
    case 'bathtub':
      ctx.fillStyle = '#E8E8E8'; roundRect(ctx, x, y, 48, 26, 4); ctx.fill();
      ctx.fillStyle = 'rgba(135,206,250,0.3)'; roundRect(ctx, x + 3, y + 3, 42, 20, 3); ctx.fill();
      break;
    case 'plant_tall':
      ctx.fillStyle = '#654321'; roundRect(ctx, x + 4, y + 8, 6, 6, 1); ctx.fill();
      ctx.fillStyle = '#16a34a';
      ctx.beginPath(); ctx.arc(x + 7, y + 4, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 4, y + 6, 4, 0, Math.PI * 2); ctx.fill();
      break;
    case 'plant_small':
      ctx.fillStyle = '#654321'; roundRect(ctx, x + 2, y + 5, 6, 5, 1); ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath(); ctx.arc(x + 5, y + 3, 4, 0, Math.PI * 2); ctx.fill();
      break;
    case 'rug_round':
      ctx.fillStyle = 'rgba(139,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(x + 30, y + 20, 30, 20, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'fireplace':
      ctx.fillStyle = '#654321'; roundRect(ctx, x, y, 40, 20, 2); ctx.fill();
      ctx.fillStyle = '#333'; roundRect(ctx, x + 5, y + 4, 30, 14, 2); ctx.fill();
      ctx.fillStyle = '#FF6B35'; ctx.beginPath(); ctx.arc(x + 20, y + 12, 5, 0, Math.PI * 2); ctx.fill();
      break;
    default:
      // Generic box for unrecognized types
      ctx.fillStyle = 'rgba(100,100,100,0.3)';
      roundRect(ctx, x, y, 20, 20, 2); ctx.fill();
      break;
  }
  ctx.restore();
}

// ─── Main Component ─────────────────────────────────
export const GameCanvas = ({
  position, profile, remotePlayers, houses, decorations,
  updateMovement, insideHouseId, onEnterHouse, onExitHouse, furniture = [],
  getRemotePlayersSnapshot,
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
  const furnitureRef = useRef(furniture);
  const snapshotRef = useRef(getRemotePlayersSnapshot);

  // Smooth camera position (lerp-based follow)
  const camRef = useRef({ x: 0, y: 0 });
  // Particles
  const particlesRef = useRef<Particle[]>([]);
  // Transition state for house entry/exit
  const transitionRef = useRef({ active: false, alpha: 0, direction: 'in' as 'in' | 'out', callback: null as (() => void) | null });

  posRef.current = position;
  profileRef.current = profile;
  remoteRef.current = remotePlayers;
  housesRef.current = houses;
  decsRef.current = decorations;
  updateRef.current = updateMovement;
  insideRef.current = insideHouseId;
  onEnterRef.current = onEnterHouse;
  onExitRef.current = onExitHouse;
  furnitureRef.current = furniture;
  snapshotRef.current = getRemotePlayersSnapshot;

  // Wrapped enter/exit with fade transitions
  const enterHouseWithTransition = useCallback((houseId: string) => {
    transitionRef.current = { active: true, alpha: 0, direction: 'in', callback: () => {
      onEnterRef.current(houseId);
      const w = sizeRef.current.w;
      const h = sizeRef.current.h;
      interiorPosRef.current = {
        x: (w - INTERIOR_WIDTH) / 2 + INTERIOR_WIDTH / 2,
        y: (h - INTERIOR_HEIGHT) / 2 + INTERIOR_HEIGHT / 2 - 30
      };
      // Fade back out
      transitionRef.current = { active: true, alpha: 1, direction: 'out', callback: null };
    }};
  }, []);

  const exitHouseWithTransition = useCallback(() => {
    transitionRef.current = { active: true, alpha: 0, direction: 'in', callback: () => {
      onExitRef.current();
      transitionRef.current = { active: true, alpha: 1, direction: 'out', callback: null };
    }};
  }, []);

  // Handle enter key for house entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') {
        if (insideRef.current) {
          const w = sizeRef.current.w;
          const h = sizeRef.current.h;
          const bounds = getInteriorBounds(w, h);
          const ip = interiorPosRef.current;
          if (ip.y > bounds.maxY - 30) {
            exitHouseWithTransition();
          }
        } else {
          const pos = posRef.current;
          for (const house of housesRef.current) {
            const dist = Math.sqrt((pos.x - house.x) ** 2 + (pos.y - house.y) ** 2);
            if (dist < HOUSE_ENTER_DISTANCE) {
              enterHouseWithTransition(house.ownerId);
              break;
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enterHouseWithTransition, exitHouseWithTransition]);

  // Handle canvas click/tap for house entry (unified handler prevents double-fire)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let lastInteractionTime = 0;
    
    const handleInteraction = (e: MouseEvent | TouchEvent) => {
      // Debounce: ignore events within 300ms of each other (prevents click+touchend double-fire)
      const now = Date.now();
      if (now - lastInteractionTime < 300) return;
      lastInteractionTime = now;

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
          exitHouseWithTransition();
        }
      } else {
        // Check house click
        const pos = posRef.current;
        const cam = camRef.current;
        for (const house of housesRef.current) {
          const hx = house.x - cam.x;
          const hy = house.y - cam.y;
          if (Math.abs(cx - hx) < 50 && Math.abs(cy - hy) < 45) {
            const dist = Math.sqrt((pos.x - house.x) ** 2 + (pos.y - house.y) ** 2);
            if (dist < HOUSE_ENTER_DISTANCE) {
              enterHouseWithTransition(house.ownerId);
              break;
            }
          }
        }
      }
    };
    canvas.addEventListener('click', handleInteraction);
    canvas.addEventListener('touchend', handleInteraction);
    return () => {
      canvas.removeEventListener('click', handleInteraction);
      canvas.removeEventListener('touchend', handleInteraction);
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
      // Use snapshot for frame-accurate interpolated positions (avoids throttled React state)
      const remote = snapshotRef.current ? snapshotRef.current() : remoteRef.current;
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

        // Draw placed furniture
        const fOx = (w - INTERIOR_WIDTH) / 2;
        const fOy = (h - INTERIOR_HEIGHT) / 2;
        furnitureRef.current.forEach(f => {
          drawFurnitureItem(ctx, f, fOx, fOy);
        });

        // Move interior player using direction + isMoving from the game state
        const bounds = getInteriorBounds(w, h);
        const ip = interiorPosRef.current;
        const speed = 2.5;
        let dx = 0, dy = 0;
        if (pos.isMoving) {
          const dir = pos.direction;
          if (dir === 'up') dy = -speed;
          else if (dir === 'down') dy = speed;
          else if (dir === 'left') dx = -speed;
          else if (dir === 'right') dx = speed;
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
