-- ═══════════════════════════════════════════════════════════════
-- Posts & Comments tables for Buvijon
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── Posts table ───────────────────────────────────────────────
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_avatar text,
  child_id uuid references children(id) on delete set null,
  child_name text,
  type text not null default 'note' check (type in ('progress', 'milestone', 'tip', 'note')),
  content text not null,
  likes_count int not null default 0,
  comments_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ─── Comments table ───────────────────────────────────────────
create table if not exists comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_avatar text,
  content text not null,
  created_at timestamptz not null default now()
);

-- ─── Post likes (one like per user per post) ──────────────────
create table if not exists post_likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

-- ─── Indexes ──────────────────────────────────────────────────
create index if not exists idx_posts_created_at on posts(created_at desc);
create index if not exists idx_comments_post_id on comments(post_id);
create index if not exists idx_post_likes_post_id on post_likes(post_id);
create index if not exists idx_post_likes_user_id on post_likes(user_id);

-- ─── RLS Policies ─────────────────────────────────────────────
alter table posts enable row level security;
alter table comments enable row level security;
alter table post_likes enable row level security;

-- Everyone can read all posts (global feed)
create policy "Posts are viewable by everyone" on posts
  for select using (true);

-- Users can insert their own posts
create policy "Users can create posts" on posts
  for insert with check (auth.uid() = author_id);

-- Users can delete their own posts
create policy "Users can delete own posts" on posts
  for delete using (auth.uid() = author_id);

-- Users can update their own posts (for likes_count, comments_count)
create policy "Users can update own posts" on posts
  for update using (true);

-- Everyone can read comments
create policy "Comments are viewable by everyone" on comments
  for select using (true);

-- Users can insert their own comments
create policy "Users can create comments" on comments
  for insert with check (auth.uid() = author_id);

-- Users can delete their own comments
create policy "Users can delete own comments" on comments
  for delete using (auth.uid() = author_id);

-- Everyone can read likes
create policy "Likes are viewable by everyone" on post_likes
  for select using (true);

-- Users can insert their own likes
create policy "Users can like posts" on post_likes
  for insert with check (auth.uid() = user_id);

-- Users can remove their own likes
create policy "Users can unlike posts" on post_likes
  for delete using (auth.uid() = user_id);
