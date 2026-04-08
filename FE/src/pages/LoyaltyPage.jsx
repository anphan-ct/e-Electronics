import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import {
  Star, Gift, History, TrendingUp, Info,
  ShoppingBag, CreditCard, Zap
} from "lucide-react";

const API = "http://localhost:5000/api/loyalty";

const TYPE_CONFIG = {
  earn:         { label: "Tích điểm",       color: "#10b981", bg: "#d1fae5", sign: "+" },
  redeem:       { label: "Dùng điểm",       color: "#ef4444", bg: "#fee2e2", sign: "" },
  expire:       { label: "Hết hạn",         color: "#6b7280", bg: "#f3f4f6", sign: "" },
  admin_add:    { label: "Admin cộng",      color: "#6366f1", bg: "#e0e7ff", sign: "+" },
  admin_deduct: { label: "Admin trừ",       color: "#f59e0b", bg: "#fef3c7", sign: "" },
};

function PointsBadge({ points, type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.earn;
  const sign = (type === "earn" || type === "admin_add") ? "+" : "-";
  return (
    <span className="fw-bold" style={{ color: cfg.color }}>
      {sign}{Math.abs(points)} điểm
    </span>
  );
}

export default function LoyaltyPage() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [info, setInfo]             = useState(null);
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [histLoading, setHistLoading] = useState(false);
  const [activeTab, setActiveTab]   = useState("overview");
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const PAGE_SIZE = 10;

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/"); return; }
    fetchInfo();
  }, [token]);

  useEffect(() => {
    if (activeTab === "history") fetchHistory(page);
  }, [activeTab, page]);

  const fetchInfo = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/info`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInfo(r.data);
    } catch (err) {
      if (err.response?.status === 401) navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (pg = 1) => {
    setHistLoading(true);
    try {
      const offset = (pg - 1) * PAGE_SIZE;
      const r = await axios.get(`${API}/history?limit=${PAGE_SIZE}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(r.data.transactions);
      setTotal(r.data.total);
    } finally {
      setHistLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-warning"></div>
      </div>
    );
  }

  if (!info) return null;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Tính % điểm còn lại / tổng đã tích
  const maxPoints = Math.max(info.totalEarned, 1);
  const progressPct = Math.min((info.currentPoints / maxPoints) * 100, 100);

  return (
    <div className={`min-vh-100 py-5 ${isDark ? "bg-dark text-light" : ""}`}>
      <div className="container" style={{ maxWidth: "900px" }}>

        {/* ── HERO CARD ─────────────────────────────────────── */}
        <div className="rounded-4 p-4 mb-4 text-white position-relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
            boxShadow: "0 20px 60px rgba(245,158,11,0.3)"
          }}>

          {/* Decorative circles */}
          <div style={{
            position: "absolute", right: -40, top: -40,
            width: 160, height: 160, borderRadius: "50%",
            background: "rgba(255,255,255,0.1)"
          }} />
          <div style={{
            position: "absolute", right: 40, bottom: -30,
            width: 100, height: 100, borderRadius: "50%",
            background: "rgba(255,255,255,0.07)"
          }} />

          <div className="row align-items-center">
            <div className="col-md-7">
              <div className="d-flex align-items-center gap-2 mb-2">
                <Star size={20} fill="#fff" />
                <span className="fw-bold" style={{ fontSize: "13px", letterSpacing: "1px" }}>
                  ĐIỂM TÍCH LŨY CỦA BẠN
                </span>
              </div>
              <h2 className="fw-bold mb-1" style={{ fontSize: "42px" }}>
                {info.currentPoints.toLocaleString()}
                <span style={{ fontSize: "18px", marginLeft: "8px", opacity: 0.8 }}>điểm</span>
              </h2>
              <p className="mb-3 opacity-75" style={{ fontSize: "13px" }}>
                Tương đương {(info.currentPoints * info.pointValueVnd).toLocaleString()}đ VND
              </p>

              <div className="d-flex gap-3">
                <button
                  className="btn btn-light fw-bold px-4 rounded-pill"
                  style={{ color: "#d97706", fontSize: "13px" }}
                  onClick={() => navigate("/checkout")}
                >
                  <ShoppingBag size={15} className="me-1" /> Mua hàng tích điểm
                </button>
              </div>
            </div>

            <div className="col-md-5 mt-3 mt-md-0">
              <div className="row g-2">
                {[
                  { label: "Tổng tích lũy", value: info.totalEarned.toLocaleString(), unit: "điểm" },
                  { label: "Đã sử dụng", value: (info.totalEarned - info.currentPoints).toLocaleString(), unit: "điểm" },
                  { label: "Quy đổi", value: info.pointValueVnd.toLocaleString(), unit: "đ/điểm" },
                  { label: "Tối đa/đơn", value: `${info.maxRedeemPercent}%`, unit: "giảm" },
                ].map((s, i) => (
                  <div key={i} className="col-6">
                    <div className="p-2 rounded-3 text-center"
                      style={{ background: "rgba(255,255,255,0.15)" }}>
                      <div className="fw-bold" style={{ fontSize: "16px" }}>{s.value}</div>
                      <div style={{ fontSize: "10px", opacity: 0.8 }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS ──────────────────────────────────────────── */}
        <div className="d-flex gap-2 mb-4">
          {[
            { id: "overview", label: "Tổng quan", Icon: Star },
            { id: "history",  label: "Lịch sử",   Icon: History },
            { id: "howto",    label: "Cách tích", Icon: Info },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn d-flex align-items-center gap-2 fw-semibold"
              style={{
                borderRadius: "10px",
                fontSize: "13px",
                padding: "8px 18px",
                background: activeTab === tab.id
                  ? "#f59e0b"
                  : (isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6"),
                color: activeTab === tab.id ? "white" : (isDark ? "#e5e7eb" : "#374151"),
                border: "none",
              }}>
              <tab.Icon size={15} /> {tab.label}
            </button>
          ))}
        </div>

        {/* ════ TAB: TỔNG QUAN ═══════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="row g-3">
            {/* Thẻ điểm */}
            <div className="col-md-6">
              <div className={`p-4 rounded-4 h-100 border ${isDark ? "bg-dark border-secondary" : "bg-white border-light-subtle shadow-sm"}`}>
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                  <TrendingUp size={16} color="#f59e0b" /> Trạng thái điểm
                </h6>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1" style={{ fontSize: "12px" }}>
                    <span className={isDark ? "text-white-50" : "text-muted"}>Điểm khả dụng</span>
                    <span className="fw-bold" style={{ color: "#f59e0b" }}>
                      {info.currentPoints.toLocaleString()} / {maxPoints.toLocaleString()} điểm đã tích
                    </span>
                  </div>
                  <div style={{ height: "10px", background: isDark ? "#374151" : "#f3f4f6", borderRadius: "99px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${progressPct}%`,
                      background: "linear-gradient(90deg, #f59e0b, #d97706)",
                      borderRadius: "99px",
                      transition: "width 1s ease"
                    }} />
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-3 text-center" style={{ background: isDark ? "rgba(245,158,11,0.1)" : "#fffbeb", fontSize: "13px" }}>
                  <span style={{ color: "#d97706", fontWeight: "500" }}>
                    Bạn đang giữ lại <strong>{progressPct.toFixed(1)}%</strong> tổng số điểm đã tích lũy từ trước đến nay. Đừng quên sử dụng điểm khi mua hàng để nhận ưu đãi nhé!
                  </span>
                </div>
              </div>
            </div>

            {/* Thông tin quy đổi */}
            <div className="col-md-6">
              <div className={`p-4 rounded-4 h-100 border ${isDark ? "bg-dark border-secondary" : "bg-white border-light-subtle shadow-sm"}`}>
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                  <Gift size={16} color="#6366f1" /> Quy đổi điểm
                </h6>

                <div className="mb-3 p-3 rounded-3"
                  style={{ background: isDark ? "rgba(99,102,241,0.1)" : "#eef2ff" }}>
                  <div className="fw-bold mb-1" style={{ color: "#4f46e5", fontSize: "15px" }}>
                    {info.currentPoints.toLocaleString()} điểm
                  </div>
                  <div style={{ color: isDark ? "#a5b4fc" : "#4338ca", fontSize: "13px" }}>
                    = {(info.currentPoints * info.pointValueVnd).toLocaleString()}đ giảm giá
                  </div>
                  <div style={{ color: isDark ? "#a5b4fc" : "#4338ca", fontSize: "11px", marginTop: "4px" }}>
                    ≈ ${info.equivalentUsd} USD
                  </div>
                </div>

                {[
                  { label: "Điểm tối thiểu để đổi", value: `${info.minPointsToRedeem} điểm` },
                  { label: "Giảm tối đa mỗi đơn", value: `${info.maxRedeemPercent}%` },
                  { label: "Tỉ lệ quy đổi", value: `1 điểm = ${info.pointValueVnd.toLocaleString()}đ` },
                ].map((r, i) => (
                  <div key={i} className="d-flex justify-content-between py-2"
                    style={{ borderBottom: i < 2 ? `1px solid ${isDark ? "#374151" : "#e5e7eb"}` : "none", fontSize: "12px" }}>
                    <span className={isDark ? "text-white-50" : "text-muted"}>{r.label}</span>
                    <span className="fw-semibold">{r.value}</span>
                  </div>
                ))}

                <button
                  className="btn w-100 mt-3 fw-bold"
                  style={{ background: "#6366f1", color: "white", borderRadius: "10px", fontSize: "13px" }}
                  onClick={() => navigate("/checkout")}
                >
                  Mua ngay để dùng điểm →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB: LỊCH SỬ ═════════════════════════════════ */}
        {activeTab === "history" && (
          <div className={`rounded-4 border ${isDark ? "bg-dark border-secondary" : "bg-white border-light-subtle shadow-sm"}`}>
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between"
              style={{ borderColor: isDark ? "#374151" : "#e5e7eb" }}>
              <h6 className="fw-bold mb-0">Lịch sử điểm ({total})</h6>
            </div>

            {histLoading ? (
              <div className="text-center py-5"><div className="spinner-border text-warning"></div></div>
            ) : history.length === 0 ? (
              <div className="text-center py-5" style={{ color: isDark ? "#6b7280" : "#9ca3af" }}>
                <Star size={40} color="#d1d5db" className="mb-2" />
                <div>Chưa có giao dịch điểm nào</div>
              </div>
            ) : (
              <>
                {history.map(tx => {
                  const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.earn;
                  return (
                    <div key={tx.id}
                      className="d-flex align-items-center gap-3 p-3"
                      style={{ borderBottom: `1px solid ${isDark ? "#1f2937" : "#f3f4f6"}` }}>

                      <div className="p-2 rounded-3 flex-shrink-0"
                        style={{ background: cfg.bg, width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {tx.type === "earn" || tx.type === "admin_add"
                          ? <Star size={16} color={cfg.color} />
                          : <Gift size={16} color={cfg.color} />}
                      </div>

                      <div className="flex-grow-1 min-width-0">
                        <div className="fw-semibold" style={{ fontSize: "13px", color: isDark ? "#e5e7eb" : "#1f2937" }}>
                          {tx.description}
                        </div>
                        <div style={{ fontSize: "11px", color: isDark ? "#6b7280" : "#9ca3af", marginTop: "2px" }}>
                          {new Date(tx.created_at).toLocaleString("vi-VN")}
                          {tx.expire_at && (
                            <span className="ms-2">• Hết hạn: {new Date(tx.expire_at).toLocaleDateString("vi-VN")}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-end flex-shrink-0">
                        <PointsBadge points={tx.points} type={tx.type} />
                        <div style={{ fontSize: "10px", color: isDark ? "#6b7280" : "#9ca3af", marginTop: "2px" }}>
                          Còn: {tx.balance_after.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="d-flex justify-content-center gap-2 p-3">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                      <button key={pg}
                        onClick={() => setPage(pg)}
                        className="btn btn-sm rounded-pill"
                        style={{
                          width: "36px", height: "36px",
                          background: page === pg ? "#f59e0b" : (isDark ? "#374151" : "#f3f4f6"),
                          color: page === pg ? "white" : (isDark ? "#e5e7eb" : "#374151"),
                          border: "none", fontWeight: "600", fontSize: "12px"
                        }}>
                        {pg}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════ TAB: CÁCH TÍCH ĐIỂM ══════════════════════════ */}
        {activeTab === "howto" && (
          <div className="row g-3">
            {[
              {
                icon: <CreditCard size={24} color="#6366f1" />,
                bg: "#eef2ff",
                title: "Thanh toán VNPay",
                desc: "Nhận 1.5 điểm cho mỗi $1 thanh toán qua VNPay",
                badge: "x1.5",
                badgeColor: "#6366f1",
              },
              {
                icon: <ShoppingBag size={24} color="#10b981" />,
                bg: "#f0fdf4",
                title: "Thanh toán COD",
                desc: "Nhận 1 điểm cho mỗi $1 thanh toán khi nhận hàng",
                badge: "x1.0",
                badgeColor: "#10b981",
              },
              {
                icon: <Star size={24} color="#f59e0b" />,
                bg: "#fffbeb",
                title: "Quy đổi điểm",
                desc: `1 điểm = ${info.pointValueVnd.toLocaleString()}đ VND. Tối đa ${info.maxRedeemPercent}% mỗi đơn`,
                badge: `${info.pointValueVnd.toLocaleString()}đ`,
                badgeColor: "#f59e0b",
              },
              {
                icon: <Zap size={24} color="#ef4444" />,
                bg: "#fff1f2",
                title: "Hạn sử dụng",
                desc: `Điểm hết hạn sau ${info.config.expiryDays} ngày kể từ ngày nhận`,
                badge: `${info.config.expiryDays} ngày`,
                badgeColor: "#ef4444",
              },
            ].map((item, i) => (
              <div key={i} className="col-md-6">
                <div className={`p-4 rounded-4 border h-100 ${isDark ? "bg-dark border-secondary" : "bg-white border-light-subtle shadow-sm"}`}>
                  <div className="d-flex align-items-start gap-3">
                    <div className="p-3 rounded-3 flex-shrink-0" style={{ background: isDark ? "rgba(255,255,255,0.05)" : item.bg }}>
                      {item.icon}
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="fw-bold" style={{ fontSize: "14px" }}>{item.title}</span>
                        <span className="badge rounded-pill fw-bold"
                          style={{ background: `${item.badgeColor}22`, color: item.badgeColor, fontSize: "10px" }}>
                          {item.badge}
                        </span>
                      </div>
                      <p className={isDark ? "text-white-50 mb-0" : "text-muted mb-0"} style={{ fontSize: "13px" }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}