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
  // New wallpapers
  { id: 'neon', label: 'Neon', className: 'bg-gradient-to-br from-[#0a0a1a] via-[#1a0a2e] to-[#0d0d2b]' },
  { id: 'candy', label: 'Candy', className: 'bg-gradient-to-br from-[#2d1326] via-[#1a1030] to-[#261030]' },
  { id: 'arctic', label: 'Arctic', className: 'bg-gradient-to-br from-[#0c1929] via-[#142942] to-[#0e2035]' },
  { id: 'lavender', label: 'Lavender', className: 'bg-gradient-to-br from-[#1a1028] via-[#221538] to-[#1c0e30]' },
  { id: 'ember', label: 'Ember', className: 'bg-gradient-to-br from-[#1a0a0a] via-[#2a1010] to-[#1a0505]' },
  { id: 'mint', label: 'Mint', className: 'bg-gradient-to-br from-[#0a1a18] via-[#102a25] to-[#081a16]' },
  { id: 'midnight', label: 'Midnight', className: 'bg-gradient-to-br from-[#080818] via-[#101030] to-[#0a0a20]' },
] as const;

// ===== CHAT BUBBLE THEMES =====
export const BUBBLE_THEMES = [
  { 
    id: 'default', label: 'Default',
    own: 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground',
    other: 'bg-card border border-border/50',
    preview: 'bg-gradient-to-r from-primary to-primary/80',
  },
  { 
    id: 'messenger', label: 'Messenger',
    own: 'bg-gradient-to-br from-[#0084ff] to-[#0066cc] text-white',
    other: 'bg-[#3a3b3c] text-white border-0',
    preview: 'bg-gradient-to-r from-[#0084ff] to-[#0066cc]',
  },
  { 
    id: 'whatsapp', label: 'WhatsApp',
    own: 'bg-gradient-to-br from-[#005c4b] to-[#00473a] text-white',
    other: 'bg-[#1f2c34] text-white border-0',
    preview: 'bg-gradient-to-r from-[#005c4b] to-[#00473a]',
  },
  { 
    id: 'iMessage', label: 'iMessage',
    own: 'bg-gradient-to-br from-[#34c759] to-[#28a745] text-white',
    other: 'bg-[#e5e5ea] text-[#1c1c1e] border-0 dark:bg-[#3a3a3c] dark:text-white',
    preview: 'bg-gradient-to-r from-[#34c759] to-[#28a745]',
  },
  { 
    id: 'telegram', label: 'Telegram',
    own: 'bg-gradient-to-br from-[#4ea4f6] to-[#3d8ed0] text-white',
    other: 'bg-white/10 backdrop-blur-sm text-foreground border border-white/10',
    preview: 'bg-gradient-to-r from-[#4ea4f6] to-[#3d8ed0]',
  },
  { 
    id: 'discord', label: 'Discord',
    own: 'bg-[#5865f2] text-white',
    other: 'bg-[#2b2d31] text-[#dcddde] border-0',
    preview: 'bg-[#5865f2]',
  },
  { 
    id: 'snapchat', label: 'Snapchat',
    own: 'bg-gradient-to-br from-[#fffc00] to-[#e6e300] text-[#1c1c1c]',
    other: 'bg-[#f0f0f0] text-[#1c1c1c] border-0 dark:bg-[#2a2a2a] dark:text-white',
    preview: 'bg-gradient-to-r from-[#fffc00] to-[#e6e300]',
  },
  { 
    id: 'neon-glow', label: 'Neon Glow',
    own: 'bg-gradient-to-br from-[#ff006e] to-[#8338ec] text-white shadow-lg shadow-[#ff006e]/20',
    other: 'bg-[#1a1a2e] text-white border border-[#8338ec]/30 shadow-lg shadow-[#8338ec]/10',
    preview: 'bg-gradient-to-r from-[#ff006e] to-[#8338ec]',
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
  return (localStorage.getItem(BUBBLE_THEME_KEY) as BubbleThemeId) || 'default';
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
