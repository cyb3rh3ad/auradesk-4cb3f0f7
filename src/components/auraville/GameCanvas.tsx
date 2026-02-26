import { useRef, useEffect, useCallback } from 'react';
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
  DEFAULT_PROFILE,
} from './gameTypes';

interface GameCanvasProps {
  position: PlayerPosition;
  profile: SpatialProfile;
  remotePlayers: Map<string, RemotePlayer>;
  houses: House[];
  decorations: WorldDecoration[];
  updateMovement: () => void;
}

// ─── Character Drawing ──────────────────────────────
function drawCharacter(
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
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(0, 16 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = p.pantsColor;
  const legW = 3 * s, legH = 7 * s;
  if (p.pantsStyle === 1) { // shorts
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
  ctx.fillStyle = '#333';
  ctx.fillRect(-4.5 * s, 11 * s + walkCycle, legW + 1 * s, 2 * s);
  ctx.fillRect(0.5 * s, 11 * s - walkCycle, legW + 1 * s, 2 * s);

  // Body
  ctx.fillStyle = p.shirtColor;
  const bodyW = 12 * s, bodyH = 11 * s;
  ctx.beginPath();
  ctx.roundRect(-bodyW / 2, -6 * s, bodyW, bodyH, 2 * s);
  ctx.fill();

  // Shirt detail
  if (p.shirtStyle === 1) { // hoodie
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(-2 * s, -4 * s, 4 * s, 8 * s);
    // Hood strings
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-1 * s, -3 * s);
    ctx.lineTo(-1 * s, 0);
    ctx.moveTo(1 * s, -3 * s);
    ctx.lineTo(1 * s, 0);
    ctx.stroke();
  } else if (p.shirtStyle === 3) { // polo collar
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(-3 * s, -6 * s);
    ctx.lineTo(0, -4 * s);
    ctx.lineTo(3 * s, -6 * s);
    ctx.closePath();
    ctx.fill();
  }

  // Arms
  ctx.fillStyle = p.skinColor;
  const armSwing = isMoving ? Math.sin(frame * 0.15) * 2 * s : 0;
  ctx.fillRect(-8 * s, -3 * s + armSwing, 2.5 * s, 8 * s);
  ctx.fillRect(5.5 * s, -3 * s - armSwing, 2.5 * s, 8 * s);

  // Head
  ctx.fillStyle = p.skinColor;
  ctx.beginPath();
  ctx.arc(0, -11 * s, 6.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = p.hairColor;
  if (p.hairStyle === 0) { // buzz
    ctx.beginPath();
    ctx.arc(0, -13 * s, 6 * s, Math.PI, 0);
    ctx.fill();
  } else if (p.hairStyle === 1) { // short
    ctx.beginPath();
    ctx.arc(0, -13 * s, 6.5 * s, Math.PI + 0.3, -0.3);
    ctx.fill();
  } else if (p.hairStyle === 2) { // medium
    ctx.beginPath();
    ctx.arc(0, -13 * s, 7 * s, Math.PI + 0.2, -0.2);
    ctx.fill();
    ctx.fillRect(-7 * s, -13 * s, 3 * s, 6 * s);
    ctx.fillRect(4 * s, -13 * s, 3 * s, 6 * s);
  } else if (p.hairStyle === 3) { // long
    ctx.beginPath();
    ctx.arc(0, -13 * s, 7 * s, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-7 * s, -13 * s, 3 * s, 12 * s);
    ctx.fillRect(4 * s, -13 * s, 3 * s, 12 * s);
  } else if (p.hairStyle === 4) { // mohawk
    ctx.fillRect(-2 * s, -22 * s, 4 * s, 10 * s);
    ctx.beginPath();
    ctx.arc(0, -13 * s, 6 * s, Math.PI + 0.5, -0.5);
    ctx.fill();
  }

  // Face
  ctx.fillStyle = '#333';
  if (dir === 'up') {
    // Back of head - no face
  } else {
    // Eyes
    const eyeY = -11 * s;
    if (p.faceStyle === 1) { // cool (sunglasses)
      ctx.fillStyle = '#111';
      ctx.fillRect(-4 * s, eyeY - 1 * s, 3 * s, 2 * s);
      ctx.fillRect(1 * s, eyeY - 1 * s, 3 * s, 2 * s);
      ctx.fillRect(-1 * s, eyeY, 2 * s, 0.5 * s);
    } else if (p.faceStyle === 3) { // wink
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(-2.5 * s, eyeY, 1 * s, 0, Math.PI * 2);
      ctx.fill();
      // Winking eye
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(1 * s, eyeY);
      ctx.lineTo(4 * s, eyeY);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(-2.5 * s, eyeY, 1 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2.5 * s, eyeY, 1 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth
    if (p.faceStyle === 0) { // happy
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -9 * s, 2 * s, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else if (p.faceStyle === 2) { // chill
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-2 * s, -8.5 * s);
      ctx.lineTo(2 * s, -8.5 * s);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ─── World Drawing ──────────────────────────────────
function drawGrass(ctx: CanvasRenderingContext2D, camX: number, camY: number, w: number, h: number) {
  // Base green
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(0, 0, w, h);

  // Tile pattern for depth
  const startTX = Math.floor(camX / TILE_SIZE);
  const startTY = Math.floor(camY / TILE_SIZE);
  const endTX = startTX + Math.ceil(w / TILE_SIZE) + 1;
  const endTY = startTY + Math.ceil(h / TILE_SIZE) + 1;

  for (let tx = startTX; tx <= endTX; tx++) {
    for (let ty = startTY; ty <= endTY; ty++) {
      if (tx < 0 || ty < 0 || tx >= WORLD_WIDTH / TILE_SIZE || ty >= WORLD_HEIGHT / TILE_SIZE) continue;
      const sx = tx * TILE_SIZE - camX;
      const sy = ty * TILE_SIZE - camY;
      // Checkerboard pattern
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.03)';
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      }
      // Random grass blades
      const seed = (tx * 73 + ty * 137) % 100;
      if (seed < 15) {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(sx + 12, sy + 8, 2, 6);
        ctx.fillRect(sx + 20, sy + 14, 2, 5);
      }
    }
  }
}

function drawHouse(ctx: CanvasRenderingContext2D, house: House, camX: number, camY: number) {
  const x = house.x - camX;
  const y = house.y - camY;
  const w = 80, h = 60;

  // Foundation
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(x - w / 2 - 4, y - h / 2 + h - 4, w + 8, 8);

  // Walls
  ctx.fillStyle = house.wallColor;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Roof
  ctx.fillStyle = house.roofColor;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 10, y - h / 2 + 2);
  ctx.lineTo(x, y - h / 2 - 30);
  ctx.lineTo(x + w / 2 + 10, y - h / 2 + 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.stroke();

  // Door
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.roundRect(x - 8, y + 2, 16, 24, [4, 4, 0, 0]);
  ctx.fill();
  // Door handle
  ctx.fillStyle = '#D4A017';
  ctx.beginPath();
  ctx.arc(x + 4, y + 14, 2, 0, Math.PI * 2);
  ctx.fill();

  // Windows
  ctx.fillStyle = '#87CEEB';
  ctx.strokeStyle = '#DEB887';
  ctx.lineWidth = 2;
  [[-24, -14], [24, -14]].forEach(([wx, wy]) => {
    ctx.fillRect(x + wx - 8, y + wy - 8, 16, 16);
    ctx.strokeRect(x + wx - 8, y + wy - 8, 16, 16);
    // Cross pane
    ctx.beginPath();
    ctx.moveTo(x + wx, y + wy - 8);
    ctx.lineTo(x + wx, y + wy + 8);
    ctx.moveTo(x + wx - 8, y + wy);
    ctx.lineTo(x + wx + 8, y + wy);
    ctx.stroke();
  });

  // Chimney
  ctx.fillStyle = '#6B4226';
  ctx.fillRect(x + 15, y - h / 2 - 28, 10, 16);

  // Name plate
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(house.ownerName, x, y + h / 2 + 14);
}

function drawDecoration(ctx: CanvasRenderingContext2D, dec: WorldDecoration, camX: number, camY: number) {
  const x = dec.x - camX;
  const y = dec.y - camY;

  if (dec.type === 'tree') {
    // Trunk
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(x - 4, y - 8, 8, 20);
    // Canopy
    const colors = ['#15803d', '#166534', '#14532d'];
    ctx.fillStyle = colors[dec.variant];
    ctx.beginPath();
    ctx.arc(x, y - 16, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.arc(x - 4, y - 20, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (dec.type === 'flower') {
    const flowerColors = ['#f43f5e', '#a855f7', '#f59e0b'];
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x - 1, y - 2, 2, 8);
    ctx.fillStyle = flowerColors[dec.variant];
    ctx.beginPath();
    ctx.arc(x, y - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x, y - 4, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (dec.type === 'rock') {
    ctx.fillStyle = '#9CA3AF';
    ctx.beginPath();
    ctx.ellipse(x, y, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(x - 2, y - 2, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (dec.type === 'bush') {
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 8, y + 2, 10, 0, Math.PI * 2);
    ctx.fill();
  } else if (dec.type === 'lamp') {
    ctx.fillStyle = '#374151';
    ctx.fillRect(x - 2, y - 20, 4, 24);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x, y - 22, 6, 0, Math.PI * 2);
    ctx.fill();
    // Glow
    ctx.fillStyle = 'rgba(251,191,36,0.1)';
    ctx.beginPath();
    ctx.arc(x, y - 22, 20, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPaths(ctx: CanvasRenderingContext2D, houses: House[], camX: number, camY: number) {
  if (houses.length < 2) return;
  ctx.strokeStyle = '#d4a76a';
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';
  ctx.setLineDash([]);

  // Connect each house to center
  const center = houses[0];
  for (let i = 1; i < houses.length; i++) {
    ctx.beginPath();
    ctx.moveTo(center.x - camX, center.y + 30 - camY);
    ctx.lineTo(houses[i].x - camX, houses[i].y + 30 - camY);
    ctx.stroke();
  }

  // Path border
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 22;
  for (let i = 1; i < houses.length; i++) {
    ctx.beginPath();
    ctx.moveTo(center.x - camX, center.y + 30 - camY);
    ctx.lineTo(houses[i].x - camX, houses[i].y + 30 - camY);
    ctx.stroke();
  }
}

function drawVoiceRange(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(x, y, HEARING_DISTANCE, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(59, 130, 246, 0.03)';
  ctx.beginPath();
  ctx.arc(x, y, HEARING_DISTANCE, 0, Math.PI * 2);
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
  const size = 120;
  const padding = 12;
  const mx = canvasW - size - padding;
  const my = padding;
  const scaleX = size / WORLD_WIDTH;
  const scaleY = size / WORLD_HEIGHT;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(mx, my, size, size, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Houses
  houses.forEach(h => {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(mx + h.x * scaleX - 2, my + h.y * scaleY - 2, 4, 4);
  });

  // Remote players
  remotePlayers.forEach(rp => {
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(mx + rp.position.x * scaleX, my + rp.position.y * scaleY, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Self
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(mx + playerX * scaleX, my + playerY * scaleY, 3, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MAP', mx + size / 2, my + size + 12);
}

// ─── Main Component ─────────────────────────────────
export const GameCanvas = ({ position, profile, remotePlayers, houses, decorations, updateMovement }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to fill container
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    }

    const w = rect?.width || canvas.width;
    const h = rect?.height || canvas.height;

    frameRef.current++;
    updateMovement();

    const camX = position.x - w / 2;
    const camY = position.y - h / 2;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // World boundary
    ctx.fillStyle = '#1a2e1a';
    ctx.fillRect(0, 0, w, h);

    // Grass
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.max(0, -camX), Math.max(0, -camY), WORLD_WIDTH, WORLD_HEIGHT);
    ctx.clip();
    drawGrass(ctx, camX, camY, w, h);
    ctx.restore();

    // Paths
    drawPaths(ctx, houses, camX, camY);

    // Voice range indicator
    drawVoiceRange(ctx, position.x - camX, position.y - camY);

    // Collect all drawable entities for depth sorting
    type Drawable = { y: number; draw: () => void };
    const drawables: Drawable[] = [];

    // Houses
    houses.forEach(house => {
      drawables.push({ y: house.y + 30, draw: () => drawHouse(ctx, house, camX, camY) });
    });

    // Decorations
    decorations.forEach(dec => {
      drawables.push({ y: dec.y, draw: () => drawDecoration(ctx, dec, camX, camY) });
    });

    // Remote players
    remotePlayers.forEach(rp => {
      drawables.push({
        y: rp.position.y,
        draw: () => {
          drawCharacter(ctx, rp.position.x - camX, rp.position.y - camY, rp.profile, rp.position.direction, rp.position.isMoving, frameRef.current);
          // Name label
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          const labelX = rp.position.x - camX;
          const labelY = rp.position.y - camY - 28;
          const tw = ctx.measureText(rp.displayName).width;
          ctx.beginPath();
          ctx.roundRect(labelX - tw / 2 - 6, labelY - 8, tw + 12, 16, 4);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(rp.displayName, labelX, labelY + 4);

          // Proximity indicator
          const dist = Math.sqrt((position.x - rp.position.x) ** 2 + (position.y - rp.position.y) ** 2);
          if (dist < HEARING_DISTANCE) {
            const vol = 1 - dist / HEARING_DISTANCE;
            ctx.fillStyle = `rgba(59,130,246,${vol * 0.6})`;
            ctx.beginPath();
            ctx.arc(rp.position.x - camX, rp.position.y - camY - 36, 4, 0, Math.PI * 2);
            ctx.fill();
            // Sound waves
            ctx.strokeStyle = `rgba(59,130,246,${vol * 0.4})`;
            ctx.lineWidth = 1;
            for (let i = 1; i <= 2; i++) {
              ctx.beginPath();
              ctx.arc(rp.position.x - camX, rp.position.y - camY - 36, 4 + i * 5, -Math.PI * 0.3, Math.PI * 0.3);
              ctx.stroke();
            }
          }
        },
      });
    });

    // Local player
    drawables.push({
      y: position.y,
      draw: () => {
        drawCharacter(ctx, position.x - camX, position.y - camY, profile, position.direction, position.isMoving, frameRef.current);
        // Name
        ctx.fillStyle = 'rgba(251,191,36,0.8)';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        const labelY = position.y - camY - 28;
        const tw = ctx.measureText(profile.displayName).width;
        ctx.beginPath();
        ctx.roundRect(position.x - camX - tw / 2 - 6, labelY - 8, tw + 12, 16, 4);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.fillText(profile.displayName, position.x - camX, labelY + 4);
      },
    });

    // Sort by Y (depth) and draw
    drawables.sort((a, b) => a.y - b.y);
    drawables.forEach(d => d.draw());

    // Minimap
    drawMinimap(ctx, w, h, position.x, position.y, houses, remotePlayers);

    // Controls hint
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('WASD / Arrow Keys to move', 12, h - 12);

    rafRef.current = requestAnimationFrame(render);
  }, [position, profile, remotePlayers, houses, decorations, updateMovement]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
