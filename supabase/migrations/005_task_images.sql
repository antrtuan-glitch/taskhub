-- TaskHub - Migration 005: Thêm ảnh đính kèm khi tạo task

alter table tasks add column image_url text;

-- Storage bucket public để lưu ảnh task (ảnh không nhạy cảm, đọc công khai qua URL)
insert into storage.buckets (id, name, public)
values ('task-images', 'task-images', true)
on conflict (id) do nothing;

-- Ai đã đăng nhập đều upload được, ai cũng đọc được (bucket public)
create policy "Authenticated upload task images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'task-images');

create policy "Anyone read task images" on storage.objects
  for select using (bucket_id = 'task-images');

create policy "Admin delete task images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'task-images' and is_admin());
