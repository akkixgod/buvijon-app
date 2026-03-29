-- ============================================================
-- BUVIJON — Stories migration
-- Запусти это в SQL Editor своего проекта на supabase.com
-- ============================================================

-- 1. STORIES
create table if not exists public.stories (
  id         uuid        default gen_random_uuid() primary key,
  author_id  uuid        not null references public.profiles(id) on delete cascade,
  image_url  text        not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

-- 2. STORY_VIEWS (кто посмотрел чью историю)
create table if not exists public.story_views (
  story_id   uuid not null references public.stories(id) on delete cascade,
  viewer_id  uuid not null references public.profiles(id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.stories     enable row level security;
alter table public.story_views enable row level security;

-- Stories: все аутентифицированные пользователи видят не истёкшие истории
create policy "stories_select" on public.stories
  for select using (auth.uid() is not null and expires_at > now());

-- Stories: только автор может публиковать
create policy "stories_insert" on public.stories
  for insert with check (auth.uid() = author_id);

-- Story views: только владелец видит свои просмотры
create policy "story_views_select" on public.story_views
  for select using (auth.uid() = viewer_id);

-- Story views: любой аутентифицированный может отметить просмотр за себя
create policy "story_views_insert" on public.story_views
  for insert with check (auth.uid() = viewer_id);

-- ============================================================
-- PROFILES RLS — разрешаем всем видеть имена других пользователей
-- (нужно для отображения автора истории)
-- ============================================================

-- Удалить старый ограничивающий policy (только себя)
drop policy if exists "own_profile_select" on public.profiles;

-- Новый policy: любой аутентифицированный видит все профили
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.uid() is not null);

-- ============================================================
-- STORAGE BUCKET (выполни отдельно в Dashboard → Storage)
-- ============================================================
-- Создай bucket "stories" с настройкой Public = true
-- Или вставь через SQL:
-- insert into storage.buckets (id, name, public) values ('stories', 'stories', true)
--   on conflict (id) do nothing;

-- ============================================================
-- ИНДЕКСЫ
-- ============================================================

create index if not exists stories_author_id_idx  on public.stories(author_id);
create index if not exists stories_expires_at_idx on public.stories(expires_at);
create index if not exists story_views_story_id_idx on public.story_views(story_id);
