-- ============================================================================
-- The Case of Yusuf — Complete Supabase Database Schema & Fix Query
-- ============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Go to "SQL Editor" on the left menu
-- 3. Click "New Query", paste this entire SQL script, and click "RUN" (or Ctrl+Enter)
-- ============================================================================

-- 1. Ensure the rooms table exists with all required columns
create table if not exists public.rooms (
  code text primary key,
  status text not null default 'lobby',
  current_round_id text not null default 'round_1',
  round_ends_at timestamptz,
  claims jsonb not null default '{}'::jsonb,
  locks jsonb not null default '{}'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  last_claimed_exhibit text,
  last_claimed_by text,
  unlocked_evidence text[] not null default array['exhibit_torn_tunic'],
  last_unlocked_evidence text,
  last_unlocked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Add columns if table already existed without them
alter table public.rooms add column if not exists status text not null default 'lobby';
alter table public.rooms add column if not exists current_round_id text not null default 'round_1';
alter table public.rooms add column if not exists round_ends_at timestamptz;
alter table public.rooms add column if not exists claims jsonb not null default '{}'::jsonb;
alter table public.rooms add column if not exists locks jsonb not null default '{}'::jsonb;
alter table public.rooms add column if not exists scores jsonb not null default '{}'::jsonb;
alter table public.rooms add column if not exists last_claimed_exhibit text;
alter table public.rooms add column if not exists last_claimed_by text;
alter table public.rooms add column if not exists unlocked_evidence text[] not null default array['exhibit_torn_tunic'];
alter table public.rooms add column if not exists last_unlocked_evidence text;
alter table public.rooms add column if not exists last_unlocked_by text;
alter table public.rooms add column if not exists created_at timestamptz not null default now();
alter table public.rooms add column if not exists updated_at timestamptz not null default now();

-- 3. Drop any outdated restrictive check constraints that block courtroom statuses
alter table public.rooms drop constraint if exists rooms_status_check;

-- 4. Create or update room_players table with ON DELETE CASCADE
create table if not exists public.room_players (
  id text primary key,
  room_code text not null references public.rooms(code) on delete cascade,
  name text not null,
  slot smallint not null check (slot in (1, 2, 3)),
  is_host boolean not null default false,
  role_id text,
  is_simulated boolean not null default false,
  joined_at timestamptz not null default now(),
  constraint unique_room_slot unique (room_code, slot)
);

-- Drop any outdated role_id constraint so any advocate role is supported
alter table public.room_players drop constraint if exists room_players_role_id_check;

-- 5. Performance index on room_code
create index if not exists idx_room_players_room_code on public.room_players(room_code);

-- 6. Enable Row Level Security (RLS)
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

-- 7. Policies: Allow public anonymous access for game party rooms
drop policy if exists "Allow public access to rooms" on public.rooms;
create policy "Allow public access to rooms"
  on public.rooms for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Allow public access to room_players" on public.room_players;
create policy "Allow public access to room_players"
  on public.room_players for all
  to anon, authenticated
  using (true)
  with check (true);

-- 8. Enable full replication payloads for Supabase Realtime
alter table public.rooms replica identity full;
alter table public.room_players replica identity full;

-- 9. Add tables to supabase_realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_players'
  ) then
    alter publication supabase_realtime add table public.room_players;
  end if;
end $$;
