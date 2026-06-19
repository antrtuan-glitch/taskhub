-- TaskHub - Migration 004: Cho phép admin tạo/sửa/xóa bộ phận

create policy "Admin insert departments" on departments for insert to authenticated with check (is_admin());
create policy "Admin update departments" on departments for update to authenticated using (is_admin());
create policy "Admin delete departments" on departments for delete to authenticated using (is_admin());
