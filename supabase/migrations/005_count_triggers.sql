-- Migration 005: Auto-sync denormalized post counts via triggers
-- Replaces manual likes_count / comments_count updates from JS

create or replace function sync_post_counts()
returns trigger language plpgsql security definer as $$
declare
  v_post_id uuid;
begin
  v_post_id := coalesce(NEW.post_id, OLD.post_id);

  if TG_TABLE_NAME = 'post_likes' then
    update posts
      set likes_count = (select count(*) from post_likes where post_id = v_post_id)
      where id = v_post_id;
  elsif TG_TABLE_NAME = 'comments' then
    update posts
      set comments_count = (select count(*) from comments where post_id = v_post_id)
      where id = v_post_id;
  end if;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_sync_likes_count on post_likes;
create trigger trg_sync_likes_count
  after insert or delete on post_likes
  for each row execute function sync_post_counts();

drop trigger if exists trg_sync_comments_count on comments;
create trigger trg_sync_comments_count
  after insert or delete on comments
  for each row execute function sync_post_counts();
