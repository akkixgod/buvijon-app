-- Add image_url column to posts table
alter table posts add column if not exists image_url text;
