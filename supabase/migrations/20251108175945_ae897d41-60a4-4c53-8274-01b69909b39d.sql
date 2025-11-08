-- Fix infinite recursion in RLS by using SECURITY DEFINER helper functions
-- 1) Helper functions
create or replace function public.is_team_member(_team_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = _team_id and user_id = _user_id
  );
$$;

create or replace function public.is_conversation_member(_conversation_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = _conversation_id and user_id = _user_id
  );
$$;

create or replace function public.is_meeting_participant(_meeting_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.meeting_participants
    where meeting_id = _meeting_id and user_id = _user_id
  );
$$;

-- 2) Replace self-referential SELECT policies with function-based checks
-- team_members
drop policy if exists "Users can view team members of their teams" on public.team_members;
create policy "Users can view team members of their teams"
on public.team_members
for select
using (public.is_team_member(team_members.team_id, auth.uid()));

-- conversation_members
drop policy if exists "Users can view members of their conversations" on public.conversation_members;
create policy "Users can view members of their conversations"
on public.conversation_members
for select
using (public.is_conversation_member(conversation_members.conversation_id, auth.uid()));

-- meeting_participants
drop policy if exists "Users can view participants of their meetings" on public.meeting_participants;
create policy "Users can view participants of their meetings"
on public.meeting_participants
for select
using (public.is_meeting_participant(meeting_participants.meeting_id, auth.uid()));