import { useRef, useEffect } from 'react';
import {
  PlayerPosition,
  RemotePlayer,
  SpatialProfile,
  House,
  WorldDecoration,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TILE_SIZE,
  HEARING_DISTANCE,
} from './gameTypes';

interface GameCanvasProps {
  position: PlayerPosition;
  profile: SpatialProfile;
  remotePlayers: Map<string, RemotePlayer>;
  houses: House[];
  decorations: WorldDecoration[];
  updateMovement: () => void;
}

// ─── Character Drawing (shared utility) ─────────────
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: SpatialProfile,
  dir: PlayerPosition['direction'],
  isMoving: boolean,
  frame: number,
  scale: number = 1.8
) {
  const s = scale;
  const walkCycle = isMoving ? Math.sin(frame * 0.15) * 3 * s : 0;

  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 16 * s, 9 * s, 3.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = p.pantsColor;
  const legW = 3 * s, legH = 7 * s;
  if (p.pantsStyle === 1) {
    ctx.fillRect(-4 * s, 5 * s + walkCycle, legW, legH * 0.5);
    ctx.fillRect(1 * s, 5 * s - walkCycle, legW, legH * 0.5);
    ctx.fillStyle = p.skinColor;
    ctx.fillRect(-4 * s, 5 * s + legH * 0.5 + walkCycle, legW, legH * 0.5);
    ctx.fillRect(1 * s, 5 * s + legH * 0.5 - walkCycle, legW, legH * 0.5);
  } else {
    ctx.fillRect(-4 * s, 5 * s + walkCycle, legW, legH);
    ctx.fillRect(1 * s, 5 * s - walkCycle, legW, legH);
  }

  // Shoes
  ctx.fillStyle = '#2d2d2d';
  ctx.fillRect(-4.5 * s, 11 * s + walkCycle, legW + 1 * s, 2.5 * s);
  ctx.fillRect(0.5 * s, 11 * s - walkCycle, legW + 1 * s, 2.5 * s);

  // Body
  ctx.fillStyle = p.shirtColor;
  const bodyW = 12 * s, bodyH = 11 * s;
  roundRect(ctx, -bodyW / 2, -6 * s, bodyW, bodyH, 2 * s);
  ctx.fill();

  // Shirt details
  if (p.shirtStyle === 1) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(-2 * s, -4 * s, 4 * s, 8 * s);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-1 * s, -3 * s); ctx.lineTo(-1 * s, 0);
    ctx.moveTo(1 * s, -3 * s); ctx.lineTo(1 * s, 0);
    ctx.stroke();
  } else if (p.shirtStyle === 2) {
    // Tank top - show skin on shoulders
    ctx.fillStyle = p.skinColor;
    ctx.fillRect(-6 * s, -6 * s, 2 * s, 4 * s);
    ctx.fillRect(4 * s, -6 * s, 2 * s, 4 * s);
  } else if (p.shirtStyle === 3) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(-3 * s, -6 * s); ctx.lineTo(0, -4 * s); ctx.lineTo(3 * s, -6 * s);
    ctx.closePath();
    ctx.fill();
    // Polo buttons
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.arc(0, -3 * s, 0.6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -1 * s, 0.6 * s, 0, Math.PI * 2); ctx.fill();
  }

  // Arms
  ctx.fillStyle = p.skinColor;
  const armSwing = isMoving ? Math.sin(frame * 0.15) * 2 * s : 0;
  roundRect(ctx, -8 * s, -3 * s + armSwing, 2.5 * s, 8 * s, 1 * s);
  ctx.fill();
  roundRect(ctx, 5.5 * s, -3 * s - armSwing, 2.5 * s, 8 * s, 1 * s);
  ctx.fill();

  // Head
  ctx.fillStyle = p.skinColor;
  ctx.beginPath();
  ctx.arc(0, -11 * s, 6.5 * s, 0, Math.PI * 2);
  ctx.fill();
  // Ear hint
  ctx.fillStyle = p.skinColor;
  ctx.beginPath(); ctx.arc(-6 * s, -10 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6 * s, -10 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();

  // Hair
  ctx.fillStyle = p.hairColor;
  if (p.hairStyle === 0) {
    ctx.beginPath(); ctx.arc(0, -13 * s, 6 * s, Math.PI, 0); ctx.fill();
  } else if (p.hairStyle === 1) {
    ctx.beginPath(); ctx.arc(0, -13 * s, 6.5 * s, Math.PI + 0.3, -0.3); ctx.fill();
  } else if (p.hairStyle === 2) {
    ctx.beginPath(); ctx.arc(0, -13 * s, 7 * s, Math.PI + 0.2, -0.2); ctx.fill();
    ctx.fillRect(-7 * s, -13 * s, 3 * s, 6 * s);
    ctx.fillRect(4 * s, -13 * s, 3 * s, 6 * s);
  } else if (p.hairStyle === 3) {
    ctx.beginPath(); ctx.arc(0, -13 * s, 7 * s, Math.PI, 0); ctx.fill();
    ctx.fillRect(-7 * s, -13 * s, 3 * s, 12 * s);
    ctx.fillRect(4 * s, -13 * s, 3 * s, 12 * s);
  } else if (p.hairStyle === 4) {
    ctx.fillRect(-2 * s, -22 * s, 4 * s, 10 * s);
    ctx.beginPath(); ctx.arc(0, -13 * s, 6 * s, Math.PI + 0.5, -0.5); ctx.fill();
  }

  // Face
  if (dir !== 'up') {
    const eyeY = -11 * s;
    if (p.faceStyle === 1) {
      ctx.fillStyle = '#111';
      roundRect(ctx, -4.5 * s, eyeY - 1.2 * s, 3.5 * s, 2.4 * s, 0.5 * s); ctx.fill();
      roundRect(ctx, 1 * s, eyeY - 1.2 * s, 3.5 * s, 2.4 * s, 0.5 * s); ctx.fill();
      ctx.fillRect(-1 * s, eyeY - 0.3 * s, 2 * s, 0.6 * s);
    } else if (p.faceStyle === 3) {
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-2.5 * s, eyeY, 1.2 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(1 * s, eyeY); ctx.lineTo(4 * s, eyeY); ctx.stroke();
    } else {
      // Normal/happy eyes with white highlight
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-2.5 * s, eyeY, 1.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(2.5 * s, eyeY, 1.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-2.5 * s, eyeY, 1 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(2.5 * s, eyeY, 1 * s, 0, Math.PI * 2); ctx.fill();
      // Eye glint
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-2 * s, eyeY - 0.5 * s, 0.4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3 * s, eyeY - 0.5 * s, 0.4 * s, 0, Math.PI * 2); ctx.fill();
    }

    // Cheeks (blush)
    ctx.fillStyle = 'rgba(255,150,150,0.2)';
    ctx.beginPath(); ctx.ellipse(-4 * s, -8.5 * s, 1.5 * s, 1 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4 * s, -8.5 * s, 1.5 * s, 1 * s, 0, 0, Math.PI * 2); ctx.fill();

    if (p.faceStyle === 0) {
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(0, -9 * s, 2 * s, 0.2, Math.PI - 0.2); ctx.stroke();
    } else if (p.faceStyle === 2) {
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(-2 * s, -8.5 * s); ctx.lineTo(2 * s, -8.5 * s); ctx.stroke();
    }
  }

  ctx.restore();
}

