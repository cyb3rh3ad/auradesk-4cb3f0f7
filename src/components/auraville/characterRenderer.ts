// ═══════════════════════════════════════════════════════
// AuraVille — High-Quality Character Renderer
// ═══════════════════════════════════════════════════════
import { SpatialProfile, PlayerPosition } from './gameTypes';

// Polyfill-safe roundRect
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  const radii = typeof r === 'number' ? [r, r, r, r] : r;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, radii);
  } else {
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

export function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
}

export function lightenColor(hex: string, factor: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) * factor);
  return `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
}

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
  const isFemale = p.bodyType === 'female';

  // Subtle, natural walk cycle — small values prevent goofy look
  const walkPhase = frame * 0.14;
  const legSwing = isMoving ? Math.sin(walkPhase) * 2 * s : 0;
  const bodyBob = isMoving ? Math.abs(Math.sin(walkPhase)) * 0.6 * s : 0;
  const armSwing = isMoving ? Math.sin(walkPhase) * 1.5 * s : 0;
  const headBob = isMoving ? Math.abs(Math.sin(walkPhase * 0.5)) * 0.2 * s : 0;

  ctx.save();
  ctx.translate(x, y - bodyBob);

  // Shadow (stretches when moving)
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  const shadowStretch = isMoving ? 1.15 : 1;
  ctx.ellipse(0, 16 * s + bodyBob, 10 * s * shadowStretch, 3.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // ─── Legs ─────────────────────────────────────────
  const legW = isFemale ? 2.8 * s : 3.2 * s;
  const legH = 7 * s;
  const legSpacing = isFemale ? 3.2 : 3.8;

  // Left leg
  ctx.save();
  ctx.translate(-legSpacing * s, 5 * s);
  ctx.rotate(isMoving ? Math.sin(walkPhase) * 0.15 : 0);

  if (p.pantsStyle === 3 && isFemale) {
    // Skirt - draw skirt shape instead of individual legs
  } else if (p.pantsStyle === 1) {
    // Shorts
    ctx.fillStyle = p.pantsColor;
    roundRect(ctx, -legW / 2, 0, legW, legH * 0.45, 1 * s);
    ctx.fill();
    ctx.fillStyle = p.skinColor;
    roundRect(ctx, -legW / 2, legH * 0.4, legW, legH * 0.55, 1 * s);
    ctx.fill();
  } else if (p.pantsStyle === 2) {
    // Cargo
    ctx.fillStyle = p.pantsColor;
    roundRect(ctx, -(legW * 0.6), 0, legW * 1.2, legH * 0.9, 1.5 * s);
    ctx.fill();
    // Cargo pocket
    ctx.fillStyle = darkenColor(p.pantsColor, 0.85);
    roundRect(ctx, legW * 0.1, legH * 0.3, legW * 0.4, legH * 0.25, 0.5 * s);
    ctx.fill();
  } else {
    // Jeans / default
    ctx.fillStyle = p.pantsColor;
    roundRect(ctx, -legW / 2, 0, legW, legH * 0.9, 1 * s);
    ctx.fill();
  }
  ctx.restore();

  // Right leg
  ctx.save();
  ctx.translate(legSpacing * s, 5 * s);
  ctx.rotate(isMoving ? -Math.sin(walkPhase) * 0.15 : 0);

  if (p.pantsStyle === 3 && isFemale) {
    // handled by skirt below
  } else if (p.pantsStyle === 1) {
    ctx.fillStyle = p.pantsColor;
    roundRect(ctx, -legW / 2, 0, legW, legH * 0.45, 1 * s);
    ctx.fill();
    ctx.fillStyle = p.skinColor;
    roundRect(ctx, -legW / 2, legH * 0.4, legW, legH * 0.55, 1 * s);
    ctx.fill();
  } else if (p.pantsStyle === 2) {
    ctx.fillStyle = p.pantsColor;
    roundRect(ctx, -(legW * 0.6), 0, legW * 1.2, legH * 0.9, 1.5 * s);
    ctx.fill();
    ctx.fillStyle = darkenColor(p.pantsColor, 0.85);
    roundRect(ctx, -(legW * 0.5), legH * 0.3, legW * 0.4, legH * 0.25, 0.5 * s);
    ctx.fill();
  } else {
    ctx.fillStyle = p.pantsColor;
    roundRect(ctx, -legW / 2, 0, legW, legH * 0.9, 1 * s);
    ctx.fill();
  }
  ctx.restore();

  // Skirt overlay (female only, style 3)
  if (p.pantsStyle === 3 && isFemale) {
    ctx.fillStyle = p.pantsColor;
    ctx.beginPath();
    ctx.moveTo(-5 * s, 3 * s);
    ctx.lineTo(-7 * s, 10 * s);
    ctx.quadraticCurveTo(0, 12 * s, 7 * s, 10 * s);
    ctx.lineTo(5 * s, 3 * s);
    ctx.closePath();
    ctx.fill();
    // Skirt fold detail
    ctx.strokeStyle = darkenColor(p.pantsColor, 0.85);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-2 * s, 4 * s); ctx.lineTo(-3 * s, 10 * s);
    ctx.moveTo(2 * s, 4 * s); ctx.lineTo(3 * s, 10 * s);
    ctx.stroke();
    // Show legs below skirt
    ctx.fillStyle = p.skinColor;
    roundRect(ctx, -3.5 * s, 9 * s, 2.5 * s, 3 * s, 1 * s);
    ctx.fill();
    roundRect(ctx, 1 * s, 9 * s, 2.5 * s, 3 * s, 1 * s);
    ctx.fill();
  }

  // Shoes
  ctx.fillStyle = '#2d2d2d';
  const shoeY = p.pantsStyle === 1 ? 11.5 * s : 12 * s;
  roundRect(ctx, -legSpacing * s - legW / 2 - 0.3 * s, shoeY + legSwing * 0.3, legW + 0.8 * s, 2.2 * s, [0.5 * s, 0.5 * s, 1 * s, 1 * s]);
  ctx.fill();
  roundRect(ctx, legSpacing * s - legW / 2 - 0.3 * s, shoeY - legSwing * 0.3, legW + 0.8 * s, 2.2 * s, [0.5 * s, 0.5 * s, 1 * s, 1 * s]);
  ctx.fill();

  // ─── Body / Torso ─────────────────────────────────
  const bodyW = isFemale ? 11 * s : 12.5 * s;
  const bodyH = isFemale ? 10 * s : 11 * s;
  const shoulderW = isFemale ? bodyW * 0.92 : bodyW;

  // Torso shape
  ctx.fillStyle = p.shirtColor;
  if (isFemale) {
    // Slightly curved torso
    ctx.beginPath();
    ctx.moveTo(-shoulderW / 2, -6 * s);
    ctx.lineTo(-bodyW / 2 - 0.5 * s, -1 * s); // waist indent
    ctx.lineTo(-bodyW / 2, 4 * s);
    ctx.lineTo(bodyW / 2, 4 * s);
    ctx.lineTo(bodyW / 2 + 0.5 * s, -1 * s);
    ctx.lineTo(shoulderW / 2, -6 * s);
    ctx.closePath();
    ctx.fill();
  } else {
    roundRect(ctx, -bodyW / 2, -6 * s, bodyW, bodyH, 2.5 * s);
    ctx.fill();
  }

  // Shirt details
  if (p.shirtStyle === 1) {
    // Hoodie
    ctx.fillStyle = darkenColor(p.shirtColor, 0.88);
    ctx.fillRect(-2.5 * s, -4 * s, 5 * s, 8 * s);
    // Hood edge
    ctx.strokeStyle = darkenColor(p.shirtColor, 0.8);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -6 * s, 4 * s, Math.PI, 0);
    ctx.stroke();
    // Drawstrings
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-1.5 * s, -5 * s); ctx.lineTo(-1.5 * s, -1 * s);
    ctx.moveTo(1.5 * s, -5 * s); ctx.lineTo(1.5 * s, -1 * s);
    ctx.stroke();
    // Pocket
    ctx.fillStyle = darkenColor(p.shirtColor, 0.82);
    roundRect(ctx, -3 * s, 0 * s, 6 * s, 3 * s, 1 * s);
    ctx.fill();
  } else if (p.shirtStyle === 2) {
    // Tank top - show skin on shoulders
    ctx.fillStyle = p.skinColor;
    roundRect(ctx, -shoulderW / 2, -6 * s, 2.5 * s, 4 * s, 0.5 * s);
    ctx.fill();
    roundRect(ctx, shoulderW / 2 - 2.5 * s, -6 * s, 2.5 * s, 4 * s, 0.5 * s);
    ctx.fill();
  } else if (p.shirtStyle === 3) {
    // Polo
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(-3.5 * s, -6 * s); ctx.lineTo(0, -3.5 * s); ctx.lineTo(3.5 * s, -6 * s);
    ctx.closePath();
    ctx.fill();
    // Collar folds
    ctx.strokeStyle = darkenColor(p.shirtColor, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3 * s, -6 * s); ctx.lineTo(-1.5 * s, -4.5 * s);
    ctx.moveTo(3 * s, -6 * s); ctx.lineTo(1.5 * s, -4.5 * s);
    ctx.stroke();
    // Buttons
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(0, -3 * s + i * 2 * s, 0.5 * s, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // T-Shirt - subtle collar and hem
    ctx.strokeStyle = darkenColor(p.shirtColor, 0.85);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -5.5 * s, 3 * s, Math.PI + 0.4, -0.4);
    ctx.stroke();
    // Sleeve hems
    ctx.beginPath();
    ctx.moveTo(-shoulderW / 2, -3 * s); ctx.lineTo(-shoulderW / 2 - 1 * s, -3 * s);
    ctx.moveTo(shoulderW / 2, -3 * s); ctx.lineTo(shoulderW / 2 + 1 * s, -3 * s);
    ctx.stroke();
  }

  // ─── Arms ─────────────────────────────────────────
  const armW = isFemale ? 2.2 * s : 2.8 * s;
  const armH = isFemale ? 7.5 * s : 8.5 * s;
  const armX = isFemale ? shoulderW / 2 + 0.5 * s : bodyW / 2 + 0.5 * s;

  // Left arm
  ctx.save();
  ctx.translate(-armX, -3 * s);
  ctx.rotate(isMoving ? Math.sin(walkPhase) * 0.2 : 0);
  // Sleeve
  ctx.fillStyle = p.shirtStyle === 2 ? p.skinColor : p.shirtColor;
  roundRect(ctx, -armW / 2, 0, armW, armH * 0.4, 1 * s);
  ctx.fill();
  // Skin
  ctx.fillStyle = p.skinColor;
  roundRect(ctx, -armW / 2, armH * 0.35, armW, armH * 0.65, 1 * s);
  ctx.fill();
  // Hand
  ctx.beginPath();
  ctx.arc(0, armH, armW * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right arm
  ctx.save();
  ctx.translate(armX, -3 * s);
  ctx.rotate(isMoving ? -Math.sin(walkPhase) * 0.2 : 0);
  ctx.fillStyle = p.shirtStyle === 2 ? p.skinColor : p.shirtColor;
  roundRect(ctx, -armW / 2, 0, armW, armH * 0.4, 1 * s);
  ctx.fill();
  ctx.fillStyle = p.skinColor;
  roundRect(ctx, -armW / 2, armH * 0.35, armW, armH * 0.65, 1 * s);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, armH, armW * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ─── Head ─────────────────────────────────────────
  const headRadius = isFemale ? 6.2 * s : 6.5 * s;
  const headY = -11 * s - headBob;

  ctx.fillStyle = p.skinColor;
  ctx.beginPath();
  ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // Neck
  ctx.fillStyle = p.skinColor;
  ctx.fillRect(-2 * s, headY + headRadius - 1 * s, 4 * s, 3 * s);

  // Ears
  ctx.beginPath(); ctx.arc(-headRadius + 0.5 * s, headY + 0.5 * s, 1.8 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(headRadius - 0.5 * s, headY + 0.5 * s, 1.8 * s, 0, Math.PI * 2); ctx.fill();
  // Inner ear
  ctx.fillStyle = darkenColor(p.skinColor, 0.9);
  ctx.beginPath(); ctx.arc(-headRadius + 0.5 * s, headY + 0.5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(headRadius - 0.5 * s, headY + 0.5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();

  // ─── Hair ─────────────────────────────────────────
  drawHair(ctx, p, headY, headRadius, s, dir);

  // ─── Face ─────────────────────────────────────────
  if (dir !== 'up') {
    drawFace(ctx, p, headY, s, dir);
  }

  ctx.restore();
}

function drawHair(
  ctx: CanvasRenderingContext2D,
  p: SpatialProfile,
  headY: number,
  headR: number,
  s: number,
  dir: PlayerPosition['direction']
) {
  ctx.fillStyle = p.hairColor;
  const topY = headY - headR;

  if (p.hairStyle === 0) {
    // Buzz Cut - close to head, textured
    ctx.beginPath();
    ctx.arc(0, headY - 1.5 * s, headR + 0.5 * s, Math.PI + 0.15, -0.15);
    ctx.fill();
    // Texture dots
    ctx.fillStyle = darkenColor(p.hairColor, 0.9);
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI + 0.3 + (i / 8) * (Math.PI - 0.6);
      const rx = Math.cos(angle) * (headR - 1 * s);
      const ry = Math.sin(angle) * (headR - 1 * s);
      ctx.beginPath();
      ctx.arc(rx, headY - 1.5 * s + ry, 0.6 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (p.hairStyle === 1) {
    // Short - layered on top with volume
    ctx.beginPath();
    ctx.arc(0, headY - 1 * s, headR + 1.5 * s, Math.PI + 0.2, -0.2);
    ctx.fill();
    // Volume layers
    ctx.fillStyle = lightenColor(p.hairColor, 1.1);
    ctx.beginPath();
    ctx.arc(-2 * s, topY + 1 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2 * s, topY + 0.5 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();
    // Side taper
    ctx.fillStyle = p.hairColor;
    ctx.beginPath();
    ctx.moveTo(-headR - 0.5 * s, headY - 2 * s);
    ctx.quadraticCurveTo(-headR - 1 * s, headY + 1 * s, -headR + 1 * s, headY + 2 * s);
    ctx.lineTo(-headR + 1 * s, headY - 2 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(headR + 0.5 * s, headY - 2 * s);
    ctx.quadraticCurveTo(headR + 1 * s, headY + 1 * s, headR - 1 * s, headY + 2 * s);
    ctx.lineTo(headR - 1 * s, headY - 2 * s);
    ctx.fill();
  } else if (p.hairStyle === 2) {
    // Medium - flowing with parting, covers ears
    ctx.beginPath();
    ctx.arc(0, headY - 0.5 * s, headR + 2.5 * s, Math.PI + 0.1, -0.1);
    ctx.fill();
    // Side curtains that flow down
    // Left side
    ctx.beginPath();
    ctx.moveTo(-headR - 1.5 * s, headY - 3 * s);
    ctx.quadraticCurveTo(-headR - 2.5 * s, headY + 2 * s, -headR - 1 * s, headY + 5 * s);
    ctx.quadraticCurveTo(-headR + 1 * s, headY + 4 * s, -headR + 1 * s, headY - 1 * s);
    ctx.fill();
    // Right side
    ctx.beginPath();
    ctx.moveTo(headR + 1.5 * s, headY - 3 * s);
    ctx.quadraticCurveTo(headR + 2.5 * s, headY + 2 * s, headR + 1 * s, headY + 5 * s);
    ctx.quadraticCurveTo(headR - 1 * s, headY + 4 * s, headR - 1 * s, headY - 1 * s);
    ctx.fill();
    // Parting highlight
    ctx.fillStyle = lightenColor(p.hairColor, 1.15);
    ctx.beginPath();
    ctx.moveTo(-1 * s, topY);
    ctx.quadraticCurveTo(0, topY - 1 * s, 1 * s, topY);
    ctx.quadraticCurveTo(0, topY + 2 * s, -1 * s, topY);
    ctx.fill();
    // Strand detail
    ctx.strokeStyle = darkenColor(p.hairColor, 0.85);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-3 * s, topY + 1 * s); ctx.quadraticCurveTo(-headR - 0.5 * s, headY, -headR - 0.5 * s, headY + 4 * s);
    ctx.moveTo(3 * s, topY + 1 * s); ctx.quadraticCurveTo(headR + 0.5 * s, headY, headR + 0.5 * s, headY + 4 * s);
    ctx.stroke();
  } else if (p.hairStyle === 3) {
    // Long - flowing past shoulders with layered strands
    ctx.beginPath();
    ctx.arc(0, headY - 0.5 * s, headR + 2.5 * s, Math.PI + 0.05, -0.05);
    ctx.fill();
    // Long flowing sides
    const longLen = 14 * s;
    // Left cascade
    ctx.beginPath();
    ctx.moveTo(-headR - 1.5 * s, headY - 4 * s);
    ctx.bezierCurveTo(-headR - 3 * s, headY, -headR - 2 * s, headY + longLen * 0.5, -headR * 0.8, headY + longLen);
    ctx.bezierCurveTo(-headR * 0.3, headY + longLen - 2 * s, -headR + 2 * s, headY + 4 * s, -headR + 1 * s, headY - 1 * s);
    ctx.fill();
    // Right cascade
    ctx.beginPath();
    ctx.moveTo(headR + 1.5 * s, headY - 4 * s);
    ctx.bezierCurveTo(headR + 3 * s, headY, headR + 2 * s, headY + longLen * 0.5, headR * 0.8, headY + longLen);
    ctx.bezierCurveTo(headR * 0.3, headY + longLen - 2 * s, headR - 2 * s, headY + 4 * s, headR - 1 * s, headY - 1 * s);
    ctx.fill();
    // Back hair (visible behind)
    ctx.fillStyle = darkenColor(p.hairColor, 0.88);
    ctx.beginPath();
    ctx.moveTo(-headR + 1 * s, headY + 2 * s);
    ctx.quadraticCurveTo(-headR * 0.5, headY + longLen + 2 * s, 0, headY + longLen + 3 * s);
    ctx.quadraticCurveTo(headR * 0.5, headY + longLen + 2 * s, headR - 1 * s, headY + 2 * s);
    ctx.fill();
    // Strand highlights
    ctx.fillStyle = lightenColor(p.hairColor, 1.15);
    ctx.strokeStyle = lightenColor(p.hairColor, 1.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2 * s, topY + 1 * s);
    ctx.bezierCurveTo(-headR * 0.7, headY + 2 * s, -headR - 0.5 * s, headY + 6 * s, -headR * 0.6, headY + longLen - 2 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2 * s, topY + 1 * s);
    ctx.bezierCurveTo(headR * 0.7, headY + 2 * s, headR + 0.5 * s, headY + 6 * s, headR * 0.6, headY + longLen - 2 * s);
    ctx.stroke();
  } else if (p.hairStyle === 4) {
    // Mohawk - sharp styled spikes
    ctx.fillStyle = p.hairColor;
    // Base strip
    ctx.beginPath();
    ctx.moveTo(-2 * s, headY + headR * 0.3);
    ctx.lineTo(-2.5 * s, topY);
    ctx.lineTo(-1.5 * s, topY - 6 * s);
    ctx.lineTo(0, topY - 8 * s);
    ctx.lineTo(1.5 * s, topY - 6 * s);
    ctx.lineTo(2.5 * s, topY);
    ctx.lineTo(2 * s, headY + headR * 0.3);
    ctx.closePath();
    ctx.fill();
    // Spike highlights
    ctx.fillStyle = lightenColor(p.hairColor, 1.2);
    ctx.beginPath();
    ctx.moveTo(-0.5 * s, topY);
    ctx.lineTo(0, topY - 7 * s);
    ctx.lineTo(0.5 * s, topY);
    ctx.closePath();
    ctx.fill();
    // Shaved sides texture
    ctx.fillStyle = darkenColor(p.skinColor, 0.92);
    ctx.beginPath();
    ctx.arc(0, headY - 1 * s, headR + 0.3 * s, Math.PI + 0.5, Math.PI + 1.3);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, headY - 1 * s, headR + 0.3 * s, -0.3, -1.3, true);
    ctx.fill();
  } else if (p.hairStyle === 5) {
    // Ponytail
    ctx.beginPath();
    ctx.arc(0, headY - 0.5 * s, headR + 1.5 * s, Math.PI + 0.15, -0.15);
    ctx.fill();
    // Side framing
    ctx.beginPath();
    ctx.moveTo(-headR - 0.5 * s, headY - 2 * s);
    ctx.quadraticCurveTo(-headR - 1 * s, headY + 1 * s, -headR + 0.5 * s, headY + 3 * s);
    ctx.lineTo(-headR + 1.5 * s, headY - 1 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(headR + 0.5 * s, headY - 2 * s);
    ctx.quadraticCurveTo(headR + 1 * s, headY + 1 * s, headR - 0.5 * s, headY + 3 * s);
    ctx.lineTo(headR - 1.5 * s, headY - 1 * s);
    ctx.fill();
    // Ponytail at back
    if (dir !== 'down') {
      ctx.beginPath();
      ctx.moveTo(0, headY - 2 * s);
      ctx.bezierCurveTo(3 * s, headY, 4 * s, headY + 8 * s, 2 * s, headY + 14 * s);
      ctx.bezierCurveTo(0, headY + 12 * s, -1 * s, headY + 4 * s, 0, headY - 2 * s);
      ctx.fill();
    }
    // Hair tie
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, headY - 1 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  p: SpatialProfile,
  headY: number,
  s: number,
  dir: PlayerPosition['direction']
) {
  const eyeY = headY + 0.5 * s;
  const eyeSpacing = 2.8 * s;
  const isFemale = p.bodyType === 'female';

  if (p.faceStyle === 1) {
    // Cool - sunglasses
    ctx.fillStyle = '#111';
    roundRect(ctx, -eyeSpacing - 2 * s, eyeY - 1.5 * s, 4 * s, 3 * s, 1 * s);
    ctx.fill();
    roundRect(ctx, eyeSpacing - 2 * s, eyeY - 1.5 * s, 4 * s, 3 * s, 1 * s);
    ctx.fill();
    // Bridge
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-eyeSpacing + 2 * s, eyeY);
    ctx.lineTo(eyeSpacing - 2 * s, eyeY);
    ctx.stroke();
    // Glare
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-eyeSpacing - 1 * s, eyeY - 1 * s, 1.5 * s, 1 * s);
    ctx.fillRect(eyeSpacing - 1 * s, eyeY - 1 * s, 1.5 * s, 1 * s);
  } else if (p.faceStyle === 3) {
    // Wink
    // Open eye
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-eyeSpacing, eyeY, 1.8 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4A3728';
    ctx.beginPath(); ctx.arc(-eyeSpacing, eyeY, 1.2 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-eyeSpacing, eyeY + 0.1 * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-eyeSpacing - 0.3 * s, eyeY - 0.4 * s, 0.4 * s, 0, Math.PI * 2); ctx.fill();
    // Winking eye
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(eyeSpacing - 2 * s, eyeY);
    ctx.quadraticCurveTo(eyeSpacing, eyeY - 1.5 * s, eyeSpacing + 2 * s, eyeY);
    ctx.stroke();
  } else {
    // Normal / Chill eyes
    const eyeSize = isFemale ? 2 * s : 1.8 * s;
    // Eye whites
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2); ctx.fill();
    // Iris
    ctx.fillStyle = '#5D4037';
    const irisSize = eyeSize * 0.65;
    ctx.beginPath(); ctx.arc(-eyeSpacing, eyeY + 0.2 * s, irisSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeSpacing, eyeY + 0.2 * s, irisSize, 0, Math.PI * 2); ctx.fill();
    // Pupil
    ctx.fillStyle = '#222';
    const pupilSize = irisSize * 0.6;
    ctx.beginPath(); ctx.arc(-eyeSpacing, eyeY + 0.3 * s, pupilSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeSpacing, eyeY + 0.3 * s, pupilSize, 0, Math.PI * 2); ctx.fill();
    // Glint
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-eyeSpacing - 0.4 * s, eyeY - 0.3 * s, 0.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeSpacing - 0.4 * s, eyeY - 0.3 * s, 0.5 * s, 0, Math.PI * 2); ctx.fill();

    // Eyelashes for female
    if (isFemale) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.2;
      [-1, 1].forEach(side => {
        const ex = side * eyeSpacing;
        ctx.beginPath();
        ctx.moveTo(ex - 1.5 * s, eyeY - eyeSize + 0.3 * s);
        ctx.lineTo(ex - 2 * s, eyeY - eyeSize - 1 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ex + 1.5 * s, eyeY - eyeSize + 0.3 * s);
        ctx.lineTo(ex + 2 * s, eyeY - eyeSize - 1 * s);
        ctx.stroke();
      });
    }
  }

  // Cheeks / blush
  ctx.fillStyle = isFemale ? 'rgba(255,130,130,0.25)' : 'rgba(255,150,150,0.15)';
  ctx.beginPath(); ctx.ellipse(-4 * s, headY + 3 * s, 1.8 * s, 1.2 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4 * s, headY + 3 * s, 1.8 * s, 1.2 * s, 0, 0, Math.PI * 2); ctx.fill();

  // Mouth
  const mouthY = headY + 3.5 * s;
  if (p.faceStyle === 0) {
    // Happy smile
    ctx.strokeStyle = '#6D4C41';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, mouthY - 1 * s, 2 * s, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (p.faceStyle === 2) {
    // Chill / neutral
    ctx.strokeStyle = '#6D4C41';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-1.5 * s, mouthY); ctx.lineTo(1.5 * s, mouthY);
    ctx.stroke();
  } else if (p.faceStyle === 1) {
    // Cool smirk
    ctx.strokeStyle = '#6D4C41';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-1.5 * s, mouthY);
    ctx.quadraticCurveTo(0, mouthY + 0.5 * s, 2 * s, mouthY - 0.8 * s);
    ctx.stroke();
  } else if (p.faceStyle === 3) {
    // Wink smile
    ctx.strokeStyle = '#6D4C41';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, mouthY - 0.5 * s, 1.8 * s, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  // Nose hint
  ctx.fillStyle = darkenColor(p.skinColor, 0.93);
  ctx.beginPath();
  ctx.moveTo(-0.5 * s, headY + 1 * s);
  ctx.lineTo(0, headY + 2.2 * s);
  ctx.lineTo(0.5 * s, headY + 1 * s);
  ctx.fill();
}
