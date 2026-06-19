-- TaskHub - Migration 002: Bổ sung phân quyền Admin
-- Chạy sau 001_init.sql

-- 1. Thêm cột role vào profiles
alter table profiles add column role text not null default 'staff' check (role in ('admin','staff'));

-- 2. Helper function kiểm tra admin (dùng security definer để tránh đệ quy RLS khi check role trong policy)
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- 3. RLS bổ sung cho admin: đọc/xóa mọi thứ
-- Profiles
create policy "Admin read all profiles" on profiles for select to authenticated using (is_admin());
create policy "Admin update all profiles" on profiles for update to authenticated using (is_admin());
create policy "Admin delete profiles" on profiles for delete to authenticated using (is_admin());

-- Tasks
create policy "Admin delete tasks" on tasks for delete to authenticated using (is_admin());
create policy "Admin update all tasks" on tasks for update to authenticated using (is_admin());

-- Handoffs: admin đọc được toàn bộ (đã có policy đọc chung cho mọi authenticated, giữ nguyên)
create policy "Admin delete handoffs" on task_handoffs for delete to authenticated using (is_admin());

-- Comments
create policy "Admin delete comments" on task_comments for delete to authenticated using (is_admin());

-- 4. Trigger: tài khoản đầu tiên đăng ký tự động thành admin
create or replace function set_first_user_admin()
returns trigger as $$
begin
  if (select count(*) from profiles) = 0 then
    new.role := 'admin';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger profiles_first_admin
  before insert on profiles
  for each row execute function set_first_user_admin();
