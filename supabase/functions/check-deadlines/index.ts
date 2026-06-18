// Edge Function: check-deadlines
// Chạy theo Cron (mỗi 30 phút) - kiểm tra task sắp/đã trễ hạn
// Gửi push notification tới bộ phận đang giữ task

import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-ignore: Deno npm specifier
import webpush from "npm:web-push@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") ?? "mailto:admin@taskhub.app";

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 tiếng tới

  // Task sắp trễ (deadline trong 3h) hoặc đã trễ, chưa hoàn thành
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, deadline, current_department_id, status")
    .eq("is_completed", false)
    .neq("status", "done")
    .lte("deadline", soon.toISOString());

  if (!tasks?.length) {
    return new Response(JSON.stringify({ checked: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  for (const task of tasks) {
    const isOverdue = new Date(task.deadline) < now;
    const label = isOverdue ? "⚠️ Task đã trễ hạn!" : "⏰ Task sắp đến hạn";

    // Lấy subscribers của bộ phận đang giữ task
    const { data: profiles } = await supabase
      .from("profiles")
      .select("push_subscription")
      .eq("department_id", task.current_department_id)
      .not("push_subscription", "is", null);

    if (!profiles?.length) continue;

    const payload = JSON.stringify({
      title: label,
      body: task.title,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: `deadline-${task.id}`, // Gộp thông báo cùng task
      data: { taskId: task.id },
    });

    await Promise.allSettled(
      profiles.map((p) => webpush.sendNotification(p.push_subscription, payload))
    );
    sent++;
  }

  return new Response(JSON.stringify({ checked: tasks.length, notified: sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
