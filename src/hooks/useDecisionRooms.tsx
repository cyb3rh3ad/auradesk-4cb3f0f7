import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface DecisionOption {
  id: string;
  room_id: string;
  label: string;
  description: string | null;
  color: string | null;
  position: number;
  vote_count?: number;
  voted_by_me?: boolean;
}

export interface DecisionRoom {
  id: string;
  team_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  status: string;
  voting_type: string;
  is_anonymous: boolean;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  options?: DecisionOption[];
  total_votes?: number;
  creator_name?: string;
}

const OPTION_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
];

export const useDecisionRooms = (teamId?: string) => {
  const [rooms, setRooms] = useState<DecisionRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchRooms = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      let query = supabase
        .from('decision_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data: roomsData, error } = await query;
      if (error) throw error;
      if (!roomsData || roomsData.length === 0) {
        setRooms([]);
        return;
      }

      const roomIds = roomsData.map(r => r.id);

      // Fetch options and votes in parallel
      const [optionsRes, votesRes, creatorsRes] = await Promise.all([
        supabase.from('decision_options').select('*').in('room_id', roomIds).order('position'),
        supabase.from('decision_votes').select('*').in('room_id', roomIds),
        supabase.from('profiles').select('id, full_name, username').in('id', roomsData.map(r => r.created_by)),
      ]);

      const options = optionsRes.data || [];
      const votes = votesRes.data || [];
      const creators = creatorsRes.data || [];

      const creatorMap = new Map(creators.map(c => [c.id, c.full_name || c.username || 'Unknown']));

      const enriched: DecisionRoom[] = roomsData.map(room => {
        const roomOptions = options
          .filter(o => o.room_id === room.id)
          .map(opt => ({
            ...opt,
            vote_count: votes.filter(v => v.option_id === opt.id).length,
            voted_by_me: votes.some(v => v.option_id === opt.id && v.user_id === user.id),
          }));

        return {
          ...room,
          options: roomOptions,
          total_votes: votes.filter(v => v.room_id === room.id).length,
          creator_name: creatorMap.get(room.created_by) || 'Unknown',
        };
      });

      setRooms(enriched);
    } catch (err: any) {
      console.error('Error fetching decision rooms:', err);
    } finally {
      setLoading(false);
    }
  }, [user, teamId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Realtime subscription for votes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('decision-votes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'decision_votes' }, () => {
        fetchRooms();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'decision_rooms' }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchRooms]);

  const createRoom = async (
    title: string,
    description: string,
    options: string[],
    votingType: string = 'single',
    isAnonymous: boolean = true,
    deadline?: Date,
  ) => {
    if (!user || !teamId) return null;
    try {
      const { data: room, error } = await supabase
        .from('decision_rooms')
        .insert({
          team_id: teamId,
          created_by: user.id,
          title,
          description: description || null,
          voting_type: votingType,
          is_anonymous: isAnonymous,
          deadline: deadline?.toISOString() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert options
      const optionRows = options.filter(o => o.trim()).map((label, i) => ({
        room_id: room.id,
        label: label.trim(),
        color: OPTION_COLORS[i % OPTION_COLORS.length],
        position: i,
      }));

      if (optionRows.length > 0) {
        const { error: optError } = await supabase.from('decision_options').insert(optionRows);
        if (optError) throw optError;
      }

      toast({ title: 'Decision Room created', description: `"${title}" is now open for voting` });
      await fetchRooms();
      return room;
    } catch (err: any) {
      console.error('Error creating decision room:', err);
      toast({ title: 'Error', description: 'Failed to create decision room', variant: 'destructive' });
      return null;
    }
  };

  const castVote = async (roomId: string, optionId: string) => {
    if (!user) return;
    try {
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;

      if (room.voting_type === 'single') {
        // Remove existing vote in this room first
        await supabase.from('decision_votes').delete().eq('room_id', roomId).eq('user_id', user.id);
      }

      const { error } = await supabase.from('decision_votes').insert({
        room_id: roomId,
        option_id: optionId,
        user_id: user.id,
      });

      if (error) {
        if (error.code === '23505') {
          // Already voted, toggle off
          await supabase.from('decision_votes').delete()
            .eq('room_id', roomId)
            .eq('option_id', optionId)
            .eq('user_id', user.id);
        } else {
          throw error;
        }
      }
    } catch (err: any) {
      console.error('Error casting vote:', err);
      toast({ title: 'Error', description: 'Failed to cast vote', variant: 'destructive' });
    }
  };

  const closeRoom = async (roomId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('decision_rooms')
        .update({ status: 'closed' })
        .eq('id', roomId)
        .eq('created_by', user.id);
      if (error) throw error;
      toast({ title: 'Room closed', description: 'Voting has ended' });
    } catch (err: any) {
      console.error('Error closing room:', err);
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('decision_rooms')
        .delete()
        .eq('id', roomId)
        .eq('created_by', user.id);
      if (error) throw error;
      toast({ title: 'Room deleted' });
    } catch (err: any) {
      console.error('Error deleting room:', err);
    }
  };

  return { rooms, loading, createRoom, castVote, closeRoom, deleteRoom, refetch: fetchRooms };
};
