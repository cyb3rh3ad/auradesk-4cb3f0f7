// ═══════════════════════════════════════════════════════
// AuraVille — Multi-Room House Interior Renderer
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

  // ─── Overall floor ────────────────────────────────
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const floorColors = ['#D2B48C', '#C4B8A0', '#8B7355', '#E8D5B7'];
  const floorColor = floorColors[interior.style % floorColors.length];
  ctx.fillStyle = floorColor;
  roundRect(ctx, ox, oy, iw, ih, 4);
  ctx.fill();

  // Floor tile pattern
  const ts = 24;
  for (let tx = 0; tx < Math.ceil(iw / ts); tx++) {
    for (let ty = 0; ty < Math.ceil(ih / ts); ty++) {
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.035)';
        ctx.fillRect(ox + tx * ts, oy + ty * ts, ts, ts);
      }
    }
  }

  // ─── Walls (outer) ────────────────────────────────
  const wallColors = ['#FFF8DC', '#F0EAD6', '#E8D5B7', '#FAF0E6'];
  const wallColor = wallColors[interior.style % wallColors.length];
  const wallH = 50;

  // Top wall
  ctx.fillStyle = wallColor;
  ctx.fillRect(ox, oy - wallH, iw, wallH);
  ctx.fillStyle = darkenColor(wallColor, 0.94);
  for (let i = 0; i < iw; i += 30) ctx.fillRect(ox + i, oy - wallH, 1, wallH);
  // Baseboard
  ctx.fillStyle = darkenColor(floorColor, 0.75);
  ctx.fillRect(ox, oy - 3, iw, 6);
  // Side walls
  ctx.fillStyle = darkenColor(wallColor, 0.9);
  ctx.fillRect(ox - 16, oy - wallH, 16, ih + wallH);
  ctx.fillRect(ox + iw, oy - wallH, 16, ih + wallH);

  // ─── Room dividers ────────────────────────────────
  // Layout: 2x2 grid
  // Top-left: Living Room | Top-right: Kitchen
  // Bottom-left: Bedroom  | Bottom-right: Bathroom
  const midX = ox + iw / 2;
  const midY = oy + ih / 2;
  const wallThick = 6;

  // Horizontal wall (with gap for hallway)
  ctx.fillStyle = darkenColor(wallColor, 0.85);
  ctx.fillRect(ox, midY - wallThick / 2, iw * 0.35, wallThick); // left section
  ctx.fillRect(ox + iw * 0.45, midY - wallThick / 2, iw * 0.1, wallThick); // small gap bridge
  ctx.fillRect(ox + iw * 0.65, midY - wallThick / 2, iw * 0.35, wallThick); // right section

  // Vertical wall (with gap for hallway)
  ctx.fillRect(midX - wallThick / 2, oy, wallThick, ih * 0.3);
  ctx.fillRect(midX - wallThick / 2, oy + ih * 0.45, wallThick, ih * 0.1);
  ctx.fillRect(midX - wallThick / 2, oy + ih * 0.7, wallThick, ih * 0.3);

  // Room labels
  const drawRoomLabel = (text: string, rx: number, ry: number) => {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.font = 'bold 9px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, rx, ry);
  };

  drawRoomLabel('LIVING ROOM', ox + iw * 0.25, oy + 12);
  drawRoomLabel('KITCHEN', ox + iw * 0.75, oy + 12);
  drawRoomLabel('BEDROOM', ox + iw * 0.25, midY + 14);
  drawRoomLabel('BATHROOM', ox + iw * 0.75, midY + 14);

  // ═══ LIVING ROOM (top-left) ═══════════════════════
  const lrX = ox + 10;
  const lrY = oy + 18;
  const lrW = iw / 2 - wallThick / 2 - 10;
  const lrH = ih / 2 - wallThick / 2 - 18;

  // Rug
  const rugColors = ['#8B0000', '#2F4F4F', '#4B0082', '#006400'];
  ctx.fillStyle = rugColors[interior.style % rugColors.length];
  ctx.globalAlpha = 0.2;
  roundRect(ctx, lrX + lrW / 2 - 45, lrY + lrH / 2 - 20, 90, 40, 6);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Couch (against top wall)
  ctx.fillStyle = '#5D3A1A';
  roundRect(ctx, lrX + 10, lrY + 2, 80, 28, 4);
  ctx.fill();
  const couchC = ['#B22222', '#336699', '#2E7D32', '#CC7722'][interior.style % 4];
  ctx.fillStyle = couchC;
  roundRect(ctx, lrX + 13, lrY + 5, 74, 22, 3);
  ctx.fill();
  // Cushion lines
  ctx.strokeStyle = darkenColor(couchC, 0.8);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(lrX + 38, lrY + 5); ctx.lineTo(lrX + 38, lrY + 27);
  ctx.moveTo(lrX + 62, lrY + 5); ctx.lineTo(lrX + 62, lrY + 27);
  ctx.stroke();
  // Throw pillows
  ctx.fillStyle = darkenColor(couchC, 0.7);
  roundRect(ctx, lrX + 16, lrY + 8, 12, 10, 2); ctx.fill();
  ctx.fillStyle = '#FFD700';
  roundRect(ctx, lrX + 72, lrY + 9, 10, 9, 2); ctx.fill();

  // Coffee table
  ctx.fillStyle = '#654321';
  roundRect(ctx, lrX + lrW / 2 - 22, lrY + lrH / 2 - 8, 44, 18, 3);
  ctx.fill();
  ctx.fillStyle = '#7B5B3A';
  roundRect(ctx, lrX + lrW / 2 - 20, lrY + lrH / 2 - 6, 40, 14, 2);
  ctx.fill();
  // Items on table
  ctx.fillStyle = '#87CEEB';
  ctx.beginPath(); ctx.arc(lrX + lrW / 2 - 8, lrY + lrH / 2, 4, 0, Math.PI * 2); ctx.fill(); // cup
  ctx.fillStyle = '#FFA500';
  ctx.fillRect(lrX + lrW / 2 + 4, lrY + lrH / 2 - 3, 8, 5); // book

  // TV (on wall)
  ctx.fillStyle = '#111';
  roundRect(ctx, lrX + lrW - 35, lrY + 3, 30, 20, 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a3e';
  roundRect(ctx, lrX + lrW - 33, lrY + 5, 26, 16, 1);
  ctx.fill();
  // TV stand
  ctx.fillStyle = '#333';
  ctx.fillRect(lrX + lrW - 26, lrY + 23, 12, 3);

  // Floor lamp
  const lampPulse = 0.85 + Math.sin(frame * 0.03) * 0.1;
  ctx.fillStyle = '#444';
  ctx.fillRect(lrX + 2, lrY + lrH - 35, 3, 30);
  ctx.fillStyle = '#FFD700';
  ctx.globalAlpha = lampPulse;
  ctx.beginPath(); ctx.arc(lrX + 3.5, lrY + lrH - 38, 7, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.1;
  ctx.beginPath(); ctx.arc(lrX + 3.5, lrY + lrH - 38, 25, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Bookshelf
  ctx.fillStyle = '#5D3A1A';
  roundRect(ctx, lrX + lrW - 8, lrY + 30, 8, 50, 1);
  ctx.fill();
  const bkColors = ['#B22222', '#4169E1', '#228B22', '#FFD700', '#8B008B'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = bkColors[i % 5];
    ctx.fillRect(lrX + lrW - 7, lrY + 33 + i * 12, 6, 9);
  }

  // ═══ KITCHEN (top-right) ══════════════════════════
  const kX = midX + wallThick / 2 + 5;
  const kY = oy + 18;
  const kW = iw / 2 - wallThick / 2 - 10;
  const kH = ih / 2 - wallThick / 2 - 18;

  // Kitchen floor (tile pattern)
  ctx.fillStyle = 'rgba(200,200,200,0.1)';
  for (let tx = 0; tx < 8; tx++) {
    for (let ty = 0; ty < 6; ty++) {
      if ((tx + ty) % 2 === 0) {
        ctx.fillRect(kX + tx * 16, kY + ty * 16, 16, 16);
      }
    }
  }

  // Counter along top wall
  ctx.fillStyle = '#5D3A1A';
  ctx.fillRect(kX + 5, kY + 2, kW - 10, 18);
  ctx.fillStyle = '#D2B48C';
  ctx.fillRect(kX + 6, kY + 3, kW - 12, 12); // countertop surface

  // Sink
  ctx.fillStyle = '#C0C0C0';
  roundRect(ctx, kX + 20, kY + 5, 18, 8, 2);
  ctx.fill();
  ctx.fillStyle = '#A0A0A0';
  roundRect(ctx, kX + 22, kY + 6, 14, 5, 1);
  ctx.fill();
  // Faucet
  ctx.fillStyle = '#888';
  ctx.fillRect(kX + 28, kY + 2, 2, 5);
  ctx.beginPath(); ctx.arc(kX + 28, kY + 2, 2, 0, Math.PI, true); ctx.fill();

  // Stove
  ctx.fillStyle = '#333';
  roundRect(ctx, kX + 50, kY + 4, 22, 10, 1);
  ctx.fill();
  // Burners
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(kX + 56, kY + 9, 3, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(kX + 66, kY + 9, 3, 0, Math.PI * 2); ctx.stroke();

  // Fridge (right side)
  ctx.fillStyle = '#E8E8E8';
  roundRect(ctx, kX + kW - 20, kY + 2, 18, 35, 2);
  ctx.fill();
  ctx.strokeStyle = '#CCC';
  ctx.lineWidth = 1;
  ctx.strokeRect(kX + kW - 19, kY + 3, 16, 15); // top
  ctx.strokeRect(kX + kW - 19, kY + 19, 16, 17); // bottom
  ctx.fillStyle = '#C0C0C0';
  ctx.fillRect(kX + kW - 5, kY + 10, 1.5, 6); // handle top
  ctx.fillRect(kX + kW - 5, kY + 25, 1.5, 6); // handle bottom

  // Kitchen table
  ctx.fillStyle = '#654321';
  roundRect(ctx, kX + kW / 2 - 18, kY + kH / 2, 36, 24, 3);
  ctx.fill();
  ctx.fillStyle = '#7B5B3A';
  roundRect(ctx, kX + kW / 2 - 16, kY + kH / 2 + 2, 32, 20, 2);
  ctx.fill();
  // Chairs
  ctx.fillStyle = '#5D3A1A';
  roundRect(ctx, kX + kW / 2 - 24, kY + kH / 2 + 6, 8, 12, 2); ctx.fill();
  roundRect(ctx, kX + kW / 2 + 16, kY + kH / 2 + 6, 8, 12, 2); ctx.fill();
  // Plate
  ctx.fillStyle = '#FFF';
  ctx.beginPath(); ctx.arc(kX + kW / 2, kY + kH / 2 + 12, 5, 0, Math.PI * 2); ctx.fill();

  // ═══ BEDROOM (bottom-left) ════════════════════════
  const brX = ox + 10;
  const brY = midY + wallThick / 2 + 5;
  const brW = iw / 2 - wallThick / 2 - 10;
  const brH = ih / 2 - wallThick / 2 - 10;

  // Carpet
  ctx.fillStyle = 'rgba(70,50,100,0.1)';
  roundRect(ctx, brX + 5, brY + 5, brW - 10, brH - 15, 4);
  ctx.fill();

  // Bed
  const bedC = ['#4169E1', '#B22222', '#2E7D32', '#9370DB'][interior.style % 4];
  ctx.fillStyle = '#8B7355';
  roundRect(ctx, brX + 5, brY + 5, 60, 45, 3);
  ctx.fill();
  ctx.fillStyle = bedC;
  roundRect(ctx, brX + 7, brY + 7, 56, 35, 2);
  ctx.fill();
  // Pillow
  ctx.fillStyle = '#FFF';
  roundRect(ctx, brX + 10, brY + 8, 20, 10, 3);
  ctx.fill();
  roundRect(ctx, brX + 35, brY + 8, 20, 10, 3);
  ctx.fill();
  // Blanket fold
  ctx.strokeStyle = darkenColor(bedC, 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(brX + 8, brY + 28); ctx.lineTo(brX + 62, brY + 28); ctx.stroke();

  // Nightstand
  ctx.fillStyle = '#5D3A1A';
  roundRect(ctx, brX + 68, brY + 10, 16, 16, 2);
  ctx.fill();
  // Lamp on nightstand
  ctx.fillStyle = '#888';
  ctx.fillRect(brX + 74, brY + 4, 3, 8);
  ctx.fillStyle = '#FFE4B5';
  ctx.beginPath(); ctx.arc(brX + 75.5, brY + 3, 5, 0, Math.PI * 2); ctx.fill();

  // Dresser
  ctx.fillStyle = '#5D3A1A';
  roundRect(ctx, brX + brW - 35, brY + 5, 30, 22, 2);
  ctx.fill();
  ctx.fillStyle = '#7B5B3A';
  for (let d = 0; d < 3; d++) {
    ctx.fillRect(brX + brW - 33 + d * 9, brY + 8, 8, 7);
    ctx.fillRect(brX + brW - 33 + d * 9, brY + 17, 8, 7);
  }
  // Drawer handles
  ctx.fillStyle = '#D4A017';
  for (let d = 0; d < 3; d++) {
    ctx.beginPath(); ctx.arc(brX + brW - 29 + d * 9, brY + 11.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(brX + brW - 29 + d * 9, brY + 20.5, 1, 0, Math.PI * 2); ctx.fill();
  }

  // Window (on wall)
  ctx.fillStyle = '#87CEEB';
  roundRect(ctx, brX + brW / 2 - 15, brY + brH - 20, 30, 18, 2);
  ctx.fill();
  ctx.strokeStyle = '#8B7355';
  ctx.lineWidth = 2;
  ctx.strokeRect(brX + brW / 2 - 15, brY + brH - 20, 30, 18);
  ctx.beginPath();
  ctx.moveTo(brX + brW / 2, brY + brH - 20); ctx.lineTo(brX + brW / 2, brY + brH - 2);
  ctx.stroke();

  // ═══ BATHROOM (bottom-right) ══════════════════════
  const btX = midX + wallThick / 2 + 5;
  const btY = midY + wallThick / 2 + 5;
  const btW = iw / 2 - wallThick / 2 - 10;
  const btH = ih / 2 - wallThick / 2 - 10;

  // Tile floor (lighter)
  ctx.fillStyle = 'rgba(200,210,220,0.15)';
  for (let tx = 0; tx < 8; tx++) {
    for (let ty = 0; ty < 6; ty++) {
      if ((tx + ty) % 2 === 0) {
        ctx.fillRect(btX + tx * 14, btY + ty * 14, 14, 14);
      }
    }
  }

  // Bathtub (top-right corner)
  ctx.fillStyle = '#E8E8E8';
  roundRect(ctx, btX + btW - 50, btY + 3, 45, 25, 4);
  ctx.fill();
  ctx.fillStyle = '#D0D8E0';
  roundRect(ctx, btX + btW - 47, btY + 6, 39, 19, 3);
  ctx.fill();
  // Water shimmer
  ctx.fillStyle = `rgba(135,206,250,${0.2 + Math.sin(frame * 0.05) * 0.05})`;
  roundRect(ctx, btX + btW - 45, btY + 8, 35, 15, 2);
  ctx.fill();
  // Faucet
  ctx.fillStyle = '#C0C0C0';
  ctx.fillRect(btX + btW - 48, btY + 4, 4, 3);

  // Toilet
  ctx.fillStyle = '#F0F0F0';
  roundRect(ctx, btX + 5, btY + 5, 16, 20, 3);
  ctx.fill();
  ctx.fillStyle = '#E0E0E0';
  roundRect(ctx, btX + 7, btY + 7, 12, 12, 4);
  ctx.fill();
  // Tank
  ctx.fillStyle = '#E8E8E8';
  ctx.fillRect(btX + 6, btY + 3, 14, 6);
  // Handle
  ctx.fillStyle = '#C0C0C0';
  ctx.fillRect(btX + 18, btY + 5, 3, 2);

  // Bathroom sink with mirror
  ctx.fillStyle = '#E8E8E8';
  roundRect(ctx, btX + btW / 2 - 12, btY + 3, 24, 14, 2);
  ctx.fill();
  ctx.fillStyle = '#C0D0E0';
  roundRect(ctx, btX + btW / 2 - 10, btY + 5, 20, 8, 2);
  ctx.fill();
  // Mirror above
  ctx.fillStyle = 'rgba(180,210,230,0.5)';
  roundRect(ctx, btX + btW / 2 - 10, btY - 5, 20, 10, 2);
  ctx.fill();
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.strokeRect(btX + btW / 2 - 10, btY - 5, 20, 10);

  // Bath mat
  ctx.fillStyle = 'rgba(100,149,237,0.2)';
  roundRect(ctx, btX + btW - 42, btY + 30, 28, 12, 3);
  ctx.fill();

  // Towel rack
  ctx.fillStyle = '#888';
  ctx.fillRect(btX + 30, btY + btH - 12, 20, 2);
  ctx.fillStyle = '#FFF';
  roundRect(ctx, btX + 32, btY + btH - 11, 8, 10, 1);
  ctx.fill();
  ctx.fillStyle = '#87CEEB';
  roundRect(ctx, btX + 42, btY + btH - 11, 6, 10, 1);
  ctx.fill();

  // ─── Door (exit) at bottom center ─────────────────
  const doorX = ox + iw / 2 - 18;
  const doorY = oy + ih - 2;
  ctx.fillStyle = '#8B5E3C';
  roundRect(ctx, doorX, doorY, 36, 18, [4, 4, 0, 0]);
  ctx.fill();
  ctx.strokeStyle = '#6B4226';
  ctx.lineWidth = 2;
  ctx.strokeRect(doorX, doorY, 36, 18);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', ox + iw / 2, doorY + 12);
  // Mat
  ctx.fillStyle = 'rgba(139,115,85,0.35)';
  roundRect(ctx, doorX - 4, doorY + 16, 44, 8, 2);
  ctx.fill();

  // ─── House label ──────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.font = 'bold 13px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const label = `${interior.ownerName}'s House`;
  const tw = ctx.measureText(label).width;
  roundRect(ctx, ox + iw / 2 - tw / 2 - 14, oy - wallH - 28, tw + 28, 24, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(label, ox + iw / 2, oy - wallH - 11);

  // ─── Outer border ────────────────────────────────
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 3;
  roundRect(ctx, ox, oy, iw, ih, 4);
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
