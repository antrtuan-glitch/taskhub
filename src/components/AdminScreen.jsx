// Màn hình Quản trị (chỉ admin) - 3 tab: Nhân viên / Task / Báo cáo
import { useState, useEffect } from "react";
import { ChevronLeft, Trash2, GitBranch, Users, ListChecks, BarChart3, UserPlus, FolderPlus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { COLORS, Sheet, Meta, inputStyle, labelStyle, PrimaryButton, Chip } from "./ui";

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export default function AdminScreen({ onClose }) {
  const [tab, setTab] = useState("staff"); // staff | tasks | reports

  return (
    <Sheet onClose={onClose} title="Quản trị">
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[
          ["staff", "Nhân viên", Users],
          ["tasks", "Task", ListChecks],
          ["reports", "Báo cáo", BarChart3],
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 8px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${tab === key ? COLORS.gold : COLORS.border}`,
              background: tab === key ? COLORS.gold + "22" : "transparent",
              color: tab === key ? COLORS.text : COLORS.muted,
            }}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {tab === "staff" && <StaffTab />}
      {tab === "tasks" && <TasksTab />}
      {tab === "reports" && <ReportsTab />}
    </Sheet>
  );
}

function ConfirmDialog({ title, onConfirm, onCancel }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "85%", maxWidth: 340, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>{title}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.muted, fontWeight: 600, cursor: "pointer" }}>Hủy</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: COLORS.red, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Xóa</button>
        </div>
      </div>
    </div>
  );
}

function CreateStaffForm({ departments, onCreated }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deptId, setDeptId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setError("");
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const { data, error: fnErr } = await supabase.functions.invoke("admin-create-user", {
        body: { email, password, full_name: fullName.trim(), department_id: deptId || null },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (fnErr) {
        const body = await fnErr.context?.json?.().catch(() => null);
        throw new Error(body?.error || fnErr.message);
      }
      if (data?.error) throw new Error(data.error);
      setFullName(""); setEmail(""); setPassword(""); setDeptId("");
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = fullName.trim() && email && password.length >= 6;

  return (
    <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14, marginBottom: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <UserPlus size={15} />Tạo tài khoản nhân viên
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Họ tên" style={inputStyle} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" style={inputStyle} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" style={inputStyle} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {departments.map((d) => (
            <Chip key={d.id} active={deptId === d.id} onClick={() => setDeptId(deptId === d.id ? "" : d.id)} label={d.name} dot={d.color} color={d.color} />
          ))}
        </div>
        {error && (
          <div style={{ background: "#B5563E22", border: "1px solid #B5563E44", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#E08070" }}>{error}</div>
        )}
        <PrimaryButton onClick={handleCreate} disabled={!canSubmit || loading}>
          {loading ? "Đang tạo..." : "Tạo tài khoản"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 30);
}

const DEPT_COLORS = ["#C9A227", "#3A7CA5", "#B5563E", "#5E5240", "#6A8D73", "#8E5BA6", "#4A7A6B"];

function DepartmentManager({ departments, onChanged }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setError("");
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = slugify(trimmed);
    if (!id) { setError("Tên bộ phận không hợp lệ"); return; }
    setLoading(true);
    const color = DEPT_COLORS[departments.length % DEPT_COLORS.length];
    const { error: err } = await supabase.from("departments").insert({ id, name: trimmed, color });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setName("");
    onChanged();
  }

  async function deleteDept(id) {
    await supabase.from("departments").delete().eq("id", id);
    onChanged();
  }

  return (
    <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14, marginBottom: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <FolderPlus size={15} />Quản lý bộ phận
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {departments.map((d) => (
          <span key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: d.color, background: d.color + "1A", padding: "5px 10px", borderRadius: 20 }}>
            {d.name}
            <Trash2 size={12} style={{ cursor: "pointer" }} onClick={() => deleteDept(d.id)} />
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Tên bộ phận mới"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={handleCreate} disabled={loading} style={{ background: COLORS.gold, border: "none", color: COLORS.bg, borderRadius: 10, padding: "0 16px", fontWeight: 700, cursor: "pointer" }}>
          Thêm
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: "#E08070", marginTop: 8 }}>{error}</div>}
      <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 8 }}>Lưu ý: xóa bộ phận sẽ ảnh hưởng đến task/nhân viên đang gắn với bộ phận đó.</div>
    </div>
  );
}

function StaffTab() {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    load();
    loadDepartments();
  }, []);

  async function loadDepartments() {
    const { data } = await supabase.from("departments").select("*").order("name");
    if (data) setDepartments(data);
  }

  async function load() {
    const { data } = await supabase
      .from("profiles")
      .select("*, departments(id, name, color)")
      .order("created_at", { ascending: false });
    if (data) setStaff(data);
  }

  async function deleteStaff(id) {
    await supabase.from("profiles").delete().eq("id", id);
    setConfirmDelete(null);
    load();
  }

  async function changeDept(id, deptId) {
    await supabase.from("profiles").update({ department_id: deptId }).eq("id", id);
    load();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <DepartmentManager departments={departments} onChanged={loadDepartments} />
      <CreateStaffForm departments={departments} onCreated={load} />
      {staff.map((s) => (
        <div key={s.id} style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {s.full_name}
                {s.role === "admin" && (
                  <span style={{ marginLeft: 8, fontSize: 10, color: COLORS.gold, background: COLORS.gold + "22", border: `1px solid ${COLORS.gold}44`, padding: "2px 6px", borderRadius: 6 }}>ADMIN</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 3 }}>Tạo ngày {fmtDate(s.created_at)}</div>
            </div>
            {s.role !== "admin" && (
              <button onClick={() => setConfirmDelete(s)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", padding: 4 }}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <select
            value={s.department_id ?? ""}
            onChange={(e) => changeDept(s.id, e.target.value)}
            style={{ marginTop: 10, width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 10px", color: COLORS.text, fontSize: 13 }}
          >
            <option value="">— Chưa có bộ phận —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      ))}

      {confirmDelete && (
        <ConfirmDialog
          title={`Bạn có chắc muốn xóa tài khoản "${confirmDelete.full_name}"?`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteStaff(confirmDelete.id)}
        />
      )}
    </div>
  );
}

function TasksTab() {
  const [tasks, setTasks] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [historyTask, setHistoryTask] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from("tasks")
      .select("*, departments(id, name, color)")
      .order("created_at", { ascending: false });
    if (data) setTasks(data);
  }

  async function deleteTask(id) {
    await supabase.from("tasks").delete().eq("id", id);
    setConfirmDelete(null);
    load();
  }

  async function showHistory(task) {
    setHistoryTask(task);
    const { data } = await supabase
      .from("task_handoffs")
      .select("*, from_dept:departments!task_handoffs_from_department_id_fkey(name,color), to_dept:departments!task_handoffs_to_department_id_fkey(name,color), profiles(full_name)")
      .eq("task_id", task.id)
      .order("created_at");
    setHistory(data ?? []);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tasks.map((t) => (
        <div key={t.id} style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{t.title}</div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => showHistory(t)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", padding: 4 }}>
                <GitBranch size={16} />
              </button>
              <button onClick={() => setConfirmDelete(t)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", padding: 4 }}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: t.departments?.color, background: t.departments?.color + "1A", padding: "3px 9px", borderRadius: 20 }}>
              {t.departments?.name}
            </span>
            <span style={{ fontSize: 11, color: COLORS.faint }}>{t.status}</span>
          </div>
        </div>
      ))}

      {confirmDelete && (
        <ConfirmDialog
          title={`Bạn có chắc muốn xóa task "${confirmDelete.title}"?`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteTask(confirmDelete.id)}
        />
      )}

      {historyTask && (
        <div onClick={() => setHistoryTask(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "90%", maxWidth: 380, maxHeight: "70vh", overflowY: "auto", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Lịch sử bàn giao: {historyTask.title}</div>
            {history.length === 0 && <div style={{ fontSize: 13, color: COLORS.faint }}>Chưa có lần bàn giao nào.</div>}
            {history.map((h) => (
              <div key={h.id} style={{ fontSize: 13, padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={{ color: h.from_dept?.color ?? COLORS.muted }}>{h.from_dept?.name ?? "Khởi tạo"}</span>
                {" → "}
                <span style={{ color: h.to_dept?.color ?? "#6A8D73" }}>{h.to_dept?.name ?? "✓ Hoàn thành"}</span>
                <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 3 }}>{h.profiles?.full_name} · {fmtDate(h.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsTab() {
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    supabase.from("tasks").select("*, departments(id, name, color)").then(({ data }) => data && setTasks(data));
    supabase.from("departments").select("*").then(({ data }) => data && setDepartments(data));
  }, []);

  function inLastDays(iso, days) {
    return new Date(iso) >= new Date(Date.now() - days * 86400000);
  }

  function statusCounts(days) {
    const filtered = tasks.filter((t) => inLastDays(t.created_at, days));
    return {
      todo: filtered.filter((t) => t.status === "todo").length,
      doing: filtered.filter((t) => t.status === "doing").length,
      done: filtered.filter((t) => t.status === "done").length,
    };
  }

  const c7 = statusCounts(7);
  const c30 = statusCounts(30);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 8 }}>TRẠNG THÁI TASK — 7 NGÀY</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Meta label="Chưa làm" value={c7.todo} />
          <Meta label="Đang làm" value={c7.doing} color={COLORS.gold} />
          <Meta label="Hoàn thành" value={c7.done} color="#6A8D73" />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 8 }}>TRẠNG THÁI TASK — 30 NGÀY</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Meta label="Chưa làm" value={c30.todo} />
          <Meta label="Đang làm" value={c30.doing} color={COLORS.gold} />
          <Meta label="Hoàn thành" value={c30.done} color="#6A8D73" />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 8 }}>SỐ TASK THEO BỘ PHẬN</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {departments.map((d) => {
            const deptTasks = tasks.filter((t) => t.current_department_id === d.id);
            const overdue = deptTasks.filter((t) => new Date(t.deadline) < Date.now() && t.status !== "done").length;
            return (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: d.color }}>{d.name}</span>
                <span style={{ fontSize: 13, color: COLORS.text }}>
                  {deptTasks.length} task
                  {overdue > 0 && <span style={{ color: COLORS.red, marginLeft: 8 }}>· {overdue} trễ hạn</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
