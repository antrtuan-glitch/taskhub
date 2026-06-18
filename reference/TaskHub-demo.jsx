import { useState, useMemo } from "react";
import { Plus, Clock, AlertTriangle, MessageSquare, X, ChevronLeft, Filter, CheckCircle2, Circle, Loader } from "lucide-react";

const DEPTS = [
  { id: "letan", name: "Lễ tân", color: "#C9A227" },
  { id: "buongphong", name: "Buồng phòng", color: "#3A7CA5" },
  { id: "bep", name: "Bếp", color: "#B5563E" },
  { id: "baotri", name: "Bảo trì", color: "#5E5240" },
  { id: "fnb", name: "F&B", color: "#6A8D73" },
];

const STAFF = [
  { id: "u1", name: "Minh", dept: "letan" },
  { id: "u2", name: "Lan", dept: "buongphong" },
  { id: "u3", name: "Huy", dept: "bep" },
  { id: "u4", name: "Sơn", dept: "baotri" },
  { id: "u5", name: "Trang", dept: "fnb" },
  { id: "u6", name: "Quân", dept: "letan" },
];

const STATUS = {
  todo: { label: "Chưa làm", color: "#9A8F7A", icon: Circle },
  doing: { label: "Đang làm", color: "#C9A227", icon: Loader },
  done: { label: "Hoàn thành", color: "#6A8D73", icon: CheckCircle2 },
};

const now = Date.now();
const H = 3600000, D = 86400000;

const SEED = [
  { id: "t1", title: "Kiểm tra điều hòa phòng 305 báo hỏng", dept: "baotri", assignee: "u4", status: "doing", deadline: now + 2 * H, createdBy: "Lễ tân", comments: [{ id: "c1", by: "Minh", text: "Khách phàn nàn từ tối qua, ưu tiên gấp", at: now - 5 * H }] },
  { id: "t2", title: "Set up phòng VIP đón đoàn 14h", dept: "buongphong", assignee: "u2", status: "todo", deadline: now + 5 * H, createdBy: "Quản lý", comments: [] },
  { id: "t3", title: "Chuẩn bị menu tiệc cưới cuối tuần", dept: "bep", assignee: "u3", status: "doing", deadline: now + 2 * D, createdBy: "F&B", comments: [{ id: "c2", by: "Trang", text: "Khách đổi từ 80 lên 100 suất", at: now - 2 * H }] },
  { id: "t4", title: "Thay khăn tắm tầng 4", dept: "buongphong", assignee: "u2", status: "done", deadline: now - 3 * H, createdBy: "Lễ tân", comments: [] },
  { id: "t5", title: "Trả lời review Google 2 sao", dept: "letan", assignee: "u1", status: "todo", deadline: now - 1 * H, createdBy: "Quản lý", comments: [] },
];

function fmtRemain(deadline, status) {
  const diff = deadline - Date.now();
  const overdue = diff < 0 && status !== "done";
  const abs = Math.abs(diff);
  let txt;
  if (abs < H) txt = `${Math.round(abs / 60000)} phút`;
  else if (abs < D) txt = `${Math.round(abs / H)} giờ`;
  else txt = `${Math.round(abs / D)} ngày`;
  return { overdue, txt: overdue ? `Trễ ${txt}` : `Còn ${txt}`, soon: !overdue && diff < 3 * H && status !== "done" };
}

const deptOf = (id) => DEPTS.find((d) => d.id === id);
const staffOf = (id) => STAFF.find((s) => s.id === id);

