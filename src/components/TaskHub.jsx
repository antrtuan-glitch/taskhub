// TaskHub - Màn hình chính kết nối Supabase thật
// Giữ nguyên phong cách thiết kế bản demo: nền tối #14110D, accent vàng #C9A227
import { useState, useEffect, useMemo } from "react";
import { Plus, Clock, AlertTriangle, MessageSquare, CheckCircle2, Circle, Loader, Bell, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Stat, Chip, COLORS } from "./ui";
import NewTaskSheet from "./NewTaskSheet";
import DetailSheet from "./DetailSheet";
import AdminScreen from "./AdminScreen";
import { usePushNotification } from "../hooks/usePushNotification";

const H = 3600000, D = 86400000;

function fmtRemain(deadline, status) {
  const diff = new Date(deadline) - Date.now();
  const overdue = diff < 0 && status !== "done";
  const abs = Math.abs(diff);
  let txt = abs < H ? `${Math.round(abs / 60000)} phút` : abs < D ? `${Math.round(abs / H)} giờ` : `${Math.round(abs / D)} ngày`;
  return { overdue, txt: overdue ? `Trễ ${txt}` : `Còn ${txt}`, soon: !overdue && diff < 3 * H && status !== "done" };
}

const STATUS_ICON = { todo: Circle, doing: Loader, done: CheckCircle2 };
const STATUS_COLOR = { todo: "#9A8F7A", doing: "#C9A227", done: "#6A8D73" };

