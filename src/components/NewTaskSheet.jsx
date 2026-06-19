// Sheet tạo task mới
// Bất kỳ nhân viên nào cũng tạo được, chọn bộ phận bắt đầu xử lý
import { useState, useEffect } from "react";
import { Image as ImageIcon, X } from "lucide-react";
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
  const [images, setImages] = useState([]); // [{ file, preview }]
  const MAX_IMAGES = 5;

  function handlePickImages(e) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setImages((prev) => {
      const room = MAX_IMAGES - prev.length;
      return [...prev, ...files.slice(0, room).map((file) => ({ file, preview: URL.createObjectURL(file) }))];
    });
    e.target.value = "";
  }

  function removeImage(idx) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

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

      // Upload ảnh (nếu có) và lưu vào task_images
      for (const { file } of images) {
        const path = `${profile.id}/${task.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("task-images").upload(path, file);
        if (upErr) continue;
        const url = supabase.storage.from("task-images").getPublicUrl(path).data.publicUrl;
        await supabase.from("task_images").insert({ task_id: task.id, path, url });
      }

      // Tạo dòng "khởi tạo" trong lịch sử bàn giao để hiện trong timeline
      const { data: handoff } = await supabase
        .from("task_handoffs")
        .insert({
          task_id: task.id,
          from_department_id: null,
          to_department_id: deptId,
          handed_by: profile.id,
          note: "Khởi tạo công việc",
        })
        .select()
        .single();

      // Gửi thông báo đẩy cho bộ phận được giao (không chặn nếu lỗi)
      if (handoff) {
        supabase.functions.invoke("push-notify", { body: { record: handoff } }).catch(() => {});
      }

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

      <label style={labelStyle}>Ảnh đính kèm (tùy chọn, tối đa {MAX_IMAGES} ảnh)</label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        {images.map((img, idx) => (
          <div key={idx} style={{ position: "relative", width: 90 }}>
            <img src={img.preview} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 12, border: `1px solid ${COLORS.border}` }} />
            <button
              onClick={() => removeImage(idx)}
              style={{ position: "absolute", top: -8, right: -8, background: COLORS.red, border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, width: 90, height: 90, borderRadius: 12, border: `1px dashed ${COLORS.border}`, color: COLORS.faint, cursor: "pointer", fontSize: 11, flexDirection: "column" }}>
            <ImageIcon size={20} />
            Thêm ảnh
            <input type="file" accept="image/*" multiple onChange={handlePickImages} style={{ display: "none" }} />
          </label>
        )}
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