export default function TaskHub() {
  const [tasks, setTasks] = useState(SEED);
  const [filterDept, setFilterDept] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [me] = useState("Bạn");

  const filtered = useMemo(() => {
    const arr = filterDept === "all" ? tasks : tasks.filter((t) => t.dept === filterDept);
    const rank = { doing: 0, todo: 1, done: 2 };
    return [...arr].sort((a, b) => rank[a.status] - rank[b.status] || a.deadline - b.deadline);
  }, [tasks, filterDept]);

  const stats = useMemo(() => {
    const overdue = tasks.filter((t) => t.deadline < Date.now() && t.status !== "done").length;
    return { total: tasks.length, doing: tasks.filter((t) => t.status === "doing").length, overdue };
  }, [tasks]);

  const open = tasks.find((t) => t.id === openId);

  const cycle = (id) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: t.status === "todo" ? "doing" : t.status === "doing" ? "done" : "todo" } : t)));

  const addTask = (t) => { setTasks((ts) => [{ ...t, id: "t" + Date.now(), comments: [], createdBy: me }, ...ts]); setShowNew(false); };
  const addComment = (taskId, text) =>
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, comments: [...t.comments, { id: "c" + Date.now(), by: me, text, at: Date.now() }] } : t)));

  return (
    <div style={{ minHeight: "100vh", background: "#14110D", fontFamily: "'Inter', system-ui, sans-serif", color: "#E8E2D4", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 440, position: "relative", paddingBottom: 90 }}>
        {/* Header */}
        <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #2A2419" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#C9A227", fontWeight: 600 }}>VẬN HÀNH KHÁCH SẠN</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "Georgia, serif", marginTop: 2 }}>TaskHub</div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Stat n={stats.total} label="Tổng việc" />
            <Stat n={stats.doing} label="Đang làm" color="#C9A227" />
            <Stat n={stats.overdue} label="Trễ hạn" color="#B5563E" />
          </div>
        </div>

        {/* Dept filter */}
        <div style={{ display: "flex", gap: 8, padding: "14px 20px", overflowX: "auto" }}>
          <Chip active={filterDept === "all"} onClick={() => setFilterDept("all")} label="Tất cả" />
          {DEPTS.map((d) => <Chip key={d.id} active={filterDept === d.id} onClick={() => setFilterDept(d.id)} label={d.name} dot={d.color} />)}
        </div>

        {/* Task list */}
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.length === 0 && <div style={{ textAlign: "center", color: "#6B6354", padding: 40, fontSize: 14 }}>Chưa có việc nào ở bộ phận này. Bấm + để giao việc.</div>}
          {filtered.map((t) => {
            const d = deptOf(t.dept), s = staffOf(t.assignee), st = STATUS[t.status], r = fmtRemain(t.deadline, t.status);
            const Icon = st.icon;
            return (
              <div key={t.id} onClick={() => setOpenId(t.id)} style={{ background: "#1C1812", border: "1px solid #2A2419", borderRadius: 14, padding: 14, cursor: "pointer", borderLeft: `3px solid ${d.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, opacity: t.status === "done" ? 0.5 : 1, textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.title}</div>
                  <button onClick={(e) => { e.stopPropagation(); cycle(t.id); }} style={{ background: "none", border: "none", color: st.color, cursor: "pointer", flexShrink: 0, padding: 0 }}>
                    <Icon size={22} />
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: d.color, background: d.color + "1A", padding: "3px 9px", borderRadius: 20 }}>{d.name}</span>
                  <span style={{ fontSize: 12, color: "#9A8F7A" }}>{s?.name}</span>
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: r.overdue ? "#B5563E" : r.soon ? "#C9A227" : "#6B6354" }}>
                    {r.overdue ? <AlertTriangle size={13} /> : <Clock size={13} />}{r.txt}
                  </span>
                </div>
                {t.comments.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 11, color: "#6B6354" }}><MessageSquare size={12} />{t.comments.length} cập nhật</div>}
              </div>
            );
          })}
        </div>

        {/* FAB */}
        <button onClick={() => setShowNew(true)} style={{ position: "fixed", bottom: 24, right: "max(20px, calc(50% - 220px + 20px))", width: 56, height: 56, borderRadius: 28, background: "#C9A227", border: "none", color: "#14110D", cursor: "pointer", boxShadow: "0 6px 20px rgba(201,162,39,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {showNew && <NewTaskSheet onClose={() => setShowNew(false)} onAdd={addTask} />}
        {open && <DetailSheet task={open} onClose={() => setOpenId(null)} onCycle={cycle} onComment={addComment} />}
      </div>
    </div>
  );
}

function Stat({ n, label, color = "#E8E2D4" }) {
  return (
    <div style={{ flex: 1, background: "#1C1812", border: "1px solid #2A2419", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{n}</div>
      <div style={{ fontSize: 11, color: "#9A8F7A", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Chip({ active, onClick, label, dot }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, whiteSpace: "nowrap", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid " + (active ? "#C9A227" : "#2A2419"), background: active ? "#C9A22722" : "transparent", color: active ? "#E8E2D4" : "#9A8F7A" }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: 4, background: dot }} />}{label}
    </button>
  );
}

function Sheet({ children, onClose, title }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "#1C1812", borderRadius: "20px 20px 0 0", maxHeight: "90vh", overflowY: "auto", borderTop: "1px solid #2A2419" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid #2A2419", position: "sticky", top: 0, background: "#1C1812" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9A8F7A", cursor: "pointer", padding: 0 }}><ChevronLeft size={22} /></button>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#9A8F7A", cursor: "pointer", padding: 0 }}><X size={20} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function NewTaskSheet({ onClose, onAdd }) {
  const [title, setTitle] = useState("");
  const [dept, setDept] = useState(DEPTS[0].id);
  const [assignee, setAssignee] = useState("");
  const [hours, setHours] = useState(4);
  const deptStaff = STAFF.filter((s) => s.dept === dept);
  const inputStyle = { width: "100%", background: "#14110D", border: "1px solid #2A2419", borderRadius: 10, padding: "12px 14px", color: "#E8E2D4", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" };
  const lbl = { fontSize: 12, fontWeight: 600, color: "#9A8F7A", marginBottom: 8, display: "block" };

  return (
    <Sheet onClose={onClose} title="Giao việc mới">
      <label style={lbl}>Nội dung công việc</label>
      <textarea value={title} onChange={(e) => setTitle(e.target.value)} rows={2} placeholder="VD: Kiểm tra vòi nước phòng 210" style={{ ...inputStyle, resize: "none", marginBottom: 18 }} />

      <label style={lbl}>Bộ phận</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {DEPTS.map((d) => <Chip key={d.id} active={dept === d.id} onClick={() => { setDept(d.id); setAssignee(""); }} label={d.name} dot={d.color} />)}
      </div>

      <label style={lbl}>Giao cho</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {deptStaff.map((s) => <Chip key={s.id} active={assignee === s.id} onClick={() => setAssignee(s.id)} label={s.name} />)}
      </div>

      <label style={lbl}>Hạn chót: trong {hours} giờ</label>
      <input type="range" min={1} max={72} value={hours} onChange={(e) => setHours(+e.target.value)} style={{ width: "100%", accentColor: "#C9A227", marginBottom: 24 }} />

      <button disabled={!title || !assignee} onClick={() => onAdd({ title, dept, assignee, status: "todo", deadline: Date.now() + hours * H })}
        style={{ width: "100%", padding: 14, borderRadius: 12, background: !title || !assignee ? "#2A2419" : "#C9A227", color: !title || !assignee ? "#6B6354" : "#14110D", border: "none", fontSize: 15, fontWeight: 700, cursor: !title || !assignee ? "default" : "pointer" }}>
        Giao việc
      </button>
    </Sheet>
  );
}

function DetailSheet({ task, onClose, onCycle, onComment }) {
  const [msg, setMsg] = useState("");
  const d = deptOf(task.dept), s = staffOf(task.assignee), st = STATUS[task.status], r = fmtRemain(task.deadline, task.status);
  const Icon = st.icon;
  return (
    <Sheet onClose={onClose} title="Chi tiết công việc">
      <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.4, marginBottom: 16 }}>{task.title}</div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <Meta label="Bộ phận" value={d.name} color={d.color} />
        <Meta label="Phụ trách" value={s?.name} />
        <Meta label="Người giao" value={task.createdBy} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#14110D", border: "1px solid #2A2419", borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: r.overdue ? "#B5563E" : "#9A8F7A" }}>
          {r.overdue ? <AlertTriangle size={15} /> : <Clock size={15} />}{r.txt}
        </span>
        <button onClick={() => onCycle(task.id)} style={{ display: "flex", alignItems: "center", gap: 7, background: st.color + "22", border: "1px solid " + st.color, color: st.color, padding: "8px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          <Icon size={16} />{st.label}
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#6B6354", marginBottom: 22 }}>Chạm vào trạng thái để chuyển: Chưa làm → Đang làm → Hoàn thành</div>

      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}><MessageSquare size={15} color="#C9A227" />Cập nhật & trao đổi</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {task.comments.length === 0 && <div style={{ fontSize: 13, color: "#6B6354" }}>Chưa có cập nhật nào.</div>}
        {task.comments.map((c) => (
          <div key={c.id} style={{ background: "#14110D", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#C9A227" }}>{c.by}</span>
              <span style={{ fontSize: 11, color: "#6B6354" }}>{fmtRemain(c.at, "").txt.replace("Trễ", "").trim() + " trước"}</span>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.4 }}>{c.text}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && msg.trim()) { onComment(task.id, msg.trim()); setMsg(""); } }}
          placeholder="Thêm cập nhật..." style={{ flex: 1, background: "#14110D", border: "1px solid #2A2419", borderRadius: 10, padding: "12px 14px", color: "#E8E2D4", fontSize: 14, fontFamily: "inherit" }} />
        <button onClick={() => { if (msg.trim()) { onComment(task.id, msg.trim()); setMsg(""); } }} style={{ background: "#C9A227", border: "none", color: "#14110D", borderRadius: 10, padding: "0 16px", fontWeight: 700, cursor: "pointer" }}>Gửi</button>
      </div>
    </Sheet>
  );
}

function Meta({ label, value, color = "#E8E2D4" }) {
  return (
    <div style={{ background: "#14110D", border: "1px solid #2A2419", borderRadius: 10, padding: "8px 12px", flex: "1 1 auto", minWidth: 90 }}>
      <div style={{ fontSize: 10, color: "#6B6354", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}
