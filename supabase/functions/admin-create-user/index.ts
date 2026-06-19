// Edge Function: admin-create-user
// Cho phép admin tạo tài khoản nhân viên trực tiếp (không cần email tự đăng ký).
// Yêu cầu header Authorization: Bearer <access_token> của người gọi (phải là admin).

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Thiếu Authorization token" }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Xác thực người gọi và kiểm tra role admin
  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller?.user) {
    return new Response(JSON.stringify({ error: "Token không hợp lệ" }), { status: 401 });
  }

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", caller.user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Chỉ admin mới được tạo tài khoản" }), { status: 403 });
  }

  const { email, password, full_name, department_id } = await req.json();
  if (!email || !password || !full_name) {
    return new Response(JSON.stringify({ error: "Thiếu email, password hoặc họ tên" }), { status: 400 });
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, department_id: department_id || null },
  });

  if (createErr) {
    return new Response(JSON.stringify({ error: createErr.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ user: created.user }), {
    headers: { "Content-Type": "application/json" },
  });
});
