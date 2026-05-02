-- Create the storage bucket for post images
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload images
create policy "Authenticated users can upload post images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'post-images');

-- Allow public read access (so all users can view images)
create policy "Public read access for post images"
on storage.objects for select
to public
using (bucket_id = 'post-images');

-- Allow users to delete their own uploads
create policy "Users can delete own post images"
on storage.objects for delete
to authenticated
using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);
