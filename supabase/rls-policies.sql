
alter table public.moods enable row level security;

drop policy if exists "anyone can read moods" on public.moods;

create policy "anyone can read moods"
  on public.moods
  for select
  to anon, authenticated
  using (true);


alter table public.playlists enable row level security;

drop policy if exists "read own playlists" on public.playlists;
drop policy if exists "create own playlists" on public.playlists;
drop policy if exists "update own playlists" on public.playlists;
drop policy if exists "delete own playlists" on public.playlists;


create policy "read own playlists"
  on public.playlists
  for select
  to authenticated
  using (auth.uid() = user_id);


create policy "create own playlists"
  on public.playlists
  for insert
  to authenticated
  with check (auth.uid() = user_id);


create policy "update own playlists"
  on public.playlists
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own playlists"
  on public.playlists
  for delete
  to authenticated
  using (auth.uid() = user_id);


alter table public.playlists
  alter column user_id set default auth.uid();


alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "create own profile" on public.profiles;

create policy "read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);


create policy "create own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

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

drop policy if exists "avatars are readable" on storage.objects;
drop policy if exists "upload own avatar" on storage.objects;
drop policy if exists "update own avatar" on storage.objects;
drop policy if exists "delete own avatar" on storage.objects;

create policy "avatars are readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "upload own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "update own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "delete own avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


select relname as table_name, relrowsecurity as rls_on
from pg_class
where relname in ('moods', 'playlists', 'profiles', 'follows')
  and relnamespace = 'public'::regnamespace;


select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('moods', 'playlists', 'profiles', 'follows')
order by tablename, cmd;


