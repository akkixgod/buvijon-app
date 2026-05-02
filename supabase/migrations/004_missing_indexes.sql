-- Migration 004: Add missing indexes for query performance

-- children(parent_id, is_active) — used in every childrenStore query
create index if not exists idx_children_parent_active
  on children(parent_id, is_active);

-- posts(author_id, created_at) — for querying a user's own posts
create index if not exists idx_posts_author_id
  on posts(author_id, created_at desc);

-- chat_messages(chat_room_id, created_at) — for paginated message loading
create index if not exists idx_chat_messages_room_created
  on chat_messages(chat_room_id, created_at desc);

-- family_members(family_tree_id, is_active) — filter active members
create index if not exists idx_family_members_tree_active
  on family_members(family_tree_id, is_active);
