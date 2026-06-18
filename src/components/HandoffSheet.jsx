// Sheet chuyển task sang bộ phận tiếp theo
// Ghi vào task_handoffs, cập nhật current_department_id, reset status về todo
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Sheet, Chip, COLORS, inputStyle, labelStyle, PrimaryButton } from "./ui";

export default function HandoffSheet({ task, profile, onClose }) {
  const [departments, setDepartments] = useState([]);
  const [toDeptId, setToDeptId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    supabase.from("departments").select("*").then(({ data }) => {
      // Loại trừ bộ phận đang giữ task
      if (data) setDepartments(data.filter((d) => d.id !== task.current_department_id));
    });
  }, [task.current_department_id]);

  async function handleHandoff() {
    setLoading(true);
    setError("");
    try {
      // Ghi lịch sử bàn giao
      const { error: hErr } = await supabase.from("task_handoffs").insert({
        task_id: task.id,
        from_department_id: task.current_department_id,
        to_department_id: complete ? null : toDeptId,
        handed_by: profile.id,
        note: note.trim() || null,
      });
      if (hErr) throw hErr;

      if (complete) {
        // Đánh dấu hoàn toàn xong
        const { error: tErr } = await supabase.from("tasks").update({
          is_completed: true,
          status: "done",
        }).eq("id", task.id);
        if (tErr) throw tErr;
      } else {
        // Chuyển sang bộ phận tiếp, reset về todo
        const { error: tErr } = await supabase.from("tasks").update({
          current_department_id: toDeptId,
          status: "todo",
        }).eq("id", task.id);
        if (tErr) throw tErr;
      }

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet onClose={onClose} title="Chuyển bộ phận tiếp theo">
      <div style={{ fontSize: 14, color: COLORS.muted, marginBottom: 20, lineHeight: 1.5 }}>
        Task <strong style={{ color: COLORS.text }}>"{task.title}"</strong> đang ở bộ phận{" "}
        <strong style={{ color: COLORS.gold }}>{task.departments?.name}</strong>.
      </div>

      {/* Toggle: chuyển tiếp hay đóng task */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Chip active={!complete} onClick={() => setComplete(false)} label="Chuyển bộ phận" />
        <Chip active={complete} onClick={() => { setComplete(true); setToDeptId(""); }} label="Đóng task (xong hết)" color="#6A8D73" />
      </div>

      {!complete && (
        <>
          <label style={labelStyle}>Bộ phận tiếp nhận</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {departments.map((d) => (
              <Chip
                key={d.id}
                active={toDeptId === d.id}
                onClick={() => setToDeptId(d.id)}
                label={d.name}
                dot={d.color}
                color={d.color}
              />
            ))}
          </div>
        </>
      )}

      <label style={labelStyle}>Ghi chú bàn giao (tùy chọn)</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="VD: Đã kiểm tra xong, cần bộ phận kỹ thuật xử lý tiếp..."
        style={{ ...inputStyle, resize: "none", marginBottom: 20 }}
      />

      {error && (
        <div style={{ background: "#B5563E22", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#E08070", marginBottom: 12 }}>
          {error}
        </div>
      )}

      <PrimaryButton
        onClick={handleHandoff}
        disabled={loading || (!complete && !toDeptId)}
        style={complete ? { background: loading ? COLORS.border : "#6A8D73", color: COLORS.bg } : {}}
      >
        {loading ? "Đang xử lý..." : complete ? "Đóng & hoàn thành task" : "Chuyển bàn giao"}
      </PrimaryButton>
    </Sheet>
  );
}
