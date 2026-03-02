// ═══════════════════════════════════════════════════════
// AuraVille — Furniture Catalog & Renderer
// ═══════════════════════════════════════════════════════

export interface FurnitureItem {
  type: string;
  name: string;
  category: 'living' | 'kitchen' | 'bedroom' | 'bathroom' | 'decor';
  width: number;
  height: number;
  icon: string; // emoji for catalog UI
}

export interface PlacedFurniture {
  id: string;
  userId: string;
  furnitureType: string;
  x: number;
  y: number;
  room: string;
  variant: number;
  rotation: number;
}

// ─── Full Furniture Catalog (50+ items) ──────────────
export const FURNITURE_CATALOG: FurnitureItem[] = [
  // Living Room
  { type: 'sofa', name: 'Sofa', category: 'living', width: 80, height: 28, icon: '🛋️' },
  { type: 'armchair', name: 'Armchair', category: 'living', width: 28, height: 28, icon: '💺' },
  { type: 'coffee_table', name: 'Coffee Table', category: 'living', width: 44, height: 18, icon: '🪑' },
  { type: 'tv_stand', name: 'TV Stand', category: 'living', width: 50, height: 16, icon: '📺' },
  { type: 'bookshelf', name: 'Bookshelf', category: 'living', width: 12, height: 50, icon: '📚' },
  { type: 'floor_lamp', name: 'Floor Lamp', category: 'living', width: 10, height: 10, icon: '💡' },
  { type: 'rug_round', name: 'Round Rug', category: 'living', width: 60, height: 40, icon: '🟤' },
  { type: 'rug_rect', name: 'Rectangle Rug', category: 'living', width: 70, height: 45, icon: '🟫' },
  { type: 'fireplace', name: 'Fireplace', category: 'living', width: 40, height: 20, icon: '🔥' },
  { type: 'piano', name: 'Piano', category: 'living', width: 40, height: 24, icon: '🎹' },
  { type: 'plant_tall', name: 'Tall Plant', category: 'decor', width: 14, height: 14, icon: '🌿' },
  { type: 'plant_small', name: 'Small Plant', category: 'decor', width: 10, height: 10, icon: '🪴' },
  { type: 'painting', name: 'Wall Painting', category: 'decor', width: 24, height: 6, icon: '🖼️' },
  { type: 'clock', name: 'Wall Clock', category: 'decor', width: 10, height: 10, icon: '🕐' },
  { type: 'candles', name: 'Candles', category: 'decor', width: 12, height: 8, icon: '🕯️' },
  
  // Kitchen
  { type: 'counter', name: 'Counter', category: 'kitchen', width: 60, height: 18, icon: '🔲' },
  { type: 'stove', name: 'Stove', category: 'kitchen', width: 24, height: 12, icon: '♨️' },
  { type: 'fridge', name: 'Fridge', category: 'kitchen', width: 20, height: 36, icon: '🧊' },
  { type: 'sink_kitchen', name: 'Kitchen Sink', category: 'kitchen', width: 20, height: 10, icon: '🚰' },
  { type: 'dining_table', name: 'Dining Table', category: 'kitchen', width: 40, height: 28, icon: '🍽️' },
  { type: 'dining_chair', name: 'Dining Chair', category: 'kitchen', width: 10, height: 14, icon: '🪑' },
  { type: 'microwave', name: 'Microwave', category: 'kitchen', width: 14, height: 8, icon: '📦' },
  { type: 'toaster', name: 'Toaster', category: 'kitchen', width: 8, height: 6, icon: '🍞' },
  { type: 'fruit_bowl', name: 'Fruit Bowl', category: 'kitchen', width: 12, height: 8, icon: '🍎' },
  { type: 'wine_rack', name: 'Wine Rack', category: 'kitchen', width: 14, height: 30, icon: '🍷' },
  
  // Bedroom
  { type: 'bed_single', name: 'Single Bed', category: 'bedroom', width: 36, height: 50, icon: '🛏️' },
  { type: 'bed_double', name: 'Double Bed', category: 'bedroom', width: 56, height: 50, icon: '🛌' },
  { type: 'nightstand', name: 'Nightstand', category: 'bedroom', width: 16, height: 16, icon: '🗄️' },
  { type: 'dresser', name: 'Dresser', category: 'bedroom', width: 34, height: 22, icon: '🗃️' },
  { type: 'wardrobe', name: 'Wardrobe', category: 'bedroom', width: 30, height: 16, icon: '👔' },
  { type: 'desk', name: 'Desk', category: 'bedroom', width: 40, height: 20, icon: '🖥️' },
  { type: 'desk_chair', name: 'Desk Chair', category: 'bedroom', width: 14, height: 14, icon: '🪑' },
  { type: 'mirror', name: 'Mirror', category: 'bedroom', width: 18, height: 6, icon: '🪞' },
  { type: 'lamp_table', name: 'Table Lamp', category: 'bedroom', width: 8, height: 8, icon: '🔆' },
  { type: 'teddy', name: 'Teddy Bear', category: 'decor', width: 8, height: 8, icon: '🧸' },
  
  // Bathroom
  { type: 'bathtub', name: 'Bathtub', category: 'bathroom', width: 48, height: 26, icon: '🛁' },
  { type: 'shower', name: 'Shower', category: 'bathroom', width: 28, height: 28, icon: '🚿' },
  { type: 'toilet', name: 'Toilet', category: 'bathroom', width: 16, height: 22, icon: '🚽' },
  { type: 'sink_bath', name: 'Bathroom Sink', category: 'bathroom', width: 22, height: 14, icon: '🚰' },
  { type: 'bath_mirror', name: 'Bath Mirror', category: 'bathroom', width: 20, height: 6, icon: '🪞' },
  { type: 'towel_rack', name: 'Towel Rack', category: 'bathroom', width: 20, height: 4, icon: '🧺' },
  { type: 'bath_mat', name: 'Bath Mat', category: 'bathroom', width: 28, height: 14, icon: '🟦' },
  { type: 'laundry', name: 'Laundry Basket', category: 'bathroom', width: 14, height: 14, icon: '🧺' },
  
  // Decor extras
  { type: 'globe', name: 'Globe', category: 'decor', width: 12, height: 12, icon: '🌍' },
  { type: 'trophy', name: 'Trophy', category: 'decor', width: 8, height: 8, icon: '🏆' },
  { type: 'fish_tank', name: 'Fish Tank', category: 'decor', width: 24, height: 16, icon: '🐠' },
  { type: 'guitar', name: 'Guitar', category: 'decor', width: 10, height: 30, icon: '🎸' },
  { type: 'vinyl', name: 'Vinyl Player', category: 'decor', width: 18, height: 14, icon: '🎵' },
  { type: 'cat_bed', name: 'Cat Bed', category: 'decor', width: 16, height: 16, icon: '🐱' },
  { type: 'dog_bed', name: 'Dog Bed', category: 'decor', width: 20, height: 16, icon: '🐕' },
  { type: 'vase', name: 'Flower Vase', category: 'decor', width: 8, height: 8, icon: '💐' },
];

export function getCatalogByCategory(category: string): FurnitureItem[] {
  return FURNITURE_CATALOG.filter(f => f.category === category);
}
