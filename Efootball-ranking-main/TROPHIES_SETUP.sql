-- Run this in your Supabase SQL editor

create table if not exists trophies (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  competition_name text not null,
  trophy_type text not null default 'winner',
  count integer not null default 1,
  created_at timestamptz default now()
);

-- Allow public read
alter table trophies enable row level security;
create policy "Public read" on trophies for select using (true);
create policy "Service role write" on trophies for all using (auth.role() = 'service_role');
