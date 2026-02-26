// ═══════════════════════════════════════════════════════
// AuraVille — Directional Character Renderer
// Side-view for left/right, front/back for down/up
// ═══════════════════════════════════════════════════════
import { SpatialProfile, PlayerPosition } from './gameTypes';

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
  if (dir === 'left' || dir === 'right') {
    drawSideView(ctx, x, y, p, dir, isMoving, frame, scale);
  } else if (dir === 'up') {
    drawBackView(ctx, x, y, p, isMoving, frame, scale);
  } else {
    drawFrontView(ctx, x, y, p, isMoving, frame, scale);
  }
}

// ═══════════════════════════════════════════════════════
// SIDE VIEW (left / right)
// ═══════════════════════════════════════════════════════
function drawSideView(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  p: SpatialProfile,
  dir: 'left' | 'right',
  isMoving: boolean,
  frame: number,
  s: number
) {
  const flip = dir === 'left' ? -1 : 1;
  const isFemale = p.bodyType === 'female';

  // Walk cycle: smooth sine-based stepping
  const walkSpeed = 0.12;
  const phase = frame * walkSpeed;
  // Legs move in opposition; body barely bobs
  const frontLegAngle = isMoving ? Math.sin(phase) * 0.45 : 0;
  const backLegAngle = isMoving ? Math.sin(phase + Math.PI) * 0.45 : 0;
  const bodyBob = isMoving ? Math.abs(Math.sin(phase * 2)) * 0.8 * s : 0;
  const armFrontAngle = isMoving ? Math.sin(phase + Math.PI) * 0.35 : 0.1;
  const armBackAngle = isMoving ? Math.sin(phase) * 0.35 : -0.1;

  ctx.save();
  ctx.translate(x, y - bodyBob);
  ctx.scale(flip, 1);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  ctx.beginPath();
  ctx.ellipse(0, 16 * s + bodyBob, 8 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  const legLen = 7 * s;
  const legW = isFemale ? 2.6 * s : 3 * s;
  const bodyW = isFemale ? 7 * s : 8.5 * s;
  const bodyH = isFemale ? 10 * s : 11 * s;
  const headR = isFemale ? 5.8 * s : 6.2 * s;
  const headY = -11 * s;

  // ─── Back leg (behind body) ─────────
  ctx.save();
  ctx.translate(-1 * s, 5 * s);
  ctx.rotate(backLegAngle);
  // Pants
  ctx.fillStyle = p.pantsColor;
  roundRect(ctx, -legW / 2, 0, legW, legLen * 0.85, 1.5 * s);
  ctx.fill();
  // Shoe
  ctx.fillStyle = '#2d2d2d';
  roundRect(ctx, -legW / 2 - 0.5 * s, legLen * 0.8, legW + 2 * s, 2.5 * s, 1 * s);
  ctx.fill();
  ctx.restore();

  // ─── Back arm (behind body) ─────────
  const armW = isFemale ? 2 * s : 2.6 * s;
  const armLen = isFemale ? 7 * s : 8 * s;
  ctx.save();
  ctx.translate(-0.5 * s, -4 * s);
  ctx.rotate(armBackAngle);
  ctx.fillStyle = p.shirtColor;
  roundRect(ctx, -armW / 2, 0, armW, armLen * 0.4, 1 * s);
  ctx.fill();
  ctx.fillStyle = p.skinColor;
  roundRect(ctx, -armW / 2, armLen * 0.35, armW, armLen * 0.55, 1 * s);
  ctx.fill();
  // Hand
  ctx.beginPath();
  ctx.arc(0, armLen * 0.85, armW * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ─── Body / Torso (side profile = narrower) ───
  ctx.fillStyle = p.shirtColor;
  if (isFemale) {
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2, -6 * s);
    ctx.quadraticCurveTo(-bodyW / 2 - 0.8 * s, -1 * s, -bodyW / 2, 4 * s);
    ctx.lineTo(bodyW / 2, 4 * s);
    ctx.quadraticCurveTo(bodyW / 2 + 0.8 * s, -1 * s, bodyW / 2, -6 * s);
    ctx.closePath();
    ctx.fill();
  } else {
    roundRect(ctx, -bodyW / 2, -6 * s, bodyW, bodyH, 2 * s);
    ctx.fill();
  }

  // Shirt detail (side view: just a subtle seam line)
  ctx.strokeStyle = darkenColor(p.shirtColor, 0.85);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -5 * s);
  ctx.lineTo(0, 3 * s);
  ctx.stroke();

  // ─── Front leg (in front of body) ───
  ctx.save();
  ctx.translate(1 * s, 5 * s);
  ctx.rotate(frontLegAngle);
  ctx.fillStyle = p.pantsColor;
  roundRect(ctx, -legW / 2, 0, legW, legLen * 0.85, 1.5 * s);
  ctx.fill();
  // Shoe
  ctx.fillStyle = '#2d2d2d';
  roundRect(ctx, -legW / 2 - 0.5 * s, legLen * 0.8, legW + 2 * s, 2.5 * s, 1 * s);
  ctx.fill();
  ctx.restore();

  // ─── Front arm (in front of body) ──
  ctx.save();
  ctx.translate(1.5 * s, -4 * s);
  ctx.rotate(armFrontAngle);
  ctx.fillStyle = p.shirtColor;
  roundRect(ctx, -armW / 2, 0, armW, armLen * 0.4, 1 * s);
  ctx.fill();
  ctx.fillStyle = p.skinColor;
  roundRect(ctx, -armW / 2, armLen * 0.35, armW, armLen * 0.55, 1 * s);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, armLen * 0.85, armW * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ─── Head (side profile) ──────────
  ctx.fillStyle = p.skinColor;
  // Slightly oval for profile
  ctx.beginPath();
  ctx.ellipse(0, headY, headR * 0.9, headR, 0, 0, Math.PI * 2);
  ctx.fill();

  // Neck
  ctx.fillRect(-1.5 * s, headY + headR - 1 * s, 3 * s, 3 * s);

  // Ear (only one visible from side)
  ctx.beginPath();
  ctx.arc(-headR * 0.8, headY + 0.5 * s, 1.6 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = darkenColor(p.skinColor, 0.9);
  ctx.beginPath();
  ctx.arc(-headR * 0.8, headY + 0.5 * s, 0.9 * s, 0, Math.PI * 2);
  ctx.fill();

  // ─── Hair (side) ──────────────────
  drawHairSide(ctx, p, headY, headR, s);

  // ─── Face (side profile) ──────────
  drawFaceSide(ctx, p, headY, headR, s);

  ctx.restore();
}

// ═══════════════════════════════════════════════════════
// FRONT VIEW (facing down / camera)
// ═══════════════════════════════════════════════════════
function drawFrontView(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  p: SpatialProfile,
  isMoving: boolean,
  frame: number,
  s: number
) {
  const isFemale = p.bodyType === 'female';
  const phase = frame * 0.12;
  const bodyBob = isMoving ? Math.abs(Math.sin(phase * 2)) * 0.5 * s : 0;
  // For front/back: legs step forward/back = vertical offset + subtle scale for depth
  const leftLegStep = isMoving ? Math.sin(phase) * 2.5 * s : 0;
  const rightLegStep = isMoving ? Math.sin(phase + Math.PI) * 2.5 * s : 0;
  // Leg that steps "forward" (toward camera) appears slightly wider
  const leftLegScale = isMoving ? 1 + Math.sin(phase) * 0.08 : 1;
  const rightLegScale = isMoving ? 1 + Math.sin(phase + Math.PI) * 0.08 : 1;

  ctx.save();
  ctx.translate(x, y - bodyBob);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  ctx.beginPath();
  ctx.ellipse(0, 16 * s + bodyBob, 9 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  const legW = isFemale ? 2.8 * s : 3.2 * s;
  const legH = 7 * s;
  const legSpacing = isFemale ? 3 : 3.6;
  const bodyW = isFemale ? 11 * s : 12.5 * s;
  const bodyH = isFemale ? 10 * s : 11 * s;
  const shoulderW = isFemale ? bodyW * 0.92 : bodyW;
  const headR = isFemale ? 6.2 * s : 6.5 * s;
  const headY = -11 * s;

  // ─── Legs (vertical stepping for front view) ────────────
  // Back leg first (the one stepping away from camera — slightly higher & narrower)
  const drawLeg = (xOff: number, stepY: number, scaleW: number) => {
    ctx.save();
    ctx.translate(xOff, 5 * s + stepY);
    const w = legW * scaleW;
    ctx.fillStyle = p.pantsColor;
    roundRect(ctx, -w / 2, 0, w, legH * 0.85, 1.5 * s);
    ctx.fill();
    ctx.fillStyle = '#2d2d2d';
    roundRect(ctx, -w / 2 - 0.3 * s, legH * 0.78, w + 0.8 * s, 2.2 * s, 1 * s);
    ctx.fill();
    ctx.restore();
  };

  // Draw the leg stepping backward first (behind), then forward leg on top
  if (leftLegStep < rightLegStep) {
    drawLeg(-legSpacing * s, leftLegStep, leftLegScale);
    drawLeg(legSpacing * s, rightLegStep, rightLegScale);
  } else {
    drawLeg(legSpacing * s, rightLegStep, rightLegScale);
    drawLeg(-legSpacing * s, leftLegStep, leftLegScale);
  }

  // Skirt (female style 3)
  if (p.pantsStyle === 3 && isFemale) {
    ctx.fillStyle = p.pantsColor;
    ctx.beginPath();
    ctx.moveTo(-5 * s, 3 * s);
    ctx.lineTo(-7 * s, 10 * s);
    ctx.quadraticCurveTo(0, 12 * s, 7 * s, 10 * s);
    ctx.lineTo(5 * s, 3 * s);
    ctx.closePath();
    ctx.fill();
  }

  // ─── Torso ───────────
  ctx.fillStyle = p.shirtColor;
  if (isFemale) {
    ctx.beginPath();
    ctx.moveTo(-shoulderW / 2, -6 * s);
    ctx.lineTo(-bodyW / 2 - 0.5 * s, -1 * s);
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

  // Shirt collar
  ctx.strokeStyle = darkenColor(p.shirtColor, 0.85);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -5.5 * s, 3 * s, Math.PI + 0.4, -0.4);
  ctx.stroke();

  // ─── Arms (subtle forward/back motion via scale, not rotation) ────────────
  const armW = isFemale ? 2.2 * s : 2.8 * s;
  const armH = isFemale ? 7.5 * s : 8.5 * s;
  const armX = isFemale ? shoulderW / 2 + 0.5 * s : bodyW / 2 + 0.5 * s;
  // Arms swing opposite to their side's leg — scale to simulate depth
  const leftArmScale = isMoving ? 1 + Math.sin(phase + Math.PI) * 0.06 : 1;
  const rightArmScale = isMoving ? 1 + Math.sin(phase) * 0.06 : 1;
  const leftArmY = isMoving ? Math.sin(phase + Math.PI) * 1.2 * s : 0;
  const rightArmY = isMoving ? Math.sin(phase) * 1.2 * s : 0;

  [[-1, leftArmScale, leftArmY], [1, rightArmScale, rightArmY]].forEach(([side, scaleF, yOff]) => {
    ctx.save();
    ctx.translate((side as number) * armX, -3 * s + (yOff as number));
    const w = armW * (scaleF as number);
    ctx.fillStyle = p.shirtColor;
    roundRect(ctx, -w / 2, 0, w, armH * 0.4, 1 * s);
    ctx.fill();
    ctx.fillStyle = p.skinColor;
    roundRect(ctx, -w / 2, armH * 0.35, w, armH * 0.55, 1 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, armH * 0.85, w * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // ─── Head ────────────
  ctx.fillStyle = p.skinColor;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  // Neck
  ctx.fillRect(-2 * s, headY + headR - 1 * s, 4 * s, 3 * s);
  // Ears
  ctx.beginPath(); ctx.arc(-headR + 0.5 * s, headY + 0.5 * s, 1.8 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(headR - 0.5 * s, headY + 0.5 * s, 1.8 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = darkenColor(p.skinColor, 0.9);
  ctx.beginPath(); ctx.arc(-headR + 0.5 * s, headY + 0.5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(headR - 0.5 * s, headY + 0.5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();

  // Hair
  drawHairFront(ctx, p, headY, headR, s);
  // Face
  drawFaceFront(ctx, p, headY, s);

  ctx.restore();
}

// ═══════════════════════════════════════════════════════
// BACK VIEW (facing up)
// ═══════════════════════════════════════════════════════
function drawBackView(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  p: SpatialProfile,
  isMoving: boolean,
  frame: number,
  s: number
) {
  const isFemale = p.bodyType === 'female';
  const phase = frame * 0.12;
  const bodyBob = isMoving ? Math.abs(Math.sin(phase * 2)) * 0.5 * s : 0;
  // Same vertical stepping as front view
  const leftLegStep = isMoving ? Math.sin(phase) * 2.5 * s : 0;
  const rightLegStep = isMoving ? Math.sin(phase + Math.PI) * 2.5 * s : 0;
  const leftLegScale = isMoving ? 1 + Math.sin(phase) * 0.08 : 1;
  const rightLegScale = isMoving ? 1 + Math.sin(phase + Math.PI) * 0.08 : 1;

  ctx.save();
  ctx.translate(x, y - bodyBob);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  ctx.beginPath();
  ctx.ellipse(0, 16 * s + bodyBob, 9 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  const legW = isFemale ? 2.8 * s : 3.2 * s;
  const legH = 7 * s;
  const legSpacing = isFemale ? 3 : 3.6;
  const bodyW = isFemale ? 11 * s : 12.5 * s;
  const bodyH = isFemale ? 10 * s : 11 * s;
  const headR = isFemale ? 6.2 * s : 6.5 * s;
  const headY = -11 * s;

  // Legs with vertical stepping
  const drawLeg = (xOff: number, stepY: number, scaleW: number) => {
    ctx.save();
    ctx.translate(xOff, 5 * s + stepY);
    const w = legW * scaleW;
    ctx.fillStyle = p.pantsColor;
    roundRect(ctx, -w / 2, 0, w, legH * 0.85, 1.5 * s);
    ctx.fill();
    ctx.fillStyle = '#2d2d2d';
    roundRect(ctx, -w / 2 - 0.3 * s, legH * 0.78, w + 0.8 * s, 2.2 * s, 1 * s);
    ctx.fill();
    ctx.restore();
  };

  // Draw back-stepping leg first, then front-stepping on top
  if (leftLegStep > rightLegStep) {
    drawLeg(-legSpacing * s, leftLegStep, leftLegScale);
    drawLeg(legSpacing * s, rightLegStep, rightLegScale);
  } else {
    drawLeg(legSpacing * s, rightLegStep, rightLegScale);
    drawLeg(-legSpacing * s, leftLegStep, leftLegScale);
  }

  // Torso
  ctx.fillStyle = p.shirtColor;
  roundRect(ctx, -bodyW / 2, -6 * s, bodyW, bodyH, 2.5 * s);
  ctx.fill();
  // Back seam
  ctx.strokeStyle = darkenColor(p.shirtColor, 0.88);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -5 * s);
  ctx.lineTo(0, 3 * s);
  ctx.stroke();

  // Arms with depth-based motion (same approach as front)
  const armW = isFemale ? 2.2 * s : 2.8 * s;
  const armH = isFemale ? 7.5 * s : 8.5 * s;
  const armX = bodyW / 2 + 0.5 * s;
  const leftArmScale = isMoving ? 1 + Math.sin(phase + Math.PI) * 0.06 : 1;
  const rightArmScale = isMoving ? 1 + Math.sin(phase) * 0.06 : 1;
  const leftArmY = isMoving ? Math.sin(phase + Math.PI) * 1.2 * s : 0;
  const rightArmY = isMoving ? Math.sin(phase) * 1.2 * s : 0;

  [[-1, leftArmScale, leftArmY], [1, rightArmScale, rightArmY]].forEach(([side, scaleF, yOff]) => {
    ctx.save();
    ctx.translate((side as number) * armX, -3 * s + (yOff as number));
    const w = armW * (scaleF as number);
    ctx.fillStyle = p.shirtColor;
    roundRect(ctx, -w / 2, 0, w, armH * 0.4, 1 * s);
    ctx.fill();
    ctx.fillStyle = p.skinColor;
    roundRect(ctx, -w / 2, armH * 0.35, w, armH * 0.55, 1 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, armH * 0.85, w * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Head
  ctx.fillStyle = p.skinColor;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-2 * s, headY + headR - 1 * s, 4 * s, 3 * s);
  // Ears
  ctx.beginPath(); ctx.arc(-headR + 0.5 * s, headY + 0.5 * s, 1.8 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(headR - 0.5 * s, headY + 0.5 * s, 1.8 * s, 0, Math.PI * 2); ctx.fill();

  // Hair (back view — covers most of the head)
  drawHairBack(ctx, p, headY, headR, s);

  ctx.restore();
}

// ═══════════════════════════════════════════════════════
// HAIR — SIDE VIEW
// ═══════════════════════════════════════════════════════
function drawHairSide(ctx: CanvasRenderingContext2D, p: SpatialProfile, headY: number, headR: number, s: number) {
  ctx.fillStyle = p.hairColor;
  const topY = headY - headR;

  if (p.hairStyle === 0) {
    // Buzz cut
    ctx.beginPath();
    ctx.ellipse(0, headY - 1.5 * s, headR * 0.85, headR + 0.5 * s, 0, Math.PI + 0.2, -0.2);
    ctx.fill();
  } else if (p.hairStyle === 1) {
    // Short — side profile with volume on top
    ctx.beginPath();
    ctx.ellipse(0, headY - 1 * s, headR * 0.85 + 1 * s, headR + 1.5 * s, 0, Math.PI + 0.3, -0.3);
    ctx.fill();
    // Swept fringe
    ctx.fillStyle = lightenColor(p.hairColor, 1.1);
    ctx.beginPath();
    ctx.moveTo(headR * 0.5, topY - 1 * s);
    ctx.quadraticCurveTo(headR * 0.9, topY, headR * 0.7, topY + 3 * s);
    ctx.quadraticCurveTo(0, topY + 1 * s, headR * 0.5, topY - 1 * s);
    ctx.fill();
  } else if (p.hairStyle === 2) {
    // Medium — falls to jawline
    ctx.beginPath();
    ctx.ellipse(0, headY - 0.5 * s, headR * 0.85 + 2 * s, headR + 2.5 * s, 0, Math.PI + 0.1, -0.1);
    ctx.fill();
    // Side curtain flowing down
    ctx.beginPath();
    ctx.moveTo(headR * 0.6, topY);
    ctx.bezierCurveTo(headR + 1 * s, headY - 2 * s, headR + 1.5 * s, headY + 2 * s, headR * 0.7, headY + 5 * s);
    ctx.lineTo(headR * 0.4, headY + 3 * s);
    ctx.quadraticCurveTo(headR * 0.3, headY, headR * 0.6, topY);
    ctx.fill();
    // Back hair
    ctx.beginPath();
    ctx.moveTo(-headR * 0.6, topY + 1 * s);
    ctx.bezierCurveTo(-headR - 0.5 * s, headY, -headR - 1 * s, headY + 3 * s, -headR * 0.5, headY + 6 * s);
    ctx.lineTo(-headR * 0.3, headY + 3 * s);
    ctx.fill();
    // Strand highlights
    ctx.strokeStyle = lightenColor(p.hairColor, 1.12);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(headR * 0.3, topY + 1 * s);
    ctx.quadraticCurveTo(headR + 0.5 * s, headY, headR * 0.5, headY + 4 * s);
    ctx.stroke();
  } else if (p.hairStyle === 3) {
    // Long — flows past shoulders
    ctx.beginPath();
    ctx.ellipse(0, headY - 0.5 * s, headR * 0.85 + 2.5 * s, headR + 2.5 * s, 0, Math.PI + 0.05, -0.05);
    ctx.fill();
    const longLen = 14 * s;
    // Cascading hair
    ctx.beginPath();
    ctx.moveTo(headR * 0.6, topY);
    ctx.bezierCurveTo(headR + 2 * s, headY, headR + 2.5 * s, headY + longLen * 0.4, headR * 0.6, headY + longLen);
    ctx.lineTo(headR * 0.2, headY + longLen - 2 * s);
    ctx.quadraticCurveTo(headR * 0.3, headY + 2 * s, headR * 0.6, topY);
    ctx.fill();
    // Back cascade
    ctx.fillStyle = darkenColor(p.hairColor, 0.9);
    ctx.beginPath();
    ctx.moveTo(-headR * 0.5, topY + 2 * s);
    ctx.bezierCurveTo(-headR - 1.5 * s, headY + 2 * s, -headR - 1 * s, headY + longLen * 0.5, -headR * 0.4, headY + longLen);
    ctx.lineTo(-headR * 0.2, headY + longLen - 3 * s);
    ctx.quadraticCurveTo(-headR * 0.3, headY + 3 * s, -headR * 0.5, topY + 2 * s);
    ctx.fill();
    // Strand shine
    ctx.strokeStyle = lightenColor(p.hairColor, 1.15);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(headR * 0.4, topY + 2 * s);
    ctx.bezierCurveTo(headR + 1 * s, headY + 3 * s, headR + 1 * s, headY + 8 * s, headR * 0.4, headY + longLen - 3 * s);
    ctx.stroke();
  } else if (p.hairStyle === 4) {
    // Mohawk
    ctx.beginPath();
    ctx.moveTo(-1.5 * s, headY + headR * 0.3);
    ctx.lineTo(-2 * s, topY);
    ctx.lineTo(-1 * s, topY - 6 * s);
    ctx.lineTo(0, topY - 8 * s);
    ctx.lineTo(1 * s, topY - 6 * s);
    ctx.lineTo(2 * s, topY);
    ctx.lineTo(1.5 * s, headY + headR * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lightenColor(p.hairColor, 1.2);
    ctx.beginPath();
    ctx.moveTo(-0.3 * s, topY);
    ctx.lineTo(0, topY - 7 * s);
    ctx.lineTo(0.3 * s, topY);
    ctx.closePath();
    ctx.fill();
  } else if (p.hairStyle === 5) {
    // Ponytail (side view — ponytail sticks out back)
    ctx.beginPath();
    ctx.ellipse(0, headY - 0.5 * s, headR * 0.85 + 1.5 * s, headR + 1.5 * s, 0, Math.PI + 0.15, -0.15);
    ctx.fill();
    // Ponytail
    ctx.beginPath();
    ctx.moveTo(-headR * 0.6, headY - 2 * s);
    ctx.bezierCurveTo(-headR - 3 * s, headY + 2 * s, -headR - 2.5 * s, headY + 10 * s, -headR * 0.8, headY + 14 * s);
    ctx.bezierCurveTo(-headR * 0.4, headY + 12 * s, -headR * 0.3, headY + 4 * s, -headR * 0.6, headY - 2 * s);
    ctx.fill();
    // Hair tie
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(-headR * 0.6, headY - 1 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ═══════════════════════════════════════════════════════
// HAIR — FRONT VIEW
// ═══════════════════════════════════════════════════════
function drawHairFront(ctx: CanvasRenderingContext2D, p: SpatialProfile, headY: number, headR: number, s: number) {
  ctx.fillStyle = p.hairColor;
  const topY = headY - headR;

  if (p.hairStyle === 0) {
    ctx.beginPath();
    ctx.arc(0, headY - 1.5 * s, headR + 0.5 * s, Math.PI + 0.15, -0.15);
    ctx.fill();
  } else if (p.hairStyle === 1) {
    ctx.beginPath();
    ctx.arc(0, headY - 1 * s, headR + 1.5 * s, Math.PI + 0.2, -0.2);
    ctx.fill();
    ctx.fillStyle = lightenColor(p.hairColor, 1.1);
    ctx.beginPath();
    ctx.arc(-2 * s, topY + 1 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2 * s, topY + 0.5 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.hairStyle === 2) {
    ctx.beginPath();
    ctx.arc(0, headY - 0.5 * s, headR + 2.5 * s, Math.PI + 0.1, -0.1);
    ctx.fill();
    // Side curtains
    [-1, 1].forEach(side => {
      ctx.beginPath();
      ctx.moveTo(side * (headR + 1.5 * s), headY - 3 * s);
      ctx.quadraticCurveTo(side * (headR + 2.5 * s), headY + 2 * s, side * (headR + 1 * s), headY + 5 * s);
      ctx.quadraticCurveTo(side * (headR - 1 * s), headY + 4 * s, side * (headR - 1 * s), headY - 1 * s);
      ctx.fill();
    });
    ctx.fillStyle = lightenColor(p.hairColor, 1.15);
    ctx.beginPath();
    ctx.moveTo(-1 * s, topY);
    ctx.quadraticCurveTo(0, topY - 1 * s, 1 * s, topY);
    ctx.quadraticCurveTo(0, topY + 2 * s, -1 * s, topY);
    ctx.fill();
  } else if (p.hairStyle === 3) {
    ctx.beginPath();
    ctx.arc(0, headY - 0.5 * s, headR + 2.5 * s, Math.PI + 0.05, -0.05);
    ctx.fill();
    const longLen = 14 * s;
    [-1, 1].forEach(side => {
      ctx.fillStyle = p.hairColor;
      ctx.beginPath();
      ctx.moveTo(side * (headR + 1.5 * s), headY - 4 * s);
      ctx.bezierCurveTo(side * (headR + 3 * s), headY, side * (headR + 2 * s), headY + longLen * 0.5, side * (headR * 0.8), headY + longLen);
      ctx.bezierCurveTo(side * (headR * 0.3), headY + longLen - 2 * s, side * (headR - 2 * s), headY + 4 * s, side * (headR - 1 * s), headY - 1 * s);
      ctx.fill();
    });
    // Back hair
    ctx.fillStyle = darkenColor(p.hairColor, 0.88);
    ctx.beginPath();
    ctx.moveTo(-headR + 1 * s, headY + 2 * s);
    ctx.quadraticCurveTo(-headR * 0.5, headY + longLen + 2 * s, 0, headY + longLen + 3 * s);
    ctx.quadraticCurveTo(headR * 0.5, headY + longLen + 2 * s, headR - 1 * s, headY + 2 * s);
    ctx.fill();
    // Strand shine
    ctx.strokeStyle = lightenColor(p.hairColor, 1.12);
    ctx.lineWidth = 0.8;
    [-1, 1].forEach(side => {
      ctx.beginPath();
      ctx.moveTo(side * 2 * s, topY + 1 * s);
      ctx.bezierCurveTo(side * headR * 0.7, headY + 2 * s, side * (headR + 0.5 * s), headY + 6 * s, side * headR * 0.6, headY + longLen - 2 * s);
      ctx.stroke();
    });
  } else if (p.hairStyle === 4) {
    // Mohawk
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
    ctx.fillStyle = lightenColor(p.hairColor, 1.2);
    ctx.beginPath();
    ctx.moveTo(-0.5 * s, topY);
    ctx.lineTo(0, topY - 7 * s);
    ctx.lineTo(0.5 * s, topY);
    ctx.closePath();
    ctx.fill();
    // Shaved sides
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
    [-1, 1].forEach(side => {
      ctx.beginPath();
      ctx.moveTo(side * (headR + 0.5 * s), headY - 2 * s);
      ctx.quadraticCurveTo(side * (headR + 1 * s), headY + 1 * s, side * (headR - 0.5 * s), headY + 3 * s);
      ctx.lineTo(side * (headR - 1.5 * s), headY - 1 * s);
      ctx.fill();
    });
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, headY - 1 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ═══════════════════════════════════════════════════════
// HAIR — BACK VIEW
// ═══════════════════════════════════════════════════════
function drawHairBack(ctx: CanvasRenderingContext2D, p: SpatialProfile, headY: number, headR: number, s: number) {
  ctx.fillStyle = p.hairColor;

  if (p.hairStyle === 0) {
    ctx.beginPath();
    ctx.arc(0, headY, headR + 0.5 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.hairStyle === 1) {
    ctx.beginPath();
    ctx.arc(0, headY, headR + 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.hairStyle === 2) {
    ctx.beginPath();
    ctx.arc(0, headY, headR + 2.5 * s, 0, Math.PI * 2);
    ctx.fill();
    // Hair falls to neck
    ctx.beginPath();
    ctx.moveTo(-headR - 1 * s, headY);
    ctx.quadraticCurveTo(-headR - 2 * s, headY + 4 * s, -headR, headY + 6 * s);
    ctx.lineTo(headR, headY + 6 * s);
    ctx.quadraticCurveTo(headR + 2 * s, headY + 4 * s, headR + 1 * s, headY);
    ctx.fill();
  } else if (p.hairStyle === 3) {
    const longLen = 14 * s;
    ctx.beginPath();
    ctx.arc(0, headY, headR + 2.5 * s, 0, Math.PI * 2);
    ctx.fill();
    // Long back hair
    ctx.beginPath();
    ctx.moveTo(-headR - 1.5 * s, headY);
    ctx.bezierCurveTo(-headR - 2 * s, headY + longLen * 0.4, -headR * 0.5, headY + longLen, 0, headY + longLen + 2 * s);
    ctx.bezierCurveTo(headR * 0.5, headY + longLen, headR + 2 * s, headY + longLen * 0.4, headR + 1.5 * s, headY);
    ctx.fill();
    // Strand details
    ctx.strokeStyle = darkenColor(p.hairColor, 0.88);
    ctx.lineWidth = 0.8;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 2 * s, headY - headR + 2 * s);
      ctx.bezierCurveTo(i * 2.5 * s, headY + 4 * s, i * 2 * s, headY + longLen * 0.6, i * 1.5 * s, headY + longLen);
      ctx.stroke();
    }
  } else if (p.hairStyle === 4) {
    // Mohawk from back
    ctx.beginPath();
    ctx.moveTo(-2 * s, headY + headR * 0.3);
    ctx.lineTo(-2.5 * s, headY - headR);
    ctx.lineTo(0, headY - headR - 8 * s);
    ctx.lineTo(2.5 * s, headY - headR);
    ctx.lineTo(2 * s, headY + headR * 0.3);
    ctx.closePath();
    ctx.fill();
    // Shaved sides
    ctx.fillStyle = darkenColor(p.skinColor, 0.92);
    ctx.beginPath();
    ctx.arc(0, headY, headR + 0.3 * s, 0.5, Math.PI - 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, headY, headR + 0.3 * s, -0.5, -(Math.PI - 0.5), true);
    ctx.fill();
  } else if (p.hairStyle === 5) {
    // Ponytail from back
    ctx.beginPath();
    ctx.arc(0, headY, headR + 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    // Visible ponytail
    ctx.beginPath();
    ctx.moveTo(0, headY - 2 * s);
    ctx.bezierCurveTo(3 * s, headY, 4 * s, headY + 8 * s, 2 * s, headY + 14 * s);
    ctx.bezierCurveTo(0, headY + 12 * s, -1 * s, headY + 4 * s, 0, headY - 2 * s);
    ctx.fill();
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, headY - 1 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ═══════════════════════════════════════════════════════
// FACE — SIDE VIEW
// ═══════════════════════════════════════════════════════
function drawFaceSide(ctx: CanvasRenderingContext2D, p: SpatialProfile, headY: number, headR: number, s: number) {
  const isFemale = p.bodyType === 'female';
  const eyeX = headR * 0.3;
  const eyeY = headY + 0.5 * s;

  if (p.faceStyle === 1) {
    // Sunglasses
    ctx.fillStyle = '#111';
    roundRect(ctx, eyeX - 2 * s, eyeY - 1.5 * s, 4 * s, 3 * s, 1 * s);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(eyeX + 2 * s, eyeY);
    ctx.lineTo(headR * 0.8, eyeY);
    ctx.stroke();
  } else {
    // Eye
    const eyeSize = isFemale ? 2 * s : 1.8 * s;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5D4037';
    ctx.beginPath();
    ctx.arc(eyeX + 0.3 * s, eyeY + 0.2 * s, eyeSize * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(eyeX + 0.4 * s, eyeY + 0.3 * s, eyeSize * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(eyeX - 0.2 * s, eyeY - 0.3 * s, 0.5 * s, 0, Math.PI * 2);
    ctx.fill();

    if (isFemale) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(eyeX - 1.5 * s, eyeY - eyeSize + 0.3 * s);
      ctx.lineTo(eyeX - 2 * s, eyeY - eyeSize - 1 * s);
      ctx.stroke();
    }

    if (p.faceStyle === 3) {
      // Wink — draw closed line instead of second eye area (but we only show one eye in side view, so just squint)
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(eyeX - 1.5 * s, eyeY);
      ctx.quadraticCurveTo(eyeX, eyeY - 1 * s, eyeX + 1.5 * s, eyeY);
      // already drew open eye above, this is fine
    }
  }

  // Nose (profile — more prominent)
  ctx.fillStyle = darkenColor(p.skinColor, 0.93);
  ctx.beginPath();
  ctx.moveTo(headR * 0.7, headY + 0.5 * s);
  ctx.lineTo(headR * 0.95, headY + 2 * s);
  ctx.lineTo(headR * 0.7, headY + 2.5 * s);
  ctx.fill();

  // Mouth (side)
  const mouthY = headY + 3.5 * s;
  ctx.strokeStyle = '#6D4C41';
  ctx.lineWidth = 1.2;
  if (p.faceStyle === 0 || p.faceStyle === 3) {
    ctx.beginPath();
    ctx.arc(headR * 0.4, mouthY - 0.5 * s, 1.5 * s, 0.2, Math.PI - 0.4);
    ctx.stroke();
  } else if (p.faceStyle === 2) {
    ctx.beginPath();
    ctx.moveTo(headR * 0.2, mouthY);
    ctx.lineTo(headR * 0.7, mouthY);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(headR * 0.2, mouthY);
    ctx.quadraticCurveTo(headR * 0.5, mouthY + 0.3 * s, headR * 0.7, mouthY - 0.5 * s);
    ctx.stroke();
  }

  // Blush
  ctx.fillStyle = isFemale ? 'rgba(255,130,130,0.2)' : 'rgba(255,150,150,0.1)';
  ctx.beginPath();
  ctx.ellipse(headR * 0.5, headY + 3 * s, 1.5 * s, 1 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ═══════════════════════════════════════════════════════
// FACE — FRONT VIEW
// ═══════════════════════════════════════════════════════
function drawFaceFront(ctx: CanvasRenderingContext2D, p: SpatialProfile, headY: number, s: number) {
  const eyeY = headY + 0.5 * s;
  const eyeSpacing = 2.8 * s;
  const isFemale = p.bodyType === 'female';

  if (p.faceStyle === 1) {
    // Sunglasses
    ctx.fillStyle = '#111';
    roundRect(ctx, -eyeSpacing - 2 * s, eyeY - 1.5 * s, 4 * s, 3 * s, 1 * s);
    ctx.fill();
    roundRect(ctx, eyeSpacing - 2 * s, eyeY - 1.5 * s, 4 * s, 3 * s, 1 * s);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-eyeSpacing + 2 * s, eyeY);
    ctx.lineTo(eyeSpacing - 2 * s, eyeY);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-eyeSpacing - 1 * s, eyeY - 1 * s, 1.5 * s, 1 * s);
    ctx.fillRect(eyeSpacing - 1 * s, eyeY - 1 * s, 1.5 * s, 1 * s);
  } else if (p.faceStyle === 3) {
    // Wink
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-eyeSpacing, eyeY, 1.8 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4A3728';
    ctx.beginPath(); ctx.arc(-eyeSpacing, eyeY, 1.2 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-eyeSpacing, eyeY + 0.1 * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-eyeSpacing - 0.3 * s, eyeY - 0.4 * s, 0.4 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(eyeSpacing - 2 * s, eyeY);
    ctx.quadraticCurveTo(eyeSpacing, eyeY - 1.5 * s, eyeSpacing + 2 * s, eyeY);
    ctx.stroke();
  } else {
    // Normal eyes
    const eyeSize = isFemale ? 2 * s : 1.8 * s;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5D4037';
    const irisSize = eyeSize * 0.65;
    ctx.beginPath(); ctx.arc(-eyeSpacing, eyeY + 0.2 * s, irisSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeSpacing, eyeY + 0.2 * s, irisSize, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    const pupilSize = irisSize * 0.6;
    ctx.beginPath(); ctx.arc(-eyeSpacing, eyeY + 0.3 * s, pupilSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeSpacing, eyeY + 0.3 * s, pupilSize, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-eyeSpacing - 0.4 * s, eyeY - 0.3 * s, 0.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeSpacing - 0.4 * s, eyeY - 0.3 * s, 0.5 * s, 0, Math.PI * 2); ctx.fill();

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

  // Cheeks
  ctx.fillStyle = isFemale ? 'rgba(255,130,130,0.25)' : 'rgba(255,150,150,0.15)';
  ctx.beginPath(); ctx.ellipse(-4 * s, headY + 3 * s, 1.8 * s, 1.2 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4 * s, headY + 3 * s, 1.8 * s, 1.2 * s, 0, 0, Math.PI * 2); ctx.fill();

  // Mouth
  const mouthY = headY + 3.5 * s;
  ctx.strokeStyle = '#6D4C41';
  ctx.lineWidth = 1.3;
  if (p.faceStyle === 0) {
    ctx.beginPath();
    ctx.arc(0, mouthY - 1 * s, 2 * s, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (p.faceStyle === 2) {
    ctx.beginPath();
    ctx.moveTo(-1.5 * s, mouthY);
    ctx.lineTo(1.5 * s, mouthY);
    ctx.stroke();
  } else if (p.faceStyle === 1) {
    ctx.beginPath();
    ctx.moveTo(-1.5 * s, mouthY);
    ctx.quadraticCurveTo(0, mouthY + 0.5 * s, 2 * s, mouthY - 0.8 * s);
    ctx.stroke();
  } else if (p.faceStyle === 3) {
    ctx.beginPath();
    ctx.arc(0, mouthY - 0.5 * s, 1.8 * s, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  // Nose
  ctx.fillStyle = darkenColor(p.skinColor, 0.93);
  ctx.beginPath();
  ctx.moveTo(-0.5 * s, headY + 1 * s);
  ctx.lineTo(0, headY + 2.2 * s);
  ctx.lineTo(0.5 * s, headY + 1 * s);
  ctx.fill();
}
