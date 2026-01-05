import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useChatActions = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const blockUser = async (blockedUserId: string) => {
    if (!user) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({ user_id: user.id, blocked_user_id: blockedUserId });

      if (error) throw error;
      toast.success('User blocked successfully');
      return true;
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('User is already blocked');
      } else {
        toast.error('Failed to block user');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (blockedUserId: string) => {
    if (!user) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('user_id', user.id)
        .eq('blocked_user_id', blockedUserId);

      if (error) throw error;
      toast.success('User unblocked successfully');
      return true;
    } catch (error) {
      toast.error('Failed to unblock user');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reportUser = async (reportedUserId: string, reason: string, details?: string) => {
    if (!user) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_reports')
        .insert({ 
          reporter_id: user.id, 
          reported_user_id: reportedUserId, 
          reason,
          details 
        });

      if (error) throw error;
      toast.success('Report submitted successfully');
      return true;
    } catch (error) {
      toast.error('Failed to submit report');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unfriend = async (friendId: string) => {
    if (!user) return false;
    setLoading(true);
    try {
      // Delete friendship in both directions
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

      if (error) throw error;
      toast.success('Friend removed successfully');
      return true;
    } catch (error) {
      toast.error('Failed to remove friend');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const setNickname = async (targetUserId: string, nickname: string) => {
    if (!user) return false;
    setLoading(true);
    try {
      // Upsert nickname
      const { error } = await supabase
        .from('nicknames')
        .upsert(
          { user_id: user.id, target_user_id: targetUserId, nickname },
          { onConflict: 'user_id,target_user_id' }
        );

      if (error) throw error;
      toast.success('Nickname updated');
      return true;
    } catch (error) {
      toast.error('Failed to update nickname');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeNickname = async (targetUserId: string) => {
    if (!user) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('nicknames')
        .delete()
        .eq('user_id', user.id)
        .eq('target_user_id', targetUserId);

      if (error) throw error;
      toast.success('Nickname removed');
      return true;
    } catch (error) {
      toast.error('Failed to remove nickname');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getNickname = async (targetUserId: string): Promise<string | null> => {
    if (!user) return null;
    try {
      const { data } = await supabase
        .from('nicknames')
        .select('nickname')
        .eq('user_id', user.id)
        .eq('target_user_id', targetUserId)
        .single();

      return data?.nickname || null;
    } catch {
      return null;
    }
  };

  const isUserBlocked = async (targetUserId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('blocked_user_id', targetUserId)
        .single();

      return !!data;
    } catch {
      return false;
    }
  };

  return {
    blockUser,
    unblockUser,
    reportUser,
    unfriend,
    setNickname,
    removeNickname,
    getNickname,
    isUserBlocked,
    loading
  };
};