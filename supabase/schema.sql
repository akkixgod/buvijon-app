-- ============================================================
-- BUVIJON — Supabase Schema
-- Запусти это в SQL Editor своего проекта на supabase.com
-- ============================================================

-- 1. PROFILES (расширяет встроенную auth.users)
create table if not exists public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  name       text        not null,
  phone      text        unique not null,
  email      text,
  avatar     text,
  is_premium boolean     not null default false,
  created_at timestamptz not null default now()
);

-- 2. CHILDREN
create table if not exists public.children (
  id                   uuid        default gen_random_uuid() primary key,
  parent_id            uuid        not null references public.profiles(id) on delete cascade,
  name                 text        not null,
  age                  integer     not null check (age between 1 and 18),
  avatar               text,
  flower_variant       text        not null default 'sunflower',
  flower_color         text        not null default '#FF9800',
  daily_limit_minutes  integer     not null default 60 check (daily_limit_minutes > 0),
  screen_time_today    integer     not null default 0 check (screen_time_today >= 0),
  screen_time_week     integer[]   not null default '{0,0,0,0,0,0,0}',
  is_active            boolean     not null default true,
  last_seen            timestamptz,
  created_at           timestamptz not null default now()
);

-- 3. SCREEN_SESSIONS (история сессий)
create table if not exists public.screen_sessions (
  id               uuid        default gen_random_uuid() primary key,
  child_id         uuid        not null references public.children(id) on delete cascade,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  duration_minutes integer     not null default 0,
  date             date        not null default current_date
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.children       enable row level security;
alter table public.screen_sessions enable row level security;

-- Profiles
create policy "own_profile_select" on public.profiles
  for select using (auth.uid() = id);

create policy "own_profile_update" on public.profiles
  for update using (auth.uid() = id);

create policy "own_profile_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- Children
create policy "children_select" on public.children
  for select using (auth.uid() = parent_id);

create policy "children_insert" on public.children
  for insert with check (auth.uid() = parent_id);

create policy "children_update" on public.children
  for update using (auth.uid() = parent_id);

create policy "children_delete" on public.children
  for delete using (auth.uid() = parent_id);

-- Screen sessions
create policy "sessions_select" on public.screen_sessions
  for select using (
    exists (
      select 1 from public.children
      where children.id = screen_sessions.child_id
        and children.parent_id = auth.uid()
    )
  );

create policy "sessions_insert" on public.screen_sessions
  for insert with check (
    exists (
      select 1 from public.children
      where children.id = screen_sessions.child_id
        and children.parent_id = auth.uid()
    )
  );

-- ============================================================
-- ИНДЕКСЫ
-- ============================================================

create index if not exists children_parent_id_idx on public.children(parent_id);
create index if not exists sessions_child_id_idx  on public.screen_sessions(child_id);
create index if not exists sessions_date_idx       on public.screen_sessions(date);
