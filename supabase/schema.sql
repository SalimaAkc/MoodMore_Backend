
create table if not exists public.moods (
  id   integer primary key,
  name text    not null unique
);


insert into public.moods (id, name) values
  (1, 'Happy'),
  (2, 'Energetic'),
  (3, 'Calm'),
  (4, 'Romantic'),
  (5, 'Melancholic'),
  (6, 'Sad'),
  (7, 'Favorites'),
  (8, 'Custom')
on conflict (id) do nothing;


create table if not exists public.playlists (

  id uuid primary key default gen_random_uuid(),

  
  user_id uuid not null references auth.users (id) on delete cascade,

  
  mood_id integer not null references public.moods (id),

  name text not null default 'My playlist',


  songs jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now()
);


create index if not exists playlists_user_created_idx
  on public.playlists (user_id, created_at desc);

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


create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);


create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  return new;
end;
$$;


drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;

create trigger on_auth_user_updated
  after update of email on auth.users
  for each row execute function public.handle_user_update();


insert into public.profiles (id, email, full_name)
select id, email, raw_user_meta_data ->> 'full_name'
from auth.users
on conflict (id) do nothing;


insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;


select id, name from public.moods order by id;


select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'playlists'
order by ordinal_position;


select id, email, full_name, avatar_url from public.profiles;


select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'playlists'
  and column_name = 'is_public';