export default function TaskHub({ profile, onSignOut }) {
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterDept, setFilterDept] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [openTask, setOpenTask] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const { permission, requestAndSubscribe } = usePushNotification(profile?.id);

  // Lấy dữ liệu ban đầu
  useEffect(() => {
    supabase.from("departments").select("*").then(({ data }) => data && setDepartments(data));
    fetchTasks();
  }, []);

  // Realtime: lắng nghe thay đổi tasks
  useEffect(() => {
    const channel = supabase.channel("tasks-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchTasks())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*, departments(id, name, color), profiles(full_name), task_comments(count)")
      .order("created_at", { ascending: false });
    if (data) setTasks(data);
  }

  // Sắp xếp: task của BỘ PHẬN MÌNH lên đầu (nổi bật), rồi theo status, deadline
  const sorted = useMemo(() => {
    const myDept = profile?.department_id;
    const arr = filterDept === "all" ? tasks : tasks.filter((t) => t.current_department_id === filterDept);
    const rank = { doing: 0, todo: 1, done: 2 };
    return [...arr].sort((a, b) => {
      // Task của bộ phận mình luôn lên trước
      const aOwn = a.current_department_id === myDept ? 0 : 1;
      const bOwn = b.current_department_id === myDept ? 0 : 1;
      if (aOwn !== bOwn) return aOwn - bOwn;
      // Trong cùng nhóm: sort theo status rồi deadline
      return rank[a.status] - rank[b.status] || new Date(a.deadline) - new Date(b.deadline);
    });
  }, [tasks, filterDept, profile?.department_id]);

  const stats = useMemo(() => ({
    total: tasks.length,
    doing: tasks.filter((t) => t.status === "doing").length,
    overdue: tasks.filter((t) => new Date(t.deadline) < Date.now() && t.status !== "done" && !t.is_completed).length,
  }), [tasks]);

  async function cycleStatus(taskId, current) {
    const next = current === "todo" ? "doing" : current === "doing" ? "done" : "todo";
    await supabase.from("tasks").update({ status: next }).eq("id", taskId);
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Inter', system-ui, sans-serif", color: COLORS.text, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 440, position: "relative", paddingBottom: 90 }}>

        {/* Header */}
        <div style={{ padding: "24px 20px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 3, color: COLORS.gold, fontWeight: 600 }}>VẬN HÀNH KHÁCH SẠN</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "Georgia, serif", marginTop: 2 }}>TaskHub</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              {/* Nút Quản trị - chỉ hiện cho admin */}
              {profile?.role === "admin" && (
                <button
                  onClick={() => setShowAdmin(true)}
                  title="Quản trị"
                  style={{ background: COLORS.red + "22", border: `1px solid ${COLORS.red}44`, color: COLORS.red, borderRadius: 10, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}
                >
                  <ShieldCheck size={14} />Quản trị
                </button>
              )}
              {/* Nút bật push notification */}
              {permission !== "granted" && (
                <button
                  onClick={requestAndSubscribe}
                  title="Bật thông báo"
                  style={{ background: COLORS.gold + "22", border: `1px solid ${COLORS.gold}44`, color: COLORS.gold, borderRadius: 10, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}
                >
                  <Bell size={14} />Bật TB
                </button>
              )}
              <button onClick={onSignOut} title="Đăng xuất" style={{ background: "none", border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 10, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                <LogOut size={14} />
              </button>
            </div>
          </div>

          {/* Tên và bộ phận của user */}
          <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 6 }}>
            Xin chào <strong style={{ color: COLORS.text }}>{profile?.full_name}</strong>
            {profile?.departments && (
              <span style={{ marginLeft: 6, color: profile.departments.color, fontWeight: 600 }}>
                · {profile.departments.name}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Stat n={stats.total} label="Tổng việc" />
            <Stat n={stats.doing} label="Đang làm" color={COLORS.gold} />
            <Stat n={stats.overdue} label="Trễ hạn" color={COLORS.red} />
          </div>
        </div>

        {/* Filter bộ phận */}
        <div style={{ display: "flex", gap: 8, padding: "14px 20px", overflowX: "auto" }}>
          <Chip active={filterDept === "all"} onClick={() => setFilterDept("all")} label="Tất cả" />
          {departments.map((d) => (
            <Chip key={d.id} active={filterDept === d.id} onClick={() => setFilterDept(d.id)} label={d.name} dot={d.color} color={d.color} />
          ))}
        </div>

        {/* Danh sách task */}
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.length === 0 && (
            <div style={{ textAlign: "center", color: COLORS.faint, padding: 40, fontSize: 14 }}>
              Chưa có việc nào. Bấm + để giao việc mới.
            </div>
          )}
          {sorted.map((t) => {
            const dept = t.departments;
            const isMyDept = t.current_department_id === profile?.department_id;
            const r = fmtRemain(t.deadline, t.status);
            const Icon = STATUS_ICON[t.status] ?? Circle;
            const statusColor = STATUS_COLOR[t.status] ?? COLORS.muted;
            const commentCount = t.task_comments?.[0]?.count ?? 0;

            return (
              <div
                key={t.id}
                onClick={() => setOpenTask(t)}
                style={{
                  // Task của BỘ PHẬN MÌNH: nền đậm hơn, viền sáng rõ rệt
                  background: isMyDept ? dept?.color + "15" : COLORS.surface,
                  border: isMyDept ? `2px solid ${dept?.color}` : `1px solid ${COLORS.border}`,
                  borderRadius: 14,
                  padding: 14,
                  cursor: "pointer",
                  borderLeft: `4px solid ${dept?.color}`,
                  opacity: t.is_completed ? 0.5 : isMyDept ? 1 : 0.75,
                  transition: "opacity 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{
                    fontSize: 15, fontWeight: isMyDept ? 700 : 600, lineHeight: 1.35,
                    opacity: t.status === "done" ? 0.5 : 1,
                    textDecoration: t.status === "done" ? "line-through" : "none",
                  }}>
                    {/* Badge "CỦA BỘ PHẬN BẠN" nổi bật */}
                    {isMyDept && !t.is_completed && (
                      <span style={{ display: "inline-block", fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: dept?.color, background: dept?.color + "22", border: `1px solid ${dept?.color}44`, padding: "2px 6px", borderRadius: 6, marginRight: 8, verticalAlign: "middle" }}>
                        BỘ PHẬN BẠN
                      </span>
                    )}
                    {t.title}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); cycleStatus(t.id, t.status); }}
                    style={{ background: "none", border: "none", color: statusColor, cursor: "pointer", flexShrink: 0, padding: 0 }}
                  >
                    <Icon size={22} />
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: dept?.color, background: dept?.color + "1A", padding: "3px 9px", borderRadius: 20 }}>
                    {dept?.name}
                  </span>
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: r.overdue ? COLORS.red : r.soon ? COLORS.gold : COLORS.faint }}>
                    {r.overdue ? <AlertTriangle size={13} /> : <Clock size={13} />}{r.txt}
                  </span>
                </div>

                {commentCount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 11, color: COLORS.faint }}>
                    <MessageSquare size={12} />{commentCount} cập nhật
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Nút tạo task mới */}
        <button
          onClick={() => setShowNew(true)}
          style={{ position: "fixed", bottom: 24, right: "max(20px, calc(50% - 220px + 20px))", width: 56, height: 56, borderRadius: 28, background: COLORS.gold, border: "none", color: COLORS.bg, cursor: "pointer", boxShadow: "0 6px 20px rgba(201,162,39,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {showNew && <NewTaskSheet onClose={() => setShowNew(false)} profile={profile} />}
        {openTask && <DetailSheet task={openTask} profile={profile} onClose={() => setOpenTask(null)} />}
        {showAdmin && <AdminScreen onClose={() => setShowAdmin(false)} />}
      </div>
    </div>
  );
}
