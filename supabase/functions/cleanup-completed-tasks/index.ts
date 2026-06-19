// Edge Function: cleanup-completed-tasks
// Chạy theo Cron (đề xuất: 1 lần/ngày) - tự xóa task đã hoàn thành quá 7 ngày
// Xóa ảnh trong Storage trước, rồi xóa task (cascade xóa luôn comments/handoffs/images)

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const RETENTION_DAYS = 7;

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("is_completed", true)
    .lte("completed_at", cutoff);

  if (!tasks?.length) {
    return new Response(JSON.stringify({ deleted: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const taskIds = tasks.map((t) => t.id);

  const { data: images } = await supabase
    .from("task_images")
    .select("path")
    .in("task_id", taskIds);

  if (images?.length) {
    await supabase.storage.from("task-images").remove(images.map((i) => i.path));
  }

  const { error } = await supabase.from("tasks").delete().in("id", taskIds);

  return new Response(JSON.stringify({ deleted: error ? 0 : taskIds.length, error: error?.message }), {
    headers: { "Content-Type": "application/json" },
  });
});
