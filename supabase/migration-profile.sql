
alter table public.playlists
  add column if not exists is_public boolean not null default false;

create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (follower_id, followee_id),

 
  constraint follows_not_self check (follower_id <> followee_id)
);


create index if not exists follows_followee_idx
  on public.follows (followee_id);


alter table public.follows enable row level security;

drop policy if exists "read follows about me" on public.follows;
drop policy if exists "create own follows" on public.follows;
drop policy if exists "delete own follows" on public.follows;

create policy "read follows about me"
  on public.follows
  for select
  to authenticated
  using (auth.uid() = follower_id or auth.uid() = followee_id);

create policy "create own follows"
  on public.follows
  for insert
  to authenticated
  with check (auth.uid() = follower_id);

create policy "delete own follows"
  on public.follows
  for delete
  to authenticated
  using (auth.uid() = follower_id);


select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'playlists'
  and column_name = 'is_public';


select relname as table_name, relrowsecurity as rls_on
from pg_class
where relname = 'follows' and relnamespace = 'public'::regnamespace;


select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'follows'
order by cmd;
