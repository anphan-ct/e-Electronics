// FE/src/pages/Admin/Security.jsx
import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import { LoadingSpinner } from "../../layouts/AdminUI";
import {
  ShieldAlert, ShieldCheck, Lock, Unlock, Monitor,
  Smartphone, Tablet, AlertTriangle, RefreshCw,
  CheckCircle, XCircle, Ban, Activity, X
} from "lucide-react";

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const API = "http://localhost:5000/api/security";

// ── Badge trạng thái log ──────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    success: { label: "Thành công", bg: "#d1fae5", color: "#059669", Icon: CheckCircle },
    failed: { label: "Thất bại", bg: "#fee2e2", color: "#dc2626", Icon: XCircle },
    locked: { label: "Bị khóa", bg: "#fef3c7", color: "#d97706", Icon: Ban },
  };
  const s = map[status] || { label: status, bg: "#f3f4f6", color: "#6b7280", Icon: Activity };
  return (
    <span className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill fw-bold"
      style={{ background: s.bg, color: s.color, fontSize: "11px" }}>
      <s.Icon size={11} />
      {s.label}
    </span>
  );
}

// ── Icon thiết bị ─────────────────────────────────────────
function DeviceIcon({ type }) {
  if (type === "mobile") return <Smartphone size={14} color="var(--text2)" />;
  if (type === "tablet") return <Tablet size={14} color="var(--text2)" />;
  return <Monitor size={14} color="var(--text2)" />;
}

// ── Alert severity badge ──────────────────────────────────
function SeverityBadge({ severity }) {
  const map = {
    high: { label: "Cao", bg: "#fee2e2", color: "#dc2626" },
    medium: { label: "Trung", bg: "#fef3c7", color: "#d97706" },
    low: { label: "Thấp", bg: "#d1fae5", color: "#059669" },
  };
  const s = map[severity] || map.low;
  return (
    <span className="px-2 py-1 rounded-pill fw-bold"
      style={{ background: s.bg, color: s.color, fontSize: "10px" }}>
      {s.label}
    </span>
  );
}

