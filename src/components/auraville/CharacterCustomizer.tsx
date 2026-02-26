import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  SpatialProfile,
  SKIN_COLORS,
  HAIR_COLORS,
  SHIRT_COLORS,
  PANTS_COLORS,
  HAIR_STYLE_NAMES,
  FACE_STYLE_NAMES,
  SHIRT_STYLE_NAMES,
  PANTS_STYLE_NAMES,
  HOUSE_STYLE_NAMES,
  DEFAULT_PROFILE,
} from './gameTypes';
import { ChevronLeft, ChevronRight, Sparkles, Save } from 'lucide-react';
import { motion } from 'framer-motion';

interface CharacterCustomizerProps {
  initialProfile?: SpatialProfile | null;
  onSave: (profile: SpatialProfile) => void;
  isNew?: boolean;
}

export const CharacterCustomizer = ({ initialProfile, onSave, isNew = false }: CharacterCustomizerProps) => {
  const [profile, setProfile] = useState<SpatialProfile>(initialProfile || DEFAULT_PROFILE);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const rafRef = useRef(0);

  const update = <K extends keyof SpatialProfile>(key: K, value: SpatialProfile[K]) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  // Animated preview
  const renderPreview = useCallback(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 160 * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);

    frameRef.current++;
    ctx.clearRect(0, 0, 160, 200);

    // Background
    const grad = ctx.createRadialGradient(80, 100, 20, 80, 100, 80);
    grad.addColorStop(0, 'rgba(59,130,246,0.1)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 160, 200);

    // Draw character at center, larger scale
    const p = profile;
    const x = 80, y = 110;
    const s = 3;
    const walkCycle = Math.sin(frameRef.current * 0.08) * 3 * s;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y + 16 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = p.pantsColor;
    const legW = 3 * s, legH = 7 * s;
    if (p.pantsStyle === 1) {
      ctx.fillRect(x - 4 * s, y + 5 * s + walkCycle, legW, legH * 0.5);
      ctx.fillRect(x + 1 * s, y + 5 * s - walkCycle, legW, legH * 0.5);
      ctx.fillStyle = p.skinColor;
      ctx.fillRect(x - 4 * s, y + 5 * s + legH * 0.5 + walkCycle, legW, legH * 0.5);
      ctx.fillRect(x + 1 * s, y + 5 * s + legH * 0.5 - walkCycle, legW, legH * 0.5);
    } else {
      ctx.fillRect(x - 4 * s, y + 5 * s + walkCycle, legW, legH);
      ctx.fillRect(x + 1 * s, y + 5 * s - walkCycle, legW, legH);
    }

    // Shoes
    ctx.fillStyle = '#333';
    ctx.fillRect(x - 4.5 * s, y + 11 * s + walkCycle, legW + 1 * s, 2 * s);
    ctx.fillRect(x + 0.5 * s, y + 11 * s - walkCycle, legW + 1 * s, 2 * s);

    // Body
    ctx.fillStyle = p.shirtColor;
    ctx.beginPath();
    ctx.roundRect(x - 6 * s, y - 6 * s, 12 * s, 11 * s, 2 * s);
    ctx.fill();

    // Arms
    ctx.fillStyle = p.skinColor;
    ctx.fillRect(x - 8 * s, y - 3 * s + walkCycle, 2.5 * s, 8 * s);
    ctx.fillRect(x + 5.5 * s, y - 3 * s - walkCycle, 2.5 * s, 8 * s);

    // Head
    ctx.fillStyle = p.skinColor;
    ctx.beginPath();
    ctx.arc(x, y - 11 * s, 6.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = p.hairColor;
    if (p.hairStyle === 0) {
      ctx.beginPath();
      ctx.arc(x, y - 13 * s, 6 * s, Math.PI, 0);
      ctx.fill();
    } else if (p.hairStyle === 1) {
      ctx.beginPath();
      ctx.arc(x, y - 13 * s, 6.5 * s, Math.PI + 0.3, -0.3);
      ctx.fill();
    } else if (p.hairStyle === 2) {
      ctx.beginPath();
      ctx.arc(x, y - 13 * s, 7 * s, Math.PI + 0.2, -0.2);
      ctx.fill();
      ctx.fillRect(x - 7 * s, y - 13 * s, 3 * s, 6 * s);
      ctx.fillRect(x + 4 * s, y - 13 * s, 3 * s, 6 * s);
    } else if (p.hairStyle === 3) {
      ctx.beginPath();
      ctx.arc(x, y - 13 * s, 7 * s, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x - 7 * s, y - 13 * s, 3 * s, 12 * s);
      ctx.fillRect(x + 4 * s, y - 13 * s, 3 * s, 12 * s);
    } else if (p.hairStyle === 4) {
      ctx.fillRect(x - 2 * s, y - 22 * s, 4 * s, 10 * s);
      ctx.beginPath();
      ctx.arc(x, y - 13 * s, 6 * s, Math.PI + 0.5, -0.5);
      ctx.fill();
    }

    // Eyes
    const eyeY = y - 11 * s;
    if (p.faceStyle === 1) {
      ctx.fillStyle = '#111';
      ctx.fillRect(x - 4 * s, eyeY - 1 * s, 3 * s, 2 * s);
      ctx.fillRect(x + 1 * s, eyeY - 1 * s, 3 * s, 2 * s);
      ctx.fillRect(x - 1 * s, eyeY, 2 * s, 0.5 * s);
    } else if (p.faceStyle === 3) {
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(x - 2.5 * s, eyeY, 1 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 1 * s, eyeY);
      ctx.lineTo(x + 4 * s, eyeY);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(x - 2.5 * s, eyeY, 1 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 2.5 * s, eyeY, 1 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth
    if (p.faceStyle === 0) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y - 9 * s, 2 * s, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else if (p.faceStyle === 2) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 2 * s, y - 8.5 * s);
      ctx.lineTo(x + 2 * s, y - 8.5 * s);
      ctx.stroke();
    }

    rafRef.current = requestAnimationFrame(renderPreview);
  }, [profile]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderPreview);
    return () => cancelAnimationFrame(rafRef.current);
  }, [renderPreview]);

  const ColorRow = ({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (c: string) => void }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-1.5 flex-wrap">
        {colors.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={cn(
              'w-7 h-7 rounded-full border-2 transition-all duration-150 hover:scale-110',
              value === c ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-border/50'
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );

  const StyleSelector = ({ label, options, value, onChange }: { label: string; options: string[]; value: number; onChange: (v: number) => void }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange((value - 1 + options.length) % options.length)} className="p-1 rounded-md hover:bg-accent">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium flex-1 text-center">{options[value]}</span>
        <button onClick={() => onChange((value + 1) % options.length)} className="p-1 rounded-md hover:bg-accent">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl max-w-md w-full mx-auto overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/30 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">{isNew ? 'Create Your Character' : 'Edit Character'}</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Customize your avatar for AuraVille</p>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-auto">
        {/* Preview */}
        <div className="flex justify-center">
          <canvas
            ref={previewRef}
            style={{ width: 160, height: 200 }}
            className="rounded-xl bg-background/50 border border-border/30"
          />
        </div>

        {/* Display Name */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Display Name</Label>
          <Input
            value={profile.displayName}
            onChange={e => update('displayName', e.target.value)}
            placeholder="Your name in AuraVille"
            className="h-9"
          />
        </div>

        {/* Colors */}
        <ColorRow label="Skin Tone" colors={SKIN_COLORS} value={profile.skinColor} onChange={c => update('skinColor', c)} />
        <ColorRow label="Hair Color" colors={HAIR_COLORS} value={profile.hairColor} onChange={c => update('hairColor', c)} />
        <ColorRow label="Shirt Color" colors={SHIRT_COLORS} value={profile.shirtColor} onChange={c => update('shirtColor', c)} />
        <ColorRow label="Pants Color" colors={PANTS_COLORS} value={profile.pantsColor} onChange={c => update('pantsColor', c)} />

        {/* Styles */}
        <StyleSelector label="Hairstyle" options={HAIR_STYLE_NAMES} value={profile.hairStyle} onChange={v => update('hairStyle', v)} />
        <StyleSelector label="Expression" options={FACE_STYLE_NAMES} value={profile.faceStyle} onChange={v => update('faceStyle', v)} />
        <StyleSelector label="Shirt Style" options={SHIRT_STYLE_NAMES} value={profile.shirtStyle} onChange={v => update('shirtStyle', v)} />
        <StyleSelector label="Pants Style" options={PANTS_STYLE_NAMES} value={profile.pantsStyle} onChange={v => update('pantsStyle', v)} />
        <StyleSelector label="House Style" options={HOUSE_STYLE_NAMES} value={profile.houseStyle} onChange={v => update('houseStyle', v)} />
      </div>

      {/* Save */}
      <div className="p-4 border-t border-border/30">
        <Button
          className="w-full gap-2"
          onClick={() => onSave(profile)}
          disabled={!profile.displayName.trim()}
        >
          <Save className="w-4 h-4" />
          {isNew ? 'Enter AuraVille' : 'Save Changes'}
        </Button>
      </div>
    </motion.div>
  );
};
