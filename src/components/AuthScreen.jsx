// Màn hình đăng ký / đăng nhập
// Đăng ký lần đầu: nhập tên + chọn bộ phận → lưu vào profiles
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { COLORS, inputStyle, labelStyle, PrimaryButton, Chip } from "./ui";

export default function AuthScreen({ onDone }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [deptId, setDeptId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.from("departments").select("*").then(({ data }) => {
      if (data) setDepartments(data);
    });
  }, []);

  async function handleSubmit() {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mode === "register") {
        if (!fullName.trim() || !deptId) throw new Error("Vui lòng nhập đầy đủ tên và chọn bộ phận");
        const { data, error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;

        if (data.user) {
          const { error: pErr } = await supabase.from("profiles").insert({
            id: data.user.id,
            full_name: fullName.trim(),
            department_id: deptId,
          });
          if (pErr) throw pErr;
        }
        setMessage("Đăng ký thành công! Kiểm tra email để xác nhận tài khoản, rồi đăng nhập lại.");
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        onDone();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = email && password.length >= 6 && (mode === "login" || (fullName && deptId));

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 24 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: COLORS.gold, fontWeight: 600 }}>VẬN HÀNH KHÁCH SẠN</div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "Georgia, serif", color: COLORS.text, marginTop: 4 }}>TaskHub</div>
          <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 6 }}>
            {mode === "login" ? "Đăng nhập để tiếp tục" : "Tạo tài khoản mới"}
          </div>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mode === "register" && (
            <>
              <div>
                <label style={labelStyle}>Họ tên của bạn</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Bộ phận của bạn</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@khachsan.vn"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Mật khẩu (ít nhất 6 ký tự)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
            />
          </div>

          {error && (
            <div style={{ background: "#B5563E22", border: "1px solid #B5563E44", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#E08070" }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{ background: "#6A8D7322", border: "1px solid #6A8D7344", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#90C4A0" }}>
              {message}
            </div>
          )}

          <PrimaryButton onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </PrimaryButton>

          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setMessage(""); }}
            style={{ background: "none", border: "none", color: COLORS.gold, fontSize: 14, cursor: "pointer", padding: "4px 0" }}
          >
            {mode === "login" ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
          </button>
        </div>
      </div>
    </div>
  );
}
