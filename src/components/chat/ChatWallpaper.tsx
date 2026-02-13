import { cn } from '@/lib/utils';

export const WALLPAPERS = [
  { id: 'none', label: 'None', className: '' },
  { id: 'cosmic', label: 'Cosmic', className: 'bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]' },
  { id: 'aurora', label: 'Aurora', className: 'bg-gradient-to-br from-[#0d1b2a] via-[#1b2838] to-[#0a2342]' },
  { id: 'sunset', label: 'Sunset', className: 'bg-gradient-to-br from-[#2d1b4e] via-[#4a1942] to-[#1a1a2e]' },
  { id: 'ocean', label: 'Ocean', className: 'bg-gradient-to-br from-[#0a192f] via-[#112240] to-[#0d2137]' },
  { id: 'forest', label: 'Forest', className: 'bg-gradient-to-br from-[#0b1a0b] via-[#1a2f1a] to-[#0f2b1d]' },
  { id: 'warm', label: 'Warm', className: 'bg-gradient-to-br from-[#1a1a0e] via-[#2d2a1a] to-[#1a1510]' },
] as const;

export type WallpaperId = typeof WALLPAPERS[number]['id'];

const WALLPAPER_KEY_PREFIX = 'auradesk-wallpaper-';

export const getWallpaper = (conversationId: string): WallpaperId => {
  return (localStorage.getItem(WALLPAPER_KEY_PREFIX + conversationId) as WallpaperId) || 'none';
};

export const setWallpaper = (conversationId: string, wallpaperId: WallpaperId) => {
  if (wallpaperId === 'none') {
    localStorage.removeItem(WALLPAPER_KEY_PREFIX + conversationId);
  } else {
    localStorage.setItem(WALLPAPER_KEY_PREFIX + conversationId, wallpaperId);
  }
};

export const getWallpaperClass = (wallpaperId: WallpaperId): string => {
  return WALLPAPERS.find(w => w.id === wallpaperId)?.className || '';
};

interface WallpaperPickerProps {
  conversationId: string;
  currentWallpaper: WallpaperId;
  onSelect: (id: WallpaperId) => void;
}

export const WallpaperPicker = ({ conversationId, currentWallpaper, onSelect }: WallpaperPickerProps) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {WALLPAPERS.map((wp) => (
        <button
          key={wp.id}
          onClick={() => {
            setWallpaper(conversationId, wp.id);
            onSelect(wp.id);
          }}
          className={cn(
            'w-12 h-12 rounded-xl border-2 transition-all touch-manipulation',
            wp.id === 'none' ? 'bg-background' : wp.className,
            currentWallpaper === wp.id
              ? 'border-primary shadow-lg shadow-primary/30 scale-110'
              : 'border-border/30 hover:border-border'
          )}
          title={wp.label}
        />
      ))}
    </div>
  );
};
