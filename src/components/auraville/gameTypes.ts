// ═══════════════════════════════════════════════════════
// AuraVille — 2D Spatial Chat Game Types
// ═══════════════════════════════════════════════════════

export interface PlayerPosition {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
}

export type BodyType = 'male' | 'female';

export interface SpatialProfile {
  skinColor: string;
  hairColor: string;
  hairStyle: number;
  faceStyle: number;
  shirtStyle: number;
  shirtColor: string;
  pantsStyle: number;
  pantsColor: string;
  houseStyle: number;
  displayName: string;
  bodyType: BodyType;
}

export interface RemotePlayer {
  userId: string;
  displayName: string;
  position: PlayerPosition;
  profile: SpatialProfile;
  insideHouseId?: string | null;
}

export interface House {
  x: number;
  y: number;
  ownerId: string;
  ownerName: string;
  style: number;
  roofColor: string;
  wallColor: string;
}

export interface HouseInterior {
  houseId: string; // ownerId
  ownerName: string;
  width: number;
  height: number;
  style: number;
}

export interface WorldDecoration {
  x: number;
  y: number;
  type: 'tree' | 'flower' | 'rock' | 'bush' | 'lamp';
  variant: number;
}

// ─── Customization Options ───────────────────────────
export const SKIN_COLORS = ['#FDEBD0', '#F5CBA7', '#F0B27A', '#D4A574', '#C68642', '#8D5524'];
export const HAIR_COLORS = ['#2C1810', '#4A3728', '#8B4513', '#D4A017', '#E8E8E8', '#FF6B35', '#FF1493', '#4169E1'];
export const SHIRT_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#1F2937', '#FFFFFF'];
export const PANTS_COLORS = ['#1E3A5F', '#374151', '#1E40AF', '#7C3AED', '#047857', '#92400E'];

export const BODY_TYPE_NAMES = ['Male', 'Female'];
export const HAIR_STYLE_NAMES = ['Buzz Cut', 'Short', 'Medium', 'Long', 'Mohawk', 'Ponytail'];
export const FACE_STYLE_NAMES = ['Happy', 'Cool', 'Chill', 'Wink'];
export const SHIRT_STYLE_NAMES = ['T-Shirt', 'Hoodie', 'Tank Top', 'Polo'];
export const PANTS_STYLE_NAMES = ['Jeans', 'Shorts', 'Cargo', 'Skirt'];
export const HOUSE_STYLE_NAMES = ['Cottage', 'Modern', 'Cabin', 'Villa'];

// ─── World Constants ─────────────────────────────────
export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 2400;
export const TILE_SIZE = 32;
export const PLAYER_SPEED = 3;
export const HEARING_DISTANCE = 350;
export const VOICE_CONNECT_DISTANCE = 450;
export const VOICE_DISCONNECT_DISTANCE = 550;

// Interior constants
export const INTERIOR_WIDTH = 560;
export const INTERIOR_HEIGHT = 420;
export const HOUSE_ENTER_DISTANCE = 55;

// House colors by style
export const HOUSE_COLORS: { roof: string; wall: string }[] = [
  { roof: '#8B4513', wall: '#DEB887' },  // Cottage
  { roof: '#4A5568', wall: '#E2E8F0' },  // Modern
  { roof: '#5D3A1A', wall: '#A0522D' },  // Cabin
  { roof: '#B91C1C', wall: '#FEF3C7' },  // Villa
];

export const DEFAULT_PROFILE: SpatialProfile = {
  skinColor: '#F5CBA7',
  hairColor: '#4A3728',
  hairStyle: 1,
  faceStyle: 0,
  shirtStyle: 0,
  shirtColor: '#3B82F6',
  pantsStyle: 0,
  pantsColor: '#1E3A5F',
  houseStyle: 0,
  displayName: '',
  bodyType: 'male',
};
