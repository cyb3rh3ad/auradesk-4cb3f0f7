import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FURNITURE_CATALOG, FurnitureItem, getCatalogByCategory } from './furnitureTypes';
import { X, Plus, Trash2, Package } from 'lucide-react';
import { PlacedFurniture } from './furnitureTypes';

interface FurnitureEditorProps {
  isOwner: boolean;
  furniture: PlacedFurniture[];
  onAdd: (type: string, x: number, y: number, room: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

const CATEGORIES = [
  { key: 'living', label: '🛋️ Living', color: 'bg-amber-500/20' },
  { key: 'kitchen', label: '🍳 Kitchen', color: 'bg-green-500/20' },
  { key: 'bedroom', label: '🛏️ Bedroom', color: 'bg-blue-500/20' },
  { key: 'bathroom', label: '🛁 Bath', color: 'bg-cyan-500/20' },
  { key: 'decor', label: '🎨 Decor', color: 'bg-purple-500/20' },
];

export const FurnitureEditor = ({ isOwner, furniture, onAdd, onRemove, onClose }: FurnitureEditorProps) => {
  const [activeCategory, setActiveCategory] = useState('living');
  const [selectedItem, setSelectedItem] = useState<FurnitureItem | null>(null);

  if (!isOwner) return null;

  const items = getCatalogByCategory(activeCategory);

  const handlePlace = (item: FurnitureItem) => {
    // Place in center of the room
    const roomMap: Record<string, string> = { living: 'living', kitchen: 'kitchen', bedroom: 'bedroom', bathroom: 'bathroom', decor: 'living' };
    const room = roomMap[item.category] || 'living';
    // Default center position (will be relative to room)
    onAdd(item.type, 50 + Math.random() * 40, 50 + Math.random() * 30, room);
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute right-0 top-0 bottom-0 w-72 bg-card/95 backdrop-blur-xl border-l border-border/50 z-40 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="p-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">Furniture</span>
          <span className="text-xs text-muted-foreground">({furniture.length})</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-2 overflow-x-auto">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={cn(
              'text-xs px-2 py-1.5 rounded-lg whitespace-nowrap transition-all font-medium',
              activeCategory === cat.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-accent'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Catalog Items */}
      <ScrollArea className="flex-1">
        <div className="p-2 grid grid-cols-2 gap-2">
          {items.map(item => (
            <button
              key={item.type}
              onClick={() => handlePlace(item)}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/30 hover:bg-accent/50 border border-border/20 hover:border-primary/30 transition-all active:scale-95"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[10px] font-medium text-foreground/80 leading-tight text-center">{item.name}</span>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Placed Items List */}
      {furniture.length > 0 && (
        <div className="border-t border-border/30 p-2 max-h-40 overflow-auto">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">Placed</p>
          <div className="space-y-1">
            {furniture.map(f => {
              const catalogItem = FURNITURE_CATALOG.find(c => c.type === f.furnitureType);
              return (
                <div key={f.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/20 text-xs">
                  <span>{catalogItem?.icon} {catalogItem?.name || f.furnitureType}</span>
                  <button onClick={() => onRemove(f.id)} className="text-destructive/60 hover:text-destructive transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};
