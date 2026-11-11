-- ============================================================================
-- The Case of Yusuf — Supabase Database Schema & Realtime Setup
-- ============================================================================
-- Instructions:
-- 1. Open your Supabase Project: https://supabase.com/dashboard
-- 2. In the left sidebar, click "SQL Editor"
-- 3. Click "New query", paste this entire script, and click "Run" (or Ctrl+Enter)
-- ============================================================================

-- 1. Create the rooms table
create table if not exists public.rooms (
  code text primary key,
  status text not null default 'lobby' check (status in ('lobby', 'roles_assigned', 'in_case')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create the room_players table
create table if not exists public.room_players (
  id text primary key,
  room_code text not null references public.rooms(code) on delete cascade,
  name text not null,
  slot smallint not null check (slot in (1, 2, 3)),
  is_host boolean not null default false,
  role_id text check (role_id is null or role_id in ('brothers', 'household', 'authorities')),
  is_simulated boolean not null default false,
  joined_at timestamptz not null default now(),
  constraint unique_room_slot unique (room_code, slot)
);

-- 3. Create performance indexes
create index if not exists idx_room_players_room_code on public.room_players(room_code);

-- 4. Enable Row Level Security (RLS)
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

-- 5. RLS Policies: Allow anon/public access for game party rooms
drop policy if exists "Allow public access to rooms" on public.rooms;
create policy "Allow public access to rooms"
  on public.rooms
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Allow public access to room_players" on public.room_players;
create policy "Allow public access to room_players"
  on public.room_players
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- 6. Configure Realtime Replication & Full Row Payloads
alter table public.rooms replica identity full;
alter table public.room_players replica identity full;

-- Add tables to the supabase_realtime publication safely
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
