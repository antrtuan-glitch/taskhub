// Edge Function: push-notify
// Được gọi bởi Database Webhook khi task_handoffs có INSERT mới
// Gửi Web Push notification tới tất cả thành viên của bộ phận nhận task

import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-ignore: Deno npm specifier
import webpush from "npm:web-push@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") ?? "mailto:admin@taskhub.app";

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  // Database Webhook gửi POST với body là record mới
  const body = await req.json();
  const handoff = body.record;

  if (!handoff?.to_department_id || !handoff?.task_id) {
    return new Response("ok", { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Lấy thông tin task
  const { data: task } = await supabase
    .from("tasks")
    .select("title")
    .eq("id", handoff.task_id)
    .single();

  // Lấy tên bộ phận nhận
  const { data: dept } = await supabase
    .from("departments")
    .select("name")
    .eq("id", handoff.to_department_id)
    .single();

  // Lấy push_subscription của tất cả thành viên bộ phận nhận
  const { data: profiles } = await supabase
    .from("profiles")
    .select("push_subscription")
    .eq("department_id", handoff.to_department_id)
    .not("push_subscription", "is", null);

  if (!profiles?.length) {
    return new Response("no subscribers", { status: 200 });
  }

  const payload = JSON.stringify({
    title: `📋 Task mới cho ${dept?.name}`,
    body: task?.title ?? "Có task vừa được chuyển tới bộ phận bạn",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    data: { taskId: handoff.task_id },
  });

  // Gửi push tới tất cả thành viên
  const results = await Promise.allSettled(
    profiles.map((p) =>
      webpush.sendNotification(p.push_subscription, payload)
    )
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  return new Response(
    JSON.stringify({ sent: results.length - failed, failed }),
    { headers: { "Content-Type": "application/json" } }
  );
});
