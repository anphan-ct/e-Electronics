import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { Star, Gift, ChevronDown, ChevronUp, Info } from "lucide-react";
import { toast } from "react-toastify";

const API = "http://localhost:5000/api/loyalty";

/** 
 * Props:
 * - orderTotal: number (tổng đơn hàng trước khi giảm)
 * - onRedeemChange: function({ pointsToUse, discountUsd, finalTotal })
 * - compact: boolean (dùng trong Checkout, không cần tiêu đề to)
 */
function LoyaltyWidget({ orderTotal = 0, onRedeemChange, compact = false }) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  const [info, setInfo]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState(false);
  const [pointsInput, setPointsInput] = useState("");
  const [preview, setPreview]       = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applied, setApplied]       = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    axios.get(`${API}/info`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setInfo(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // Reset khi orderTotal thay đổi
  useEffect(() => {
    if (applied) handleRemoveRedeem();
  }, [orderTotal]);

  const handlePreview = async () => {
    const pts = parseInt(pointsInput);
    if (!pts || pts <= 0) return toast.error("Nhập số điểm muốn dùng");

    setPreviewLoading(true);
    try {
      const r = await axios.post(
        `${API}/preview-redeem`,
        { pointsToUse: pts, orderTotal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPreview(r.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể tính toán");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = () => {
    if (!preview) return;
    setApplied(true);
    onRedeemChange?.({
      pointsToUse:  preview.actualPointsUsed,
      discountUsd:  preview.discountUsd,
      finalTotal:   preview.finalTotal,
    });
    toast.success(`Áp dụng ${preview.actualPointsUsed} điểm, giảm $${preview.discountUsd}`);
  };

  const handleRemoveRedeem = () => {
    setApplied(false);
    setPreview(null);
    setPointsInput("");
    onRedeemChange?.({ pointsToUse: 0, discountUsd: 0, finalTotal: orderTotal });
  };

  const handleUseAll = () => {
    if (!info) return;
    // Tính tối đa có thể dùng theo giới hạn %
    const maxByPercent = Math.floor(orderTotal * (info.maxRedeemPercent / 100) / info.pointValueUsd);
    const maxPoints = Math.min(info.currentPoints, maxByPercent);
    setPointsInput(String(maxPoints));
  };

  if (loading) return null;
  if (!token || !info) return null;
  if (info.currentPoints === 0) {
    return (
      <div className={`loyalty-widget-empty p-3 rounded-3 border text-center ${
        isDark ? "bg-dark border-secondary" : "bg-light border-light-subtle"
      }`} style={{ fontSize: "12px" }}>
        <Star size={14} color="#f59e0b" className="me-1" />
        <span className={isDark ? "text-white-50" : "text-muted"}>
          Mua hàng để tích điểm (1 điểm/$1)
        </span>
      </div>
    );
  }

  return (
    <div className={`loyalty-widget rounded-3 overflow-hidden border ${
      isDark ? "border-secondary" : "border-warning border-opacity-50"
    }`} style={{ fontSize: "13px" }}>

      {/* ── HEADER ─────────────────────────────────────── */}
      <div
        className="d-flex align-items-center justify-content-between p-3 cursor-pointer"
        style={{
          background: isDark
            ? "rgba(245,158,11,0.15)"
            : "linear-gradient(135deg, #fffbeb, #fef3c7)",
          cursor: "pointer"
        }}
        onClick={() => !applied && setExpanded(!expanded)}
      >
        <div className="d-flex align-items-center gap-2">
          <Star size={18} fill="#f59e0b" color="#f59e0b" />
          <div>
            <span className="fw-bold" style={{ color: "#d97706" }}>
              Điểm tích lũy
            </span>
            <span className="ms-2 fw-bold" style={{ color: "#92400e", fontSize: "14px" }}>
              {info.currentPoints.toLocaleString()} điểm
            </span>
          </div>
          {applied && (
            <span className="badge ms-1" style={{ background: "#10b981", fontSize: "10px" }}>
              ĐÃ ÁP DỤNG
            </span>
          )}
        </div>

        {!applied && (
          expanded
            ? <ChevronUp size={16} color="#d97706" />
            : <ChevronDown size={16} color="#d97706" />
        )}

        {applied && (
          <button
            onClick={(e) => { e.stopPropagation(); handleRemoveRedeem(); }}
            className="btn btn-link p-0 text-danger fw-bold"
            style={{ fontSize: "11px" }}
          >
            Hủy
          </button>
        )}
      </div>

      {/* ── APPLIED STATE ──────────────────────────────── */}
      {applied && preview && (
        <div className="px-3 py-2" style={{ background: isDark ? "#1a2e1a" : "#f0fdf4" }}>
          <div className="d-flex justify-content-between align-items-center">
            <span className="text-success fw-semibold">
              🎉 Giảm ${preview.discountUsd} từ {preview.actualPointsUsed} điểm
            </span>
            <span className="fw-bold text-success">-${preview.discountUsd}</span>
          </div>
          <div style={{ color: isDark ? "#9ca3af" : "#6b7280", fontSize: "11px" }}>
            Còn lại: {preview.remainingPoints.toLocaleString()} điểm sau giao dịch
          </div>
        </div>
      )}

      {/* ── EXPAND PANEL ───────────────────────────────── */}
      {expanded && !applied && (
        <div className={`p-3 border-top ${isDark ? "bg-dark border-secondary" : "bg-white border-warning border-opacity-25"}`}>

          {/* Thống kê nhanh */}
          <div className="row g-2 mb-3">
            {[
              { label: "Điểm hiện có", value: `${info.currentPoints.toLocaleString()}đ`, color: "#f59e0b" },
              { label: "Quy đổi", value: `${info.currentPoints.toLocaleString()} VND`, color: "#10b981" },
              { label: "Giảm tối đa", value: `${info.maxRedeemPercent}% đơn`, color: "#6366f1" },
            ].map((s, i) => (
              <div key={i} className="col-4">
                <div className={`p-2 rounded-2 text-center ${isDark ? "bg-secondary bg-opacity-25" : "bg-light"}`}>
                  <div className="fw-bold" style={{ color: s.color, fontSize: "12px" }}>{s.value}</div>
                  <div style={{ color: isDark ? "#9ca3af" : "#6b7280", fontSize: "10px" }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Info bar */}
          <div className="d-flex align-items-start gap-2 mb-3 p-2 rounded-2"
            style={{ background: isDark ? "rgba(99,102,241,0.1)" : "#eef2ff", fontSize: "11px" }}>
            <Info size={13} color="#6366f1" style={{ marginTop: "1px", flexShrink: 0 }} />
            <span style={{ color: isDark ? "#a5b4fc" : "#4338ca" }}>
              1 điểm = {info.pointValueVnd.toLocaleString()}đ VND ≈ ${info.pointValueUsd}.
              Cần ít nhất {info.minPointsToRedeem} điểm để quy đổi.
            </span>
          </div>

          {/* Input dùng điểm */}
          <div className="mb-2">
            <label className="fw-semibold mb-1 d-block" style={{ color: isDark ? "#e5e7eb" : "#374151", fontSize: "12px" }}>
              Số điểm muốn dùng:
            </label>
            <div className="d-flex gap-2">
              <input
                type="number"
                className={`form-control form-control-sm ${isDark ? "bg-secondary text-white border-secondary" : ""}`}
                placeholder={`1 - ${info.currentPoints}`}
                value={pointsInput}
                min={info.minPointsToRedeem}
                max={info.currentPoints}
                onChange={e => setPointsInput(e.target.value)}
                style={{ fontSize: "13px" }}
              />
              <button
                className="btn btn-sm btn-outline-warning fw-bold"
                onClick={handleUseAll}
                style={{ whiteSpace: "nowrap", fontSize: "11px" }}
              >
                Dùng tối đa
              </button>
            </div>
            <div style={{ color: isDark ? "#9ca3af" : "#6b7280", fontSize: "10px", marginTop: "3px" }}>
              ≈ giảm ${((parseInt(pointsInput) || 0) * info.pointValueUsd).toFixed(2)} USD
            </div>
          </div>

          <button
            className="btn btn-sm w-100 fw-bold mb-2"
            style={{ background: "#f59e0b", color: "white", fontSize: "12px" }}
            onClick={handlePreview}
            disabled={previewLoading || !pointsInput}
          >
            {previewLoading ? "Đang tính..." : "Xem trước giảm giá"}
          </button>

          {/* Preview kết quả */}
          {preview && (
            <div className={`p-2 rounded-2 mb-2 ${isDark ? "bg-success bg-opacity-10" : "bg-success bg-opacity-10"}`}
              style={{ border: "1px solid #10b98133", fontSize: "12px" }}>
              <div className="d-flex justify-content-between mb-1">
                <span style={{ color: isDark ? "#d1d5db" : "#374151" }}>Điểm sử dụng:</span>
                <span className="fw-bold" style={{ color: "#d97706" }}>{preview.actualPointsUsed} điểm</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span style={{ color: isDark ? "#d1d5db" : "#374151" }}>Giảm giá:</span>
                <span className="fw-bold text-success">-${preview.discountUsd}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span style={{ color: isDark ? "#d1d5db" : "#374151" }}>Tổng sau giảm:</span>
                <span className="fw-bold text-primary">${preview.finalTotal}</span>
              </div>
              <div style={{ color: isDark ? "#9ca3af" : "#6b7280", fontSize: "10px" }}>
                Còn lại: {preview.remainingPoints.toLocaleString()} điểm
              </div>
              <button
                className="btn btn-success btn-sm w-100 mt-2 fw-bold"
                onClick={handleApply}
                style={{ fontSize: "12px" }}
              >
                Áp dụng giảm giá
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LoyaltyWidget;