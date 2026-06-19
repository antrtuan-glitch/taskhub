-- TaskHub - Migration 006: Cho phép tối đa 5 ảnh/task (bảng riêng thay cho cột đơn)

create table task_images (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade not null,
  path text not null,
  url text not null,
  created_at timestamptz default now()
);

alter table task_images enable row level security;

create policy "Authenticated read task images" on task_images for select to authenticated using (true);
create policy "Authenticated insert task images" on task_images for insert to authenticated with check (true);
create policy "Admin delete task images row" on task_images for delete to authenticated using (is_admin());

-- Cột cũ image_url (1 ảnh) không còn dùng, chuyển hẳn sang bảng task_images
alter table tasks drop column if exists image_url;
