-- TaskHub - Migration 003: Tự tạo profile bằng trigger trên auth.users
-- Sửa lỗi: khi bật xác nhận email, client chưa có session lúc đăng ký
-- nên insert vào profiles từ client bị RLS chặn (auth.uid() = null).
-- Chuyển việc tạo profile sang trigger security definer, không bị RLS chặn.

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, department_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'department_id'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Không còn cần policy insert từ client (trigger đã đảm nhiệm), nhưng giữ lại
-- để không phá vỡ luồng cũ nếu còn nơi nào insert trực tiếp.
