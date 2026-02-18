import { cn } from '@/lib/utils';

// ===== WALLPAPERS =====
export const WALLPAPERS = [
  { id: 'none', label: 'None', className: '' },
  { id: 'cosmic', label: 'Cosmic', className: 'bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]' },
  { id: 'aurora', label: 'Aurora', className: 'bg-gradient-to-br from-[#0d1b2a] via-[#1b2838] to-[#0a2342]' },
  { id: 'sunset', label: 'Sunset', className: 'bg-gradient-to-br from-[#2d1b4e] via-[#4a1942] to-[#1a1a2e]' },
  { id: 'ocean', label: 'Ocean', className: 'bg-gradient-to-br from-[#0a192f] via-[#112240] to-[#0d2137]' },
  { id: 'forest', label: 'Forest', className: 'bg-gradient-to-br from-[#0b1a0b] via-[#1a2f1a] to-[#0f2b1d]' },
  { id: 'warm', label: 'Warm', className: 'bg-gradient-to-br from-[#1a1a0e] via-[#2d2a1a] to-[#1a1510]' },
  { id: 'neon', label: 'Neon', className: 'bg-gradient-to-br from-[#0a0a1a] via-[#1a0a2e] to-[#0d0d2b]' },
  { id: 'candy', label: 'Candy', className: 'bg-gradient-to-br from-[#2d1326] via-[#1a1030] to-[#261030]' },
  { id: 'arctic', label: 'Arctic', className: 'bg-gradient-to-br from-[#0c1929] via-[#142942] to-[#0e2035]' },
  { id: 'lavender', label: 'Lavender', className: 'bg-gradient-to-br from-[#1a1028] via-[#221538] to-[#1c0e30]' },
  { id: 'ember', label: 'Ember', className: 'bg-gradient-to-br from-[#1a0a0a] via-[#2a1010] to-[#1a0505]' },
  { id: 'mint', label: 'Mint', className: 'bg-gradient-to-br from-[#0a1a18] via-[#102a25] to-[#081a16]' },
  { id: 'midnight', label: 'Midnight', className: 'bg-gradient-to-br from-[#080818] via-[#101030] to-[#0a0a20]' },
] as const;

// ===== CHAT BUBBLE THEMES =====
// All themes designed for dark mode readability with consistent contrast
export const BUBBLE_THEMES = [
  { 
    id: 'default', label: 'Default',
    own: 'bg-primary text-primary-foreground',
    other: 'bg-card/80 text-card-foreground border border-border/40',
    preview: 'bg-primary',
  },
  { 
    id: 'messenger', label: 'Messenger',
    own: 'bg-[#0084ff] text-white',
    other: 'bg-[#303133] text-[#e4e6eb]',
    preview: 'bg-[#0084ff]',
  },
  { 
    id: 'whatsapp', label: 'WhatsApp',
    own: 'bg-[#005c4b] text-[#e9edef]',
    other: 'bg-[#202c33] text-[#e9edef]',
    preview: 'bg-[#005c4b]',
  },
  { 
    id: 'imessage', label: 'iMessage',
    own: 'bg-[#007aff] text-white',
    other: 'bg-[#2c2c2e] text-[#f2f2f7]',
    preview: 'bg-[#007aff]',
  },
  { 
    id: 'telegram', label: 'Telegram',
    own: 'bg-[#3d8ed0] text-white',
    other: 'bg-[#212121] text-[#f5f5f5]',
    preview: 'bg-[#3d8ed0]',
  },
  { 
    id: 'discord', label: 'Discord',
    own: 'bg-[#5865f2] text-white',
    other: 'bg-[#2b2d31] text-[#dbdee1]',
    preview: 'bg-[#5865f2]',
  },
  { 
    id: 'snapchat', label: 'Snapchat',
    own: 'bg-[#8b5cf6] text-white',
    other: 'bg-[#1e1e1e] text-[#f0f0f0]',
    preview: 'bg-[#8b5cf6]',
  },
  { 
    id: 'neon-glow', label: 'Neon Glow',
    own: 'bg-gradient-to-br from-[#e040fb] to-[#7c4dff] text-white',
    other: 'bg-[#1a1a2e]/90 text-[#e8e8e8] border border-[#7c4dff]/25',
    preview: 'bg-gradient-to-r from-[#e040fb] to-[#7c4dff]',
  },
] as const;

export type WallpaperId = typeof WALLPAPERS[number]['id'];
export type BubbleThemeId = typeof BUBBLE_THEMES[number]['id'];

const WALLPAPER_KEY_PREFIX = 'auradesk-wallpaper-';
const BUBBLE_THEME_KEY = 'auradesk-bubble-theme';

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

export const getBubbleTheme = (): BubbleThemeId => {
  // Handle legacy 'iMessage' key → new 'imessage'
  const stored = localStorage.getItem(BUBBLE_THEME_KEY);
  if (stored === 'iMessage') return 'imessage';
  return (stored as BubbleThemeId) || 'default';
};

export const setBubbleThemeStorage = (themeId: BubbleThemeId) => {
  localStorage.setItem(BUBBLE_THEME_KEY, themeId);
};

export const getBubbleClasses = (themeId: BubbleThemeId) => {
  return BUBBLE_THEMES.find(t => t.id === themeId) || BUBBLE_THEMES[0];
};

interface WallpaperPickerProps {
  conversationId: string;
  currentWallpaper: WallpaperId;
  onSelect: (id: WallpaperId) => void;
}

export const WallpaperPicker = ({ conversationId, currentWallpaper, onSelect }: WallpaperPickerProps) => {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Wallpaper</p>
      <div className="flex gap-2 flex-wrap">
        {WALLPAPERS.map((wp) => (
          <button
            key={wp.id}
            onClick={() => {
              setWallpaper(conversationId, wp.id);
              onSelect(wp.id);
            }}
            className={cn(
              'w-10 h-10 rounded-lg border-2 transition-all touch-manipulation',
              wp.id === 'none' ? 'bg-background' : wp.className,
              currentWallpaper === wp.id
                ? 'border-primary shadow-lg shadow-primary/30 scale-110'
                : 'border-border/30 hover:border-border'
            )}
            title={wp.label}
          />
        ))}
      </div>
    </div>
  );
};

interface BubbleThemePickerProps {
  currentTheme: BubbleThemeId;
  onSelect: (id: BubbleThemeId) => void;
}

export const BubbleThemePicker = ({ currentTheme, onSelect }: BubbleThemePickerProps) => {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Bubble Style</p>
      <div className="flex gap-2 flex-wrap">
        {BUBBLE_THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => {
              setBubbleThemeStorage(theme.id);
              onSelect(theme.id);
            }}
            className={cn(
              'flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all touch-manipulation',
              currentTheme === theme.id
                ? 'border-primary shadow-lg shadow-primary/20'
                : 'border-border/30 hover:border-border'
            )}
          >
            <div className={cn('w-10 h-6 rounded-md', theme.preview)} />
            <span className="text-[9px] text-muted-foreground">{theme.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
