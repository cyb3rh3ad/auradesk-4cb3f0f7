import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const TEAMS_ERROR_TOAST_KEY = 'teams_error_toasted';
let TEAMS_ERROR_TOASTED = typeof window !== 'undefined' && sessionStorage.getItem(TEAMS_ERROR_TOAST_KEY) === '1';
export interface Team {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  user_role?: string;
}

export const useTeams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTeams = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members!inner(role, user_id)
        `)
        .eq('team_members.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const teamsWithCounts = await Promise.all(
        (data || []).map(async (team: any) => {
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

          return {
            id: team.id,
            name: team.name,
            description: team.description,
            avatar_url: team.avatar_url,
            created_by: team.created_by,
            created_at: team.created_at,
            updated_at: team.updated_at,
            member_count: count || 0,
            user_role: team.team_members[0]?.role,
          };
        })
      );

      setTeams(teamsWithCounts);
    } catch (error: any) {
      console.error('Error fetching teams:', error);
      if (!TEAMS_ERROR_TOASTED) {
        TEAMS_ERROR_TOASTED = true;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(TEAMS_ERROR_TOAST_KEY, '1');
        }
        toast({
          title: 'Could not load teams',
          description: 'Please try again later.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [user]);

  const createTeam = async (name: string, description?: string) => {
    if (!user) return null;

    try {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name,
          description: description?.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      toast({
        title: 'Success',
        description: 'Team created successfully',
      });

      fetchTeams();
      return team;
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast({
        title: 'Error',
        description: 'Failed to create team',
        variant: 'destructive',
      });
      return null;
    }
  };

  const addMember = async (teamId: string, username: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (profileError || !profile) {
        toast({
          title: 'Error',
          description: 'User not found',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: profile.id,
          role: 'member',
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Member added successfully',
      });

      fetchTeams();
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add member',
        variant: 'destructive',
      });
    }
  };

  return {
    teams,
    loading,
    createTeam,
    addMember,
    refetch: fetchTeams,
  };
};
