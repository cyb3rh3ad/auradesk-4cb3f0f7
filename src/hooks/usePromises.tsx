import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Promise {
  id: string;
  creator_id: string;
  team_id: string | null;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  creator_profile?: { full_name: string | null; username: string | null; avatar_url: string | null };
  signatures: PromiseSignature[];
}

export interface PromiseSignature {
  id: string;
  promise_id: string;
  user_id: string;
  signature_data: string | null;
  signed_at: string | null;
  status: string;
  created_at: string;
  profile?: { full_name: string | null; username: string | null; avatar_url: string | null };
}

export function usePromises(teamId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [promises, setPromises] = useState<Promise[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPromises = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase
        .from('promises')
        .select('*')
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch signatures and profiles for each promise
      const promiseIds = (data || []).map(p => p.id);
      const creatorIds = [...new Set((data || []).map(p => p.creator_id))];

      const [sigRes, profileRes] = await window.Promise.all([
        promiseIds.length > 0
          ? supabase.from('promise_signatures').select('*').in('promise_id', promiseIds)
          : { data: [], error: null },
        creatorIds.length > 0
          ? supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', creatorIds)
          : { data: [], error: null },
      ]);

      const signatures = sigRes.data || [];
      const signerIds = [...new Set(signatures.map(s => s.user_id))];

      let signerProfiles: any[] = [];
      if (signerIds.length > 0) {
        const { data: sp } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', signerIds);
        signerProfiles = sp || [];
      }

      const profileMap = new Map((profileRes.data || []).map(p => [p.id, p]));
      const signerMap = new Map(signerProfiles.map(p => [p.id, p]));

      const enriched: Promise[] = (data || []).map(p => ({
        ...p,
        creator_profile: profileMap.get(p.creator_id),
        signatures: signatures
          .filter(s => s.promise_id === p.id)
          .map(s => ({ ...s, profile: signerMap.get(s.user_id) })),
      }));

      setPromises(enriched);
    } catch (e: any) {
      console.error('Error fetching promises:', e);
    } finally {
      setLoading(false);
    }
  }, [user, teamId]);

  useEffect(() => {
    fetchPromises();
  }, [fetchPromises]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('promises-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promises' }, () => fetchPromises())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promise_signatures' }, () => fetchPromises())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPromises]);

  const createPromise = async (
    title: string,
    description: string,
    deadline: string | null,
    signerIds: string[],
    tId?: string
  ) => {
    if (!user) return null;
    try {
      const insertData: any = {
        creator_id: user.id,
        team_id: tId || teamId || null,
        title,
        description: description || null,
        status: 'pending',
      };
      // Only add deadline if it's a valid value
      if (deadline) {
        insertData.deadline = new Date(deadline).toISOString();
      }

      const { data, error } = await supabase.from('promises').insert(insertData).select().single();

      if (error) {
        console.error('Promise insert error:', error);
        throw error;
      }

      // Add creator as a signer too
      const allSigners = [...new Set([user.id, ...signerIds])];
      const sigRows = allSigners.map(uid => ({
        promise_id: data.id,
        user_id: uid,
        status: 'pending',
      }));

      const { error: sigError } = await supabase.from('promise_signatures').insert(sigRows);
      if (sigError) {
        console.error('Signature insert error:', sigError);
        throw sigError;
      }

      toast({ title: 'Promise created', description: 'Waiting for signatures' });
      return data;
    } catch (e: any) {
      console.error('Create promise error:', e);
      toast({ title: 'Error creating promise', description: e.message || 'Something went wrong', variant: 'destructive' });
      return null;
    }
  };

  const signPromise = async (promiseId: string, signatureData: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('promise_signatures')
        .update({
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          status: 'signed',
        })
        .eq('promise_id', promiseId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Get promise details for notification
      const { data: promise } = await supabase
        .from('promises')
        .select('creator_id, title')
        .eq('id', promiseId)
        .single();

      // Get user profile for notification message
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single();
      
      const signerName = profile?.full_name || profile?.username || 'Someone';

      // Notify creator that someone signed
      if (promise && promise.creator_id !== user.id) {
        await supabase.from('promise_notifications').insert({
          promise_id: promiseId,
          user_id: promise.creator_id,
          type: 'signed',
          message: `${signerName} signed your promise "${promise.title}"`,
        });
      }

      // Check if all signed → update promise status
      const { data: sigs } = await supabase
        .from('promise_signatures')
        .select('status, user_id')
        .eq('promise_id', promiseId);

      const allSigned = sigs?.every(s => s.status === 'signed');
      if (allSigned && promise) {
        await supabase.from('promises').update({ status: 'fulfilled' }).eq('id', promiseId);
        
        // Notify all signers that the promise is fulfilled
        const notifs = (sigs || [])
          .filter(s => s.user_id !== user.id)
          .map(s => ({
            promise_id: promiseId,
            user_id: s.user_id,
            type: 'fulfilled',
            message: `Promise "${promise.title}" has been fulfilled — all parties have signed!`,
          }));
        if (notifs.length > 0) {
          await supabase.from('promise_notifications').insert(notifs);
        }
      }

      toast({ title: 'Signed!', description: 'Your signature has been recorded' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const declinePromise = async (promiseId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('promise_signatures')
        .update({ status: 'declined' })
        .eq('promise_id', promiseId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Get promise details and user profile for notification
      const [{ data: promise }, { data: profile }] = await window.Promise.all([
        supabase.from('promises').select('creator_id, title').eq('id', promiseId).single(),
        supabase.from('profiles').select('full_name, username').eq('id', user.id).single(),
      ]);

      const declinerName = profile?.full_name || profile?.username || 'Someone';

      // Notify creator
      if (promise && promise.creator_id !== user.id) {
        await supabase.from('promise_notifications').insert({
          promise_id: promiseId,
          user_id: promise.creator_id,
          type: 'broken',
          message: `${declinerName} declined your promise "${promise.title}"`,
        });
      }

      // Mark the promise as broken
      await supabase.from('promises').update({ status: 'broken' }).eq('id', promiseId);

      // Notify all other signers
      const { data: sigs } = await supabase
        .from('promise_signatures')
        .select('user_id')
        .eq('promise_id', promiseId)
        .neq('user_id', user.id);

      if (sigs && sigs.length > 0 && promise) {
        const notifs = sigs.map(s => ({
          promise_id: promiseId,
          user_id: s.user_id,
          type: 'broken',
          message: `${declinerName} broke the promise "${promise.title}"`,
        }));
        await supabase.from('promise_notifications').insert(notifs);
      }

      toast({ title: 'Declined', description: 'You declined this promise' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  return { promises, loading, createPromise, signPromise, declinePromise, refetch: fetchPromises };
}
