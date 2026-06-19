// Sheet tạo task mới
// Bất kỳ nhân viên nào cũng tạo được, chọn bộ phận bắt đầu xử lý
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Sheet, Chip, COLORS, inputStyle, labelStyle, PrimaryButton } from "./ui";

const H = 3600000;

export default function NewTaskSheet({ onClose, profile }) {
  const [title, setTitle] = useState("");
  const [deptId, setDeptId] = useState(profile?.department_id ?? "");
  const [hours, setHours] = useState(4);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("departments").select("*").then(({ data }) => data && setDepartments(data));
  }, []);

  async function handleAdd() {
    if (!title.trim() || !deptId) return;
    setLoading(true);
    setError("");
    try {
      const { data: task, error: err } = await supabase
        .from("tasks")
        .insert({
          title: title.trim(),
          current_department_id: deptId,
          status: "todo",
          deadline: new Date(Date.now() + hours * H).toISOString(),
          created_by: profile.id,
        })
        .select()
        .single();
      if (err) throw err;

      // Tạo dòng "khởi tạo" trong lịch sử bàn giao để kích hoạt thông báo cho bộ phận được giao
      await supabase.from("task_handoffs").insert({
        task_id: task.id,
        from_department_id: null,
        to_department_id: deptId,
        handed_by: profile.id,
        note: "Khởi tạo công việc",
      });

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet onClose={onClose} title="Giao việc mới">
      <label style={labelStyle}>Nội dung công việc</label>
      <textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        rows={2}
        placeholder="VD: Kiểm tra vòi nước phòng 210"
        style={{ ...inputStyle, resize: "none", marginBottom: 18 }}
      />

      <label style={labelStyle}>Bộ phận bắt đầu xử lý</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {departments.map((d) => (
          <Chip
            key={d.id}
            active={deptId === d.id}
            onClick={() => setDeptId(d.id)}
            label={d.name}
            dot={d.color}
            color={d.color}
          />
        ))}
      </div>

      <label style={labelStyle}>Hạn chót: trong {hours} giờ</label>
      <input
        type="range"
        min={1}
        max={72}
        value={hours}
        onChange={(e) => setHours(+e.target.value)}
        style={{ width: "100%", accentColor: COLORS.gold, marginBottom: 24 }}
      />

      {error && (
        <div style={{ background: "#B5563E22", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#E08070", marginBottom: 12 }}>
          {error}
        </div>
      )}

      <PrimaryButton onClick={handleAdd} disabled={!title.trim() || !deptId || loading}>
        {loading ? "Đang giao..." : "Giao việc"}
      </PrimaryButton>
    </Sheet>
  );
}
