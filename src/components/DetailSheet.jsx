// Sheet chi tiết task: trạng thái, comments realtime, lịch sử bàn giao, nút chuyển bộ phận
import { useState, useEffect, useRef } from "react";
import { Clock, AlertTriangle, MessageSquare, GitBranch, CheckCircle2, Circle, Loader } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Sheet, Meta, COLORS } from "./ui";
import HandoffSheet from "./HandoffSheet";

const STATUS_META = {
  todo: { label: "Chưa làm", color: "#9A8F7A", icon: Circle },
  doing: { label: "Đang làm", color: "#C9A227", icon: Loader },
  done: { label: "Hoàn thành", color: "#6A8D73", icon: CheckCircle2 },
};

const H = 3600000, D = 86400000;
function fmtRemain(deadline, status) {
  const diff = new Date(deadline) - Date.now();
  const overdue = diff < 0 && status !== "done";
  const abs = Math.abs(diff);
  let txt = abs < H ? `${Math.round(abs / 60000)} phút` : abs < D ? `${Math.round(abs / H)} giờ` : `${Math.round(abs / D)} ngày`;
  return { overdue, txt: overdue ? `Trễ ${txt}` : `Còn ${txt}`, soon: !overdue && diff < 3 * H && status !== "done" };
}

function fmtTime(iso) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} ${d.getDate()}/${d.getMonth() + 1}`;
}

export default function DetailSheet({ task: initialTask, profile, onClose }) {
  const [task, setTask] = useState(initialTask);
  const [comments, setComments] = useState([]);
  const [handoffs, setHandoffs] = useState([]);
  const [images, setImages] = useState([]);
  const [msg, setMsg] = useState("");
  const [showHandoff, setShowHandoff] = useState(false);
  const [tab, setTab] = useState("comments"); // "comments" | "timeline"
  const bottomRef = useRef(null);

  // Lấy dữ liệu chi tiết đầy đủ kèm department name
  useEffect(() => {
    supabase
      .from("tasks")
      .select("*, departments(id, name, color), profiles(full_name)")
      .eq("id", initialTask.id)
      .single()
      .then(({ data }) => data && setTask(data));

    supabase
      .from("task_comments")
      .select("*, profiles(full_name)")
      .eq("task_id", initialTask.id)
      .order("created_at")
      .then(({ data }) => data && setComments(data));

    supabase
      .from("task_handoffs")
      .select("*, from_dept:departments!task_handoffs_from_department_id_fkey(name,color), to_dept:departments!task_handoffs_to_department_id_fkey(name,color), profiles(full_name)")
      .eq("task_id", initialTask.id)
      .order("created_at")
      .then(({ data }) => data && setHandoffs(data));

    supabase
      .from("task_images")
      .select("*")
      .eq("task_id", initialTask.id)
      .order("created_at")
      .then(({ data }) => data && setImages(data));
  }, [initialTask.id]);

  // Realtime: comments mới + cập nhật task
  useEffect(() => {
    const channel = supabase.channel(`detail-${initialTask.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_comments", filter: `task_id=eq.${initialTask.id}` },
        async (payload) => {
          const { data } = await supabase.from("task_comments").select("*, profiles(full_name)").eq("id", payload.new.id).single();
          if (data) setComments((c) => [...c, data]);
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks", filter: `id=eq.${initialTask.id}` },
        async () => {
          const { data } = await supabase.from("tasks").select("*, departments(id, name, color), profiles(full_name)").eq("id", initialTask.id).single();
          if (data) setTask(data);
        }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_handoffs", filter: `task_id=eq.${initialTask.id}` },
        async (payload) => {
          const { data } = await supabase.from("task_handoffs")
            .select("*, from_dept:departments!task_handoffs_from_department_id_fkey(name,color), to_dept:departments!task_handoffs_to_department_id_fkey(name,color), profiles(full_name)")
            .eq("id", payload.new.id).single();
          if (data) setHandoffs((h) => [...h, data]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [initialTask.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function cycleStatus() {
    const next = task.status === "todo" ? "doing" : task.status === "doing" ? "done" : "todo";
    await supabase.from("tasks").update({ status: next }).eq("id", task.id);
  }

  async function sendComment() {
    if (!msg.trim()) return;
    const text = msg.trim();
    setMsg("");
    await supabase.from("task_comments").insert({ task_id: task.id, author_id: profile.id, text });
  }

  if (!task) return null;

  const dept = task.departments;
  const st = STATUS_META[task.status] ?? STATUS_META.todo;
  const r = fmtRemain(task.deadline, task.status);
  const Icon = st.icon;

  // Kiểm tra người dùng có thuộc bộ phận đang giữ task không → được chuyển bộ phận
  const canHandoff = profile?.department_id === task.current_department_id && !task.is_completed;

  return (
    <>
      <Sheet onClose={onClose} title="Chi tiết công việc">
        <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.4, marginBottom: 16 }}>
          {task.title}
          {task.is_completed && (
            <span style={{ marginLeft: 10, fontSize: 12, background: "#6A8D7322", color: "#6A8D73", border: "1px solid #6A8D7344", padding: "3px 8px", borderRadius: 20, verticalAlign: "middle" }}>
              Hoàn thành
            </span>
          )}
        </div>

        {images.length > 0 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16 }}>
            {images.map((img) => (
              <img
                key={img.id}
                src={img.url}
                alt=""
                onClick={() => window.open(img.url, "_blank")}
                style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 12, border: `1px solid ${COLORS.border}`, cursor: "pointer", flexShrink: 0 }}
              />
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <Meta label="Bộ phận hiện tại" value={dept?.name} color={dept?.color} />
          <Meta label="Người tạo" value={task.profiles?.full_name} />
          <Meta label="Trạng thái" value={st.label} color={st.color} />
        </div>

        {/* Deadline + nút đổi status */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: r.overdue ? COLORS.red : r.soon ? COLORS.gold : COLORS.muted }}>
            {r.overdue ? <AlertTriangle size={15} /> : <Clock size={15} />}{r.txt}
          </span>
          {!task.is_completed && (
            <button
              onClick={cycleStatus}
              style={{ display: "flex", alignItems: "center", gap: 7, background: st.color + "22", border: `1px solid ${st.color}`, color: st.color, padding: "8px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              <Icon size={16} />{st.label}
            </button>
          )}
        </div>
        <div style={{ fontSize: 11, color: COLORS.faint, marginBottom: 20 }}>Chạm vào trạng thái để chuyển: Chưa làm → Đang làm → Hoàn thành</div>

        {/* Nút chuyển bộ phận - chỉ hiện nếu người dùng thuộc bộ phận đang giữ task */}
        {canHandoff && (
          <button
            onClick={() => setShowHandoff(true)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: dept?.color + "22", border: `1px solid ${dept?.color}`, color: dept?.color, padding: "12px 0", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 20 }}
          >
            <GitBranch size={16} />Chuyển sang bộ phận khác
          </button>
        )}

        {/* Tab: comments / timeline */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[["comments", "Trao đổi", MessageSquare], ["timeline", "Lịch sử bàn giao", GitBranch]].map(([key, label, IconComp]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${tab === key ? COLORS.gold : COLORS.border}`, background: tab === key ? COLORS.gold + "22" : "transparent", color: tab === key ? COLORS.text : COLORS.muted }}
            >
              <IconComp size={14} />{label}
            </button>
          ))}
        </div>

        {/* Tab: trao đổi */}
        {tab === "comments" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, maxHeight: 300, overflowY: "auto" }}>
              {comments.length === 0 && <div style={{ fontSize: 13, color: COLORS.faint }}>Chưa có cập nhật nào.</div>}
              {comments.map((c) => (
                <div key={c.id} style={{ background: COLORS.bg, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.gold }}>{c.profiles?.full_name ?? "Ẩn danh"}</span>
                    <span style={{ fontSize: 11, color: COLORS.faint }}>{fmtTime(c.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.4 }}>{c.text}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendComment()}
                placeholder="Thêm cập nhật..."
                style={{ flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 14px", color: COLORS.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}
              />
              <button onClick={sendComment} style={{ background: COLORS.gold, border: "none", color: COLORS.bg, borderRadius: 10, padding: "0 16px", fontWeight: 700, cursor: "pointer" }}>
                Gửi
              </button>
            </div>
          </>
        )}

        {/* Tab: timeline bàn giao */}
        {tab === "timeline" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {handoffs.length === 0 && <div style={{ fontSize: 13, color: COLORS.faint }}>Chưa có lần bàn giao nào.</div>}
            {handoffs.map((h, i) => (
              <div key={h.id} style={{ display: "flex", gap: 12, paddingBottom: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: h.to_dept?.color ?? COLORS.gold, flexShrink: 0, marginTop: 3 }} />
                  {i < handoffs.length - 1 && <div style={{ width: 2, flex: 1, background: COLORS.border, marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    <span style={{ color: h.from_dept?.color ?? COLORS.muted }}>{h.from_dept?.name ?? "Khởi tạo"}</span>
                    {" → "}
                    <span style={{ color: h.to_dept?.color ?? "#6A8D73" }}>{h.to_dept?.name ?? "✓ Hoàn thành"}</span>
                  </div>
                  {h.note && <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4, lineHeight: 1.4 }}>"{h.note}"</div>}
                  <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 4 }}>
                    {h.profiles?.full_name} · {fmtTime(h.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Sheet>

      {showHandoff && (
        <HandoffSheet task={task} profile={profile} onClose={() => { setShowHandoff(false); onClose(); }} />
      )}
    </>
  );
}
