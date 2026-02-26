// ═══════════════════════════════════════════════════════
// AuraVille — House Interior Renderer
// ═══════════════════════════════════════════════════════
import { HouseInterior, INTERIOR_WIDTH, INTERIOR_HEIGHT } from './gameTypes';
import { roundRect, darkenColor } from './characterRenderer';

export function drawInterior(
  ctx: CanvasRenderingContext2D,
  interior: HouseInterior,
  canvasW: number,
  canvasH: number,
  frame: number
) {
  const iw = INTERIOR_WIDTH;
  const ih = INTERIOR_HEIGHT;
  const ox = (canvasW - iw) / 2;
  const oy = (canvasH - ih) / 2;

  // ─── Floor ────────────────────────────────────────
  const floorColors = ['#D2B48C', '#C4B8A0', '#8B7355', '#E8D5B7'];
  const floorColor = floorColors[interior.style % floorColors.length];
  ctx.fillStyle = floorColor;
  roundRect(ctx, ox, oy, iw, ih, 6);
  ctx.fill();

  // Floor tiles
  const tileSize = 32;
  for (let tx = 0; tx < Math.ceil(iw / tileSize); tx++) {
    for (let ty = 0; ty < Math.ceil(ih / tileSize); ty++) {
      const fx = ox + tx * tileSize;
      const fy = oy + ty * tileSize;
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(fx, fy, tileSize, tileSize);
      }
    }
  }

  // ─── Walls ────────────────────────────────────────
  const wallColors = ['#FFF8DC', '#F5F5DC', '#D2B48C', '#FAF0E6'];
  const wallColor = wallColors[interior.style % wallColors.length];

  // Back wall
  ctx.fillStyle = wallColor;
  ctx.fillRect(ox, oy - 60, iw, 60);
  // Wallpaper pattern
  ctx.fillStyle = darkenColor(wallColor, 0.95);
  for (let i = 0; i < iw; i += 40) {
    ctx.fillRect(ox + i, oy - 60, 1, 60);
  }
  // Baseboard
  ctx.fillStyle = darkenColor(floorColor, 0.8);
  ctx.fillRect(ox, oy - 4, iw, 8);

  // Side walls
  ctx.fillStyle = darkenColor(wallColor, 0.93);
  ctx.fillRect(ox - 20, oy - 60, 20, ih + 60);
  ctx.fillRect(ox + iw, oy - 60, 20, ih + 60);

  // ─── Furniture based on style ─────────────────────

  // Rug
  const rugColors = ['#8B0000', '#2F4F4F', '#4B0082', '#006400'];
  ctx.fillStyle = rugColors[interior.style % rugColors.length];
  ctx.globalAlpha = 0.3;
  roundRect(ctx, ox + iw / 2 - 60, oy + ih / 2 - 30, 120, 60, 8);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Rug border
  ctx.strokeStyle = darkenColor(rugColors[interior.style % rugColors.length], 0.7);
  ctx.lineWidth = 2;
  roundRect(ctx, ox + iw / 2 - 60, oy + ih / 2 - 30, 120, 60, 8);
  ctx.stroke();

  // Table
  ctx.fillStyle = '#654321';
  roundRect(ctx, ox + iw / 2 - 30, oy + ih / 2 - 15, 60, 30, 4);
  ctx.fill();
  ctx.fillStyle = '#7B5B3A';
  roundRect(ctx, ox + iw / 2 - 28, oy + ih / 2 - 13, 56, 26, 3);
  ctx.fill();
  // Table items
  ctx.fillStyle = '#87CEEB';
  ctx.beginPath(); ctx.arc(ox + iw / 2 - 10, oy + ih / 2, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.arc(ox + iw / 2 + 10, oy + ih / 2 - 3, 4, 0, Math.PI * 2); ctx.fill();

  // Couch (left side)
  ctx.fillStyle = '#5D3A1A';
  roundRect(ctx, ox + 20, oy + ih / 2 - 20, 50, 40, 6);
  ctx.fill();
  const couchColors = ['#DC143C', '#4169E1', '#228B22', '#FF8C00'];
  ctx.fillStyle = couchColors[interior.style % couchColors.length];
  roundRect(ctx, ox + 24, oy + ih / 2 - 16, 42, 32, 4);
  ctx.fill();
  // Cushion detail
  ctx.strokeStyle = darkenColor(couchColors[interior.style % couchColors.length], 0.85);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ox + 45, oy + ih / 2 - 16);
  ctx.lineTo(ox + 45, oy + ih / 2 + 16);
  ctx.stroke();

  // Bookshelf (top right)
  ctx.fillStyle = '#5D3A1A';
  roundRect(ctx, ox + iw - 70, oy + 10, 50, 70, 3);
  ctx.fill();
  // Shelves
  for (let sh = 0; sh < 3; sh++) {
    ctx.fillStyle = '#4A2E16';
    ctx.fillRect(ox + iw - 68, oy + 28 + sh * 20, 46, 3);
    // Books
    const bookColors = ['#B22222', '#4169E1', '#228B22', '#FFD700', '#8B008B'];
    for (let b = 0; b < 5; b++) {
      ctx.fillStyle = bookColors[(b + sh * 2) % bookColors.length];
      const bw = 5 + Math.random() * 3;
      ctx.fillRect(ox + iw - 66 + b * 9, oy + 12 + sh * 20, bw, 15);
    }
  }

  // Lamp (top left)
  const lampPulse = 0.8 + Math.sin(frame * 0.03) * 0.1;
  ctx.fillStyle = '#333';
  ctx.fillRect(ox + 35, oy + 15, 4, 35);
  ctx.fillStyle = '#FFD700';
  ctx.globalAlpha = lampPulse;
  ctx.beginPath(); ctx.arc(ox + 37, oy + 12, 10, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.15;
  ctx.beginPath(); ctx.arc(ox + 37, oy + 12, 40, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Potted plant (bottom right)
  ctx.fillStyle = '#8B4513';
  roundRect(ctx, ox + iw - 40, oy + ih - 40, 20, 20, 3);
  ctx.fill();
  ctx.fillStyle = '#654321';
  ctx.fillRect(ox + iw - 42, oy + ih - 42, 24, 5);
  ctx.fillStyle = '#2E8B57';
  ctx.beginPath(); ctx.arc(ox + iw - 30, oy + ih - 50, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3CB371';
  ctx.beginPath(); ctx.arc(ox + iw - 26, oy + ih - 55, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ox + iw - 34, oy + ih - 48, 8, 0, Math.PI * 2); ctx.fill();

  // ─── Door (exit) at bottom center ─────────────────
  const doorX = ox + iw / 2 - 15;
  const doorY = oy + ih - 5;
  ctx.fillStyle = '#8B5E3C';
  roundRect(ctx, doorX, doorY, 30, 20, [4, 4, 0, 0]);
  ctx.fill();
  ctx.strokeStyle = '#6B4226';
  ctx.lineWidth = 2;
  ctx.strokeRect(doorX, doorY, 30, 20);
  // "EXIT" label
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', ox + iw / 2, doorY + 13);
  // Door mat
  ctx.fillStyle = 'rgba(139,115,85,0.4)';
  roundRect(ctx, doorX - 5, doorY + 18, 40, 8, 2);
  ctx.fill();

  // ─── Room label ───────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.font = 'bold 13px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const label = `${interior.ownerName}'s House`;
  const tw = ctx.measureText(label).width;
  roundRect(ctx, ox + iw / 2 - tw / 2 - 12, oy - 80, tw + 24, 24, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(label, ox + iw / 2, oy - 63);

  // ─── Border / walls outline ───────────────────────
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 3;
  roundRect(ctx, ox, oy, iw, ih, 6);
  ctx.stroke();

  return { ox, oy, iw, ih, doorX, doorY };
}

export function isNearDoor(
  px: number,
  py: number,
  canvasW: number,
  canvasH: number
): boolean {
  const ox = (canvasW - INTERIOR_WIDTH) / 2;
  const oy = (canvasH - INTERIOR_HEIGHT) / 2;
  const doorCenterX = ox + INTERIOR_WIDTH / 2;
  const doorCenterY = oy + INTERIOR_HEIGHT + 5;
  const dist = Math.sqrt((px - doorCenterX) ** 2 + (py - doorCenterY) ** 2);
  return dist < 30;
}

export function getInteriorBounds(canvasW: number, canvasH: number) {
  const ox = (canvasW - INTERIOR_WIDTH) / 2;
  const oy = (canvasH - INTERIOR_HEIGHT) / 2;
  return { minX: ox + 15, maxX: ox + INTERIOR_WIDTH - 15, minY: oy + 15, maxY: oy + INTERIOR_HEIGHT + 10 };
}
