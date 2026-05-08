-- Migration 003: Security fixes
-- 1. Fix posts UPDATE policy (anyone could update any post)
-- 2. Add FK constraint on ranking_cache.child_id
-- 3. Add missing RLS policies on family_members

-- ============================================================
-- 1. FIX POSTS UPDATE POLICY
-- ============================================================

drop policy if exists "Users can update own posts" on posts;
drop policy if exists "Authors can update own posts" on posts;

create policy "Authors can update own posts" on posts
  for update using (auth.uid() = author_id);

-- SECURITY DEFINER function for incrementing likes/comments counts
-- (allows the trigger to bypass RLS when updating counts)
create or replace function increment_post_likes(p_post_id uuid, delta int)
returns void language plpgsql security definer as $$
begin
  update posts set likes_count = likes_count + delta where id = p_post_id;
end;
$$;

-- ============================================================
-- 2. FK CONSTRAINT ON ranking_cache.child_id
-- ============================================================

-- Drop FK if it already exists (idempotent)
alter table ranking_cache
  drop constraint if exists fk_ranking_cache_child;

alter table ranking_cache
  add constraint fk_ranking_cache_child
  foreign key (child_id) references children(id) on delete cascade;

-- ============================================================
-- 3. FAMILY MEMBERS RLS POLICIES
-- ============================================================

-- Block direct INSERT — membership only via accept_family_join_request() function
drop policy if exists "Only via accepted request" on family_members;
create policy "Only via accepted request" on family_members
  for insert with check (false);

-- Only creator/admin of that tree can update membership
drop policy if exists "Admins can update members" on family_members;
create policy "Admins can update members" on family_members
  for update using (
    exists (
      select 1 from family_members fm
      where fm.family_tree_id = family_members.family_tree_id
        and fm.parent_id = auth.uid()
        and fm.role in ('creator', 'admin')
        and fm.is_active = true
    )
  );

-- Creator/admin OR the member themselves (to leave the family)
drop policy if exists "Admins or self can remove" on family_members;
create policy "Admins or self can remove" on family_members
  for delete using (
    parent_id = auth.uid()
    or exists (
      select 1 from family_members fm
      where fm.family_tree_id = family_members.family_tree_id
        and fm.parent_id = auth.uid()
        and fm.role in ('creator', 'admin')
        and fm.is_active = true
    )
  );
