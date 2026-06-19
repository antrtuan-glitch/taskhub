-- TaskHub - Migration 007: Theo dõi thời điểm hoàn thành để tự động xóa sau 7 ngày

alter table tasks add column completed_at timestamptz;

create or replace function set_completed_at()
returns trigger as $$
begin
  if new.is_completed = true and (old.is_completed is distinct from true) then
    new.completed_at = now();
  elsif new.is_completed = false then
    new.completed_at = null;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger tasks_completed_at
  before update on tasks
  for each row execute function set_completed_at();

-- Backfill cho task đã hoàn thành từ trước (dùng updated_at làm mốc tạm)
update tasks set completed_at = updated_at where is_completed = true and completed_at is null;
