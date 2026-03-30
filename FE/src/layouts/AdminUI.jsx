// ─── STATUS BADGE ─────────────────────────────────────────
// Dùng đúng CSS class .adm-badge từ AdminDashboard.css
const BADGE_MAP = {
  pending:   { label: "Chờ xử lý", bg: "#fef3c7", color: "#d97706" },
  confirmed: { label: "Xác nhận",  bg: "#d1fae5", color: "#059669" },
  shipping:  { label: "Đang giao", bg: "#dbeafe", color: "#2563eb" },
  delivered: { label: "Đã giao",   bg: "#d1fae5", color: "#059669" },
  cancelled: { label: "Đã hủy",    bg: "#fee2e2", color: "#dc2626" },
  paid:      { label: "Đã TT",     bg: "#d1fae5", color: "#059669" },
  failed:    { label: "Thất bại",  bg: "#fee2e2", color: "#dc2626" },
  cod:       { label: "COD",       bg: "#e0e7ff", color: "#4f46e5" },
  vnpay:     { label: "VNPay",     bg: "#fce7f3", color: "#be185d" },
  admin:     { label: "Admin",     bg: "#fef3c7", color: "#d97706" },
  user:      { label: "User",      bg: "#dbeafe", color: "#2563eb" },
};

export function StatusBadge({ status }) {
  const s = BADGE_MAP[status] || { label: status, bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span className="adm-badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ─── SPARKLINE SVG ────────────────────────────────────────
// Dùng CSS var(--text2) và var(--accent) từ AdminDashboard.css
export function Sparkline({ data = [], color = "#6366f1", height = 32 }) {
  if (!data || data.length < 2) return null;
  const max   = Math.max(...data, 1);
  const min   = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100, h = height;
  const pts   = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const uid = color.replace("#", "");
  return (
    <svg width={w} height={h} style={{ overflow: "visible", flexShrink: 0 }}>
      <defs>
        <linearGradient id={`sg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#sg-${uid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── LOADING SPINNER ──────────────────────────────────────
// Dùng class .adm-spinner-wrap, .adm-spinner, .adm-spinner-text từ AdminDashboard.css
export function LoadingSpinner() {
  return (
    <div className="adm-spinner-wrap">
      <div className="adm-spinner" />
      <span className="adm-spinner-text">Đang tải dữ liệu...</span>
    </div>
  );
}