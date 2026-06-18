// Các component UI dùng chung - giữ nguyên phong cách bản demo
import { ChevronLeft, X } from "lucide-react";

export const COLORS = {
  bg: "#14110D",
  surface: "#1C1812",
  border: "#2A2419",
  text: "#E8E2D4",
  muted: "#9A8F7A",
  faint: "#6B6354",
  gold: "#C9A227",
  red: "#B5563E",
};

export function Stat({ n, label, color = COLORS.text }) {
  return (
    <div style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{n}</div>
      <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export function Chip({ active, onClick, label, dot, color }) {
  const activeColor = color ?? COLORS.gold;
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 20, whiteSpace: "nowrap",
        fontSize: 13, fontWeight: 600, cursor: "pointer",
        border: `1px solid ${active ? activeColor : COLORS.border}`,
        background: active ? activeColor + "22" : "transparent",
        color: active ? COLORS.text : COLORS.muted,
      }}
    >
      {dot && <span style={{ width: 7, height: 7, borderRadius: 4, background: dot }} />}
      {label}
    </button>
  );
}

export function Sheet({ children, onClose, title }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, background: COLORS.surface, borderRadius: "20px 20px 0 0", maxHeight: "92vh", overflowY: "auto", borderTop: `1px solid ${COLORS.border}` }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, background: COLORS.surface }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", padding: 0 }}>
            <ChevronLeft size={22} />
          </button>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: COLORS.muted, cursor: "pointer", padding: 0 }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

export function Meta({ label, value, color = COLORS.text }) {
  return (
    <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "8px 12px", flex: "1 1 auto", minWidth: 90 }}>
      <div style={{ fontSize: 10, color: COLORS.faint, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{value ?? "—"}</div>
    </div>
  );
}

export const inputStyle = {
  width: "100%",
  background: COLORS.bg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "12px 14px",
  color: COLORS.text,
  fontSize: 15,
  fontFamily: "inherit",
  boxSizing: "border-box",
  outline: "none",
};

export const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: COLORS.muted,
  marginBottom: 8,
  display: "block",
};

export function PrimaryButton({ onClick, disabled, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: 14, borderRadius: 12,
        background: disabled ? COLORS.border : COLORS.gold,
        color: disabled ? COLORS.faint : COLORS.bg,
        border: "none", fontSize: 15, fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: COLORS.bg }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.gold, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
