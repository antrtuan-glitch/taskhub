-- TaskHub - Migration 001: Khởi tạo schema đầy đủ
-- Chạy lần đầu khi setup project

create table departments (
  id text primary key,
  name text not null,
  color text not null
);

insert into departments (id, name, color) values
  ('letan', 'Lễ tân', '#C9A227'),
  ('buongphong', 'Buồng phòng', '#3A7CA5'),
  ('bep', 'Bếp', '#B5563E'),
  ('baotri', 'Bảo trì', '#5E5240'),
  ('fnb', 'F&B', '#6A8D73');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  department_id text references departments(id),
  -- Lưu Web Push subscription JSON để gửi push notification
  push_subscription jsonb,
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- Bộ phận ĐANG giữ task tại thời điểm hiện tại (cây gậy tiếp sức)
  current_department_id text references departments(id) not null,
  status text not null default 'todo' check (status in ('todo','doing','done')),
  deadline timestamptz not null,
  created_by uuid references profiles(id),
  -- true khi task đã đi hết chuỗi, không cần chuyển tiếp nữa
  is_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tự động cập nhật updated_at mỗi khi task thay đổi
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- Lịch sử bàn giao giữa các bộ phận (cây gậy tiếp sức)
create table task_handoffs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  from_department_id text references departments(id),
  to_department_id text references departments(id) not null,
  handed_by uuid references profiles(id),
  note text,
  created_at timestamptz default now()
);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  author_id uuid references profiles(id),
  text text not null,
  created_at timestamptz default now()
);

-- Bật Realtime cho 3 bảng quan trọng
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table task_comments;
alter publication supabase_realtime add table task_handoffs;

-- Row Level Security
alter table tasks enable row level security;
alter table task_comments enable row level security;
alter table task_handoffs enable row level security;
alter table profiles enable row level security;
alter table departments enable row level security;

-- Departments: mọi người đều đọc được, không ai sửa qua API
create policy "Anyone read departments" on departments for select using (true);

-- Tasks: mọi nhân viên đều đọc/tạo/cập nhật
create policy "Authenticated read tasks" on tasks for select to authenticated using (true);
create policy "Authenticated insert tasks" on tasks for insert to authenticated with check (true);
create policy "Authenticated update tasks" on tasks for update to authenticated using (true);

-- Handoffs
create policy "Authenticated read handoffs" on task_handoffs for select to authenticated using (true);
create policy "Authenticated insert handoffs" on task_handoffs for insert to authenticated with check (true);

-- Comments
create policy "Authenticated read comments" on task_comments for select to authenticated using (true);
create policy "Authenticated insert comments" on task_comments for insert to authenticated with check (true);

-- Profiles
create policy "Authenticated read profiles" on profiles for select to authenticated using (true);
create policy "Users update own profile" on profiles for update to authenticated using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert to authenticated with check (auth.uid() = id);