// ════════════════════════════════════════════════════════════
// SECURITY PAGE
// ════════════════════════════════════════════════════════════
export default function Security() {
  const { searchQuery = "" } = useOutletContext() || {};

  const [activeTab, setActiveTab] = useState("logs");
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [unlocking, setUnlocking] = useState(null);

  // ── Fetch data ────────────────────────────────────────────
  const fetchLogs = async (status = statusFilter) => {
    setLoading(true);
    try {
      const params = { limit: 100, offset: 0 };
      if (status !== "all") params.status = status;
      if (searchQuery) params.email = searchQuery;

      const res = await axios.get(`${API}/login-logs`, { headers: auth(), params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error("Không thể tải log đăng nhập");
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${API}/alerts`, { headers: auth() });
      setAlerts(res.data.alerts || []);
      window.dispatchEvent(new Event("security-update"));
    } catch {
      toast.error("Không thể tải cảnh báo");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/stats`, { headers: auth() });
      setStats(res.data);
    } catch { }
  };

  useEffect(() => {
    fetchStats();
    if (activeTab === "logs") fetchLogs();
    if (activeTab === "alerts") fetchAlerts();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "logs") fetchLogs(statusFilter);
  }, [statusFilter, searchQuery]);

  // ── Mở khóa tài khoản ────────────────────────────────────
  const handleUnlock = async (userId, email) => {
    if (!window.confirm(`Mở khóa tài khoản ${email}?`)) return;
    setUnlocking(userId);
    try {
      await axios.post(`${API}/unlock/${userId}`, {}, { headers: auth() });
      toast.success(`Đã mở khóa ${email}`);
      fetchAlerts();
      fetchStats();
      window.dispatchEvent(new Event("security-update"));
    } catch {
      toast.error("Mở khóa thất bại");
    } finally {
      setUnlocking(null);
    }
  };

  // ── Tắt cảnh báo thủ công ────────────────────────────────
  const handleDismissAlert = async (alert, indexToDismiss) => {
    // 1. Cập nhật UI ngay lập tức cho mượt
    setAlerts((prevAlerts) => prevAlerts.filter((_, index) => index !== indexToDismiss));
    
    // 2. Lưu trạng thái tắt vào Database
    try {
      await axios.post(`${API}/alerts/dismiss`, { alertKey: alert.id }, { headers: auth() });
    } catch (error) {
      toast.error("Lỗi kết nối khi tắt cảnh báo");
      // Phục hồi lại data nếu API lỗi
      fetchAlerts(); 
    }
  };

  // ── Format thời gian ──────────────────────────────────────
  const formatTime = (dt) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const FILTER_OPTS = [
    { val: "all", label: "Tất cả" },
    { val: "success", label: "Thành công" },
    { val: "failed", label: "Thất bại" },
    { val: "locked", label: "Bị khóa" },
  ];

  // ── Stats cards ───────────────────────────────────────────
  const STATS = stats ? [
    { label: "Tổng hôm nay", value: stats.today?.total || 0, color: "#6366f1", Icon: Activity },
    { label: "Thành công", value: stats.today?.success || 0, color: "#10b981", Icon: CheckCircle },
    { label: "Thất bại", value: stats.today?.failed || 0, color: "#ef4444", Icon: XCircle },
    { label: "Tài khoản khóa", value: stats.lockedAccounts || 0, color: "#f59e0b", Icon: Lock },
  ] : [];

  return (
    <div className="animate-fade-in">

      {/* ── HEADER ── */}
      <div className="adm-tab-header">
        <div>
          <h2 className="adm-tab-title d-flex align-items-center gap-2">
            <ShieldAlert size={22} color="var(--accent)" />
            Bảo mật hệ thống
          </h2>
          <p className="adm-tab-count">
            Giám sát đăng nhập, cảnh báo và quản lý tài khoản bị khóa
          </p>
        </div>
        <button className="adm-filter-btn d-flex align-items-center gap-2"
          onClick={() => { fetchStats(); activeTab === "logs" ? fetchLogs() : fetchAlerts(); }}>
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      {stats && (
        <div className="adm-stats-grid mb-4">
          {STATS.map((s, i) => (
            <div key={i} className="adm-stat-card">
              <div className="adm-stat-card-glow" style={{ background: `${s.color}10` }} />
              <div className="adm-stat-top">
                <div className="adm-stat-icon" style={{ background: `${s.color}18` }}>
                  <s.Icon size={20} color={s.color} />
                </div>
              </div>
              <div className="adm-stat-value">{s.value}</div>
              <div className="adm-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { id: "logs", label: "Log đăng nhập", Icon: Activity },
          { id: "alerts", label: `Cảnh báo${alerts.length ? ` (${alerts.length})` : ""}`, Icon: ShieldAlert },
        ].map(tab => (
          <button key={tab.id}
            className={`adm-filter-btn d-flex align-items-center gap-2 ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}>
            <tab.Icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: LOG ĐĂNG NHẬP ══ */}
      {activeTab === "logs" && (
        <>
          {/* Bộ lọc trạng thái */}
          <div className="adm-filter-row mb-3">
            {FILTER_OPTS.map(f => (
              <button key={f.val}
                className={`adm-filter-btn ${statusFilter === f.val ? "active" : ""}`}
                onClick={() => setStatusFilter(f.val)}>
                {f.label}
              </button>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text2)", alignSelf: "center" }}>
              {total} bản ghi
            </span>
          </div>

          {loading ? <LoadingSpinner /> : (
            <div className="adm-table-wrap">
              <div style={{ overflowX: "auto" }}>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>IP</th>
                      <th>Thiết bị</th>
                      <th>Trạng thái</th>
                      <th>Ghi chú</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 && (
                      <tr className="adm-empty-row">
                        <td colSpan={6}>Không có dữ liệu log</td>
                      </tr>
                    )}
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td>
                          <div className="adm-cell-name">{log.email || "—"}</div>
                          {log.user_name && (
                            <div className="adm-cell-sub">{log.user_name}</div>
                          )}
                        </td>
                        <td>
                          <code style={{ fontSize: "11px", color: "var(--text2)" }}>
                            {log.ip_address || "—"}
                          </code>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <DeviceIcon type={log.device_type} />
                            <span style={{ fontSize: "11px", color: "var(--text2)", textTransform: "capitalize" }}>
                              {log.device_type || "—"}
                            </span>
                          </div>
                        </td>
                        <td><StatusBadge status={log.status} /></td>
                        <td>
                          <span style={{
                            fontSize: "11px", color: "var(--text2)", maxWidth: 200, display: "block",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                          }}>
                            {log.fail_reason || "—"}
                          </span>
                        </td>
                        <td className="adm-cell-date">{formatTime(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ TAB: CẢNH BÁO ══ */}
      {activeTab === "alerts" && (
        <>
          {alerts.length === 0 ? (
            <div className="adm-card text-center py-5">
              <ShieldCheck size={48} color="var(--green)" style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                Không có cảnh báo
              </div>
              <div style={{ color: "var(--text2)", fontSize: 13 }}>
                Hệ thống đang hoạt động bình thường
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alerts.map((alert, i) => {
                // ── Tinh chỉnh màu sắc và Icon dựa trên mức độ ──
                const isHigh = alert.severity === "high";
                const isMed = alert.severity === "medium";
                const isLow = alert.severity === "low";

                const config = {
                  color: isHigh ? "#ef4444" : isMed ? "#f59e0b" : "#10b981",
                  bg: isHigh ? "rgba(239,68,68,0.05)" : isMed ? "rgba(245,158,11,0.05)" : "rgba(16,185,129,0.05)",
                  Icon: isLow ? ShieldCheck : AlertTriangle
                };

                return (
                  <div key={i} className="adm-card position-relative"
                    style={{
                      borderLeft: `4px solid ${config.color}`,
                      background: config.bg,
                      padding: "16px 40px 16px 20px",
                    }}>

                    {/* NÚT TẮT CẢNH BÁO */}
                    <button
                      onClick={() => handleDismissAlert(alert, i)}
                      className="position-absolute d-flex align-items-center justify-content-center"
                      style={{
                        top: "12px",
                        right: "12px",
                        width: "24px",
                        height: "24px",
                        background: "transparent",
                        border: "none",
                        borderRadius: "50%",
                        cursor: "pointer",
                        color: "var(--text2)",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--text)";
                        e.currentTarget.style.background = "rgba(0,0,0,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--text2)";
                        e.currentTarget.style.background = "transparent";
                      }}
                      title="Bỏ qua cảnh báo này"
                    >
                      <X size={16} />
                    </button>

                    <div className="d-flex align-items-start justify-content-between gap-3">
                      <div className="d-flex align-items-start gap-3 flex-grow-1">
                        <config.Icon size={20}
                          color={config.color}
                          style={{ flexShrink: 0, marginTop: 2 }} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                            <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>
                              {alert.title}
                            </span>
                            <SeverityBadge severity={alert.severity} />
                          </div>
                          <div style={{ color: "var(--text2)", fontSize: 13, marginBottom: 8 }}>
                            {alert.message}
                          </div>

                          <div style={{
                            display: "flex", flexWrap: "wrap", gap: "8px 20px",
                            fontSize: 11, color: "var(--text2)"
                          }}>
                            {alert.detail?.ip && <span>IP: {alert.detail.ip}</span>}
                            {alert.detail?.time && <span>Thời gian: {formatTime(alert.detail.time)}</span>}
                          </div>
                        </div>
                      </div>

                      {alert.type === "locked_account" && alert.detail?.userId && (
                        <button className="adm-filter-btn d-flex align-items-center gap-1"
                          disabled={unlocking === alert.detail.userId}
                          onClick={() => handleUnlock(alert.detail.userId, alert.detail.email)}
                          style={{ marginTop: "4px" }} 
                        >
                          {unlocking === alert.detail.userId ? "Đang mở..." : <><Unlock size={13} /> Mở khóa</>}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}