create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  city text not null default 'Ciudad de México',
  role text not null default 'user' check (role in ('user', 'business', 'organization')),
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text,
  description text not null,
  category text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  condition text not null,
  location text not null,
  latitude double precision,
  longitude double precision,
  availability text not null default 'Disponible'
    check (availability in ('Disponible', 'Reservado', 'Entregado')),
  photos text[] not null default '{}',
  ai_tags text[] not null default '{}',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  material text not null,
  type text,
  category text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  condition text,
  description text not null,
  location text not null,
  needed_by timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  request_id uuid not null references public.requests(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  reason text not null,
  created_at timestamptz not null default now(),
  constraint matches_material_request_unique unique (material_id, request_id)
);

create index materials_available_created_idx on public.materials (availability, created_at desc);
create index materials_user_idx on public.materials (user_id);
create index requests_user_idx on public.requests (user_id);
create index matches_material_idx on public.matches (material_id);
create index matches_request_idx on public.matches (request_id);

create function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'city', 'Ciudad de México')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_auth_user();

alter table public.profiles enable row level security;
alter table public.materials enable row level security;
alter table public.requests enable row level security;
alter table public.matches enable row level security;