// Polyfill-safe roundRect
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  const radii = typeof r === 'number' ? [r, r, r, r] : r;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, radii);
  } else {
    // Fallback
    const [tl, tr, br, bl] = radii.length === 4 ? radii : [radii[0], radii[0], radii[0], radii[0]];
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }
}

// ─── World Drawing ──────────────────────────────────
function drawGrass(ctx: CanvasRenderingContext2D, camX: number, camY: number, w: number, h: number) {
  // Rich gradient grass
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
      } else if (seed < 18) {
        ctx.fillStyle = '#86efac';
        ctx.fillRect(sx + 8, sy + 20, 1.5, 4);
      }
    }
  }
}

function drawHouse(ctx: CanvasRenderingContext2D, house: House, camX: number, camY: number) {
  const x = house.x - camX;
  const y = house.y - camY;
  const w = 88, h = 64;

  // Ground pad
  ctx.fillStyle = 'rgba(139,115,85,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + h / 2 + 4, w / 2 + 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(x - w / 2 + 4, y + h / 2 - 2, w - 4, 6);

  // Walls with gradient
  const wallGrad = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
  wallGrad.addColorStop(0, house.wallColor);
  wallGrad.addColorStop(1, darkenColor(house.wallColor, 0.9));
  ctx.fillStyle = wallGrad;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Roof with gradient
  const roofGrad = ctx.createLinearGradient(x, y - h / 2 - 34, x, y - h / 2 + 2);
  roofGrad.addColorStop(0, house.roofColor);
  roofGrad.addColorStop(1, darkenColor(house.roofColor, 0.85));
  ctx.fillStyle = roofGrad;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 12, y - h / 2 + 2);
  ctx.lineTo(x, y - h / 2 - 34);
  ctx.lineTo(x + w / 2 + 12, y - h / 2 + 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Door
  const doorGrad = ctx.createLinearGradient(x - 9, y, x + 9, y + 26);
  doorGrad.addColorStop(0, '#8B5E3C');
  doorGrad.addColorStop(1, '#6B4226');
  ctx.fillStyle = doorGrad;
  roundRect(ctx, x - 9, y, 18, 26, [4, 4, 0, 0]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Handle
  ctx.fillStyle = '#D4A017';
  ctx.beginPath();
  ctx.arc(x + 5, y + 14, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(x + 4.5, y + 13.5, 1, 0, Math.PI * 2);
  ctx.fill();

  // Windows with light glow
  [[-26, -14], [26, -14]].forEach(([wx, wy]) => {
    // Window glow
    ctx.fillStyle = 'rgba(135,206,235,0.15)';
    ctx.beginPath();
    ctx.arc(x + wx, y + wy, 14, 0, Math.PI * 2);
    ctx.fill();
    // Window
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(x + wx - 9, y + wy - 9, 18, 18);
    // Curtain effect
    const curtainGrad = ctx.createLinearGradient(x + wx - 9, y + wy - 9, x + wx + 9, y + wy - 9);
    curtainGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
    curtainGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    curtainGrad.addColorStop(1, 'rgba(255,255,255,0.15)');
    ctx.fillStyle = curtainGrad;
    ctx.fillRect(x + wx - 9, y + wy - 9, 18, 18);
    // Frame
    ctx.strokeStyle = darkenColor(house.wallColor, 0.7);
    ctx.lineWidth = 2;
    ctx.strokeRect(x + wx - 9, y + wy - 9, 18, 18);
    // Cross pane
    ctx.beginPath();
    ctx.moveTo(x + wx, y + wy - 9); ctx.lineTo(x + wx, y + wy + 9);
    ctx.moveTo(x + wx - 9, y + wy); ctx.lineTo(x + wx + 9, y + wy);
    ctx.stroke();
  });

  // Chimney
  ctx.fillStyle = '#5C3A1E';
  ctx.fillRect(x + 18, y - h / 2 - 30, 12, 18);
  ctx.fillStyle = '#4A2E16';
  ctx.fillRect(x + 17, y - h / 2 - 32, 14, 4);
  // Smoke
  ctx.fillStyle = 'rgba(200,200,200,0.25)';
  ctx.beginPath();
  ctx.arc(x + 24, y - h / 2 - 38, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 22, y - h / 2 - 46, 3, 0, Math.PI * 2);
  ctx.fill();

  // Name plate with background
  const name = house.ownerName;
  ctx.font = 'bold 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(name).width;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, x - tw / 2 - 8, y + h / 2 + 6, tw + 16, 18, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(name, x, y + h / 2 + 19);
}

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
}

function drawDecoration(ctx: CanvasRenderingContext2D, dec: WorldDecoration, camX: number, camY: number) {
  const x = dec.x - camX;
  const y = dec.y - camY;

  if (dec.type === 'tree') {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Trunk
    ctx.fillStyle = '#6B4226';
    roundRect(ctx, x - 5, y - 8, 10, 22, 2);
    ctx.fill();
    // Bark detail
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(x - 2, y - 4, 2, 8);
    ctx.fillRect(x + 1, y, 2, 6);
    // Canopy layers
    const colors = ['#15803d', '#166534', '#14532d'];
    const base = colors[dec.variant];
    ctx.fillStyle = base;
    ctx.beginPath(); ctx.arc(x, y - 18, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lightenColor(base, 1.15);
    ctx.beginPath(); ctx.arc(x - 6, y - 22, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 8, y - 16, 10, 0, Math.PI * 2); ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(x - 5, y - 24, 8, 0, Math.PI * 2); ctx.fill();
  } else if (dec.type === 'flower') {
    const flowerColors = ['#f43f5e', '#a855f7', '#f59e0b'];
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x - 1, y - 2, 2, 8);
    // Leaves
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.ellipse(x - 3, y + 2, 3, 1.5, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 3, y + 3, 3, 1.5, 0.5, 0, Math.PI * 2); ctx.fill();
    // Petals
    ctx.fillStyle = flowerColors[dec.variant];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * 3, y - 5 + Math.sin(angle) * 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(x, y - 5, 2, 0, Math.PI * 2); ctx.fill();
  } else if (dec.type === 'rock') {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.ellipse(x, y + 3, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9CA3AF';
    ctx.beginPath(); ctx.ellipse(x, y, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#B0B8C4';
    ctx.beginPath(); ctx.ellipse(x - 2, y - 2, 7, 5, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.ellipse(x - 3, y - 3, 4, 3, -0.3, 0, Math.PI * 2); ctx.fill();
  } else if (dec.type === 'bush') {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + 6, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.arc(x - 4, y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#15803d';
    ctx.beginPath(); ctx.arc(x + 8, y + 2, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.arc(x + 2, y - 4, 8, 0, Math.PI * 2); ctx.fill();
    // Berry
    if (dec.variant === 0) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 6, y + 1, 2, 0, Math.PI * 2); ctx.fill();
    }
  } else if (dec.type === 'lamp') {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath(); ctx.ellipse(x, y + 4, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#374151';
    ctx.fillRect(x - 2.5, y - 22, 5, 26);
    // Lamp head
    ctx.fillStyle = '#1f2937';
    roundRect(ctx, x - 8, y - 28, 16, 8, 3);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(x, y - 22, 4, 0, Math.PI * 2); ctx.fill();
    // Warm glow
    const glow = ctx.createRadialGradient(x, y - 22, 2, x, y - 22, 30);
    glow.addColorStop(0, 'rgba(251,191,36,0.12)');
    glow.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y - 22, 30, 0, Math.PI * 2); ctx.fill();
  }
}

function lightenColor(hex: string, factor: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) * factor);
  return `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
}

function drawPaths(ctx: CanvasRenderingContext2D, houses: House[], camX: number, camY: number) {
  if (houses.length < 2) return;
  const center = houses[0];

  // Path shadow first
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  for (let i = 1; i < houses.length; i++) {
    ctx.beginPath();
    ctx.moveTo(center.x - camX, center.y + 32 - camY);
    ctx.lineTo(houses[i].x - camX, houses[i].y + 32 - camY);
    ctx.stroke();
  }

  // Main path
  ctx.strokeStyle = '#c9a05c';
  ctx.lineWidth = 22;
  for (let i = 1; i < houses.length; i++) {
    ctx.beginPath();
    ctx.moveTo(center.x - camX, center.y + 30 - camY);
    ctx.lineTo(houses[i].x - camX, houses[i].y + 30 - camY);
    ctx.stroke();
  }

  // Path detail (lighter center)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 8;
  for (let i = 1; i < houses.length; i++) {
    ctx.beginPath();
    ctx.moveTo(center.x - camX, center.y + 30 - camY);
    ctx.lineTo(houses[i].x - camX, houses[i].y + 30 - camY);
    ctx.stroke();
  }
}

function drawVoiceRange(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  // Animated pulsing range
  const pulse = 1 + Math.sin(frame * 0.03) * 0.02;
  const radius = HEARING_DISTANCE * pulse;

  ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const rangeGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  rangeGrad.addColorStop(0, 'rgba(59, 130, 246, 0.04)');
  rangeGrad.addColorStop(0.7, 'rgba(59, 130, 246, 0.02)');
  rangeGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = rangeGrad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
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

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, mx - 2, my - 2, size + 4, size + 4, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(74,222,128,0.3)';
  roundRect(ctx, mx, my, size, size, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Houses
  houses.forEach(h => {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    roundRect(ctx, mx + h.x * scaleX - 2.5, my + h.y * scaleY - 2.5, 5, 5, 1);
    ctx.fill();
  });

  // Remote players
  remotePlayers.forEach(rp => {
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(mx + rp.position.x * scaleX, my + rp.position.y * scaleY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Self (pulsing)
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(mx + playerX * scaleX, my + playerY * scaleY, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(251,191,36,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MAP', mx + size / 2, my + size + 14);
}

// ─── Main Component (ref-based game loop) ────────────
export const GameCanvas = ({ position, profile, remotePlayers, houses, decorations, updateMovement }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Store all props in refs so the game loop never restarts
  const posRef = useRef(position);
  const profileRef = useRef(profile);
  const remoteRef = useRef(remotePlayers);
  const housesRef = useRef(houses);
  const decsRef = useRef(decorations);
  const updateRef = useRef(updateMovement);
  const sizeRef = useRef({ w: 0, h: 0 });

  // Sync refs with props
  posRef.current = position;
  profileRef.current = profile;
  remoteRef.current = remotePlayers;
  housesRef.current = houses;
  decsRef.current = decorations;
  updateRef.current = updateMovement;

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

  // Single stable game loop — never restarts
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

      const camX = pos.x - w / 2;
      const camY = pos.y - h / 2;

      // Clear with out-of-bounds color
      ctx.fillStyle = '#1a3320';
      ctx.fillRect(0, 0, w, h);

      // Grass (clipped to world)
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

      // Paths (draw before houses for depth)
      drawPaths(ctx, houseList, camX, camY);

      // Voice range
      drawVoiceRange(ctx, pos.x - camX, pos.y - camY, frameRef.current);

      // Depth-sorted drawables
      type Drawable = { y: number; draw: () => void };
      const drawables: Drawable[] = [];

      houseList.forEach(house => {
        drawables.push({ y: house.y + 32, draw: () => drawHouse(ctx, house, camX, camY) });
      });

      decList.forEach(dec => {
        drawables.push({ y: dec.y, draw: () => drawDecoration(ctx, dec, camX, camY) });
      });

      // Remote players
      remote.forEach(rp => {
        drawables.push({
          y: rp.position.y,
          draw: () => {
            drawCharacter(ctx, rp.position.x - camX, rp.position.y - camY, rp.profile, rp.position.direction, rp.position.isMoving, frameRef.current);
            // Name label
            const labelX = rp.position.x - camX;
            const labelY = rp.position.y - camY - 30;
            ctx.font = 'bold 11px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            const tw = ctx.measureText(rp.displayName).width;
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            roundRect(ctx, labelX - tw / 2 - 7, labelY - 9, tw + 14, 18, 6);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText(rp.displayName, labelX, labelY + 4);

            // Voice proximity indicator
            const dist = Math.sqrt((pos.x - rp.position.x) ** 2 + (pos.y - rp.position.y) ** 2);
            if (dist < HEARING_DISTANCE) {
              const vol = 1 - dist / HEARING_DISTANCE;
              // Speaking indicator
              ctx.fillStyle = `rgba(59,130,246,${vol * 0.7})`;
              ctx.beginPath();
              ctx.arc(rp.position.x - camX, rp.position.y - camY - 40, 5, 0, Math.PI * 2);
              ctx.fill();
              // Sound waves
              ctx.strokeStyle = `rgba(59,130,246,${vol * 0.35})`;
              ctx.lineWidth = 1.2;
              for (let i = 1; i <= 3; i++) {
                ctx.beginPath();
                ctx.arc(rp.position.x - camX, rp.position.y - camY - 40, 5 + i * 5, -Math.PI * 0.35, Math.PI * 0.35);
                ctx.stroke();
              }
            }
          },
        });
      });

      // Local player
      drawables.push({
        y: pos.y,
        draw: () => {
          drawCharacter(ctx, pos.x - camX, pos.y - camY, prof, pos.direction, pos.isMoving, frameRef.current);
          // Golden name label
          ctx.font = 'bold 11px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          const labelY = pos.y - camY - 30;
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

      // Minimap
      drawMinimap(ctx, w, h, pos.x, pos.y, houseList, remote);

      // World border vignette
      ctx.fillStyle = 'rgba(0,0,0,0)';
      const edge = 60;
      if (pos.x < edge) {
        const grad = ctx.createLinearGradient(0, 0, edge - camX > 0 ? edge - camX : 0, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0.3)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, edge, h);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // Empty deps = never restarts

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ imageRendering: 'auto', cursor: 'default' }}
      tabIndex={0}
    />
  );
};
