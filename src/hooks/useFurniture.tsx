import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PlacedFurniture } from '@/components/auraville/furnitureTypes';

export function useFurniture(houseOwnerId: string | null) {
  const { user } = useAuth();
  const [furniture, setFurniture] = useState<PlacedFurniture[]>([]);
  const [loading, setLoading] = useState(false);
  const isOwner = user?.id === houseOwnerId;

  // Load furniture for a house
  useEffect(() => {
    if (!houseOwnerId) { setFurniture([]); return; }
    setLoading(true);
    supabase
      .from('house_furniture')
      .select('*')
      .eq('user_id', houseOwnerId)
      .then(({ data }) => {
        if (data) {
          setFurniture(data.map(d => ({
            id: d.id,
            userId: d.user_id,
            furnitureType: d.furniture_type,
            x: d.x,
            y: d.y,
            room: d.room,
            variant: d.variant,
            rotation: d.rotation,
          })));
        }
        setLoading(false);
      });
  }, [houseOwnerId]);

  const addFurniture = useCallback(async (type: string, x: number, y: number, room: string) => {
    if (!user || !isOwner) return;
    const { data } = await supabase
      .from('house_furniture')
      .insert({ user_id: user.id, furniture_type: type, x, y, room })
      .select()
      .single();
    if (data) {
      setFurniture(prev => [...prev, {
        id: data.id,
        userId: data.user_id,
        furnitureType: data.furniture_type,
        x: data.x,
        y: data.y,
        room: data.room,
        variant: data.variant,
        rotation: data.rotation,
      }]);
    }
  }, [user, isOwner]);

  const moveFurniture = useCallback(async (id: string, x: number, y: number) => {
    if (!isOwner) return;
    await supabase.from('house_furniture').update({ x, y }).eq('id', id);
    setFurniture(prev => prev.map(f => f.id === id ? { ...f, x, y } : f));
  }, [isOwner]);

  const removeFurniture = useCallback(async (id: string) => {
    if (!isOwner) return;
    await supabase.from('house_furniture').delete().eq('id', id);
    setFurniture(prev => prev.filter(f => f.id !== id));
  }, [isOwner]);

  return { furniture, loading, isOwner, addFurniture, moveFurniture, removeFurniture };
}
