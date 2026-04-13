// FE/src/components/VoucherInput.jsx
// Input nhập mã voucher + hiển thị kết quả — dùng trong Checkout
import { useState, useContext } from "react";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";
import { Tag, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import VoucherWallet from "./VoucherWallet";

const API = "http://localhost:5000/api/vouchers";

export default function VoucherInput({ cartItems, orderTotal, onVoucherChange }) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";
  const token = localStorage.getItem("token");

  const [code,          setCode]          = useState("");
  const [result,        setResult]        = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [showWallet,    setShowWallet]    = useState(false);
  const [error,         setError]         = useState("");

  const handleValidate = async (inputCode) => {
    const c = (inputCode || code).trim().toUpperCase();
    if (!c) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await axios.post(
        `${API}/validate`,
        { code: c, cartItems },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
      setCode(c);
      onVoucherChange?.({
        voucherCode:       c,
        discountFromVoucher: res.data.discountAmount,
        voucherInfo:       res.data.voucher,
      });
      toast.success(`Áp dụng voucher "${c}" thành công! Giảm $${res.data.discountAmount}`);
    } catch (err) {
      const msg = err.response?.data?.message || "Mã voucher không hợp lệ";
      setError(msg);
      onVoucherChange?.({ voucherCode: null, discountFromVoucher: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setResult(null);
    setCode("");
    setError("");
    onVoucherChange?.({ voucherCode: null, discountFromVoucher: 0 });
    toast.info("Đã bỏ voucher");
  };

  const handleSelectFromWallet = (selectedCode) => {
    setCode(selectedCode);
    setShowWallet(false);
    handleValidate(selectedCode);
  };

  return (
    <div style={{ fontFamily: "inherit" }}>
      {/* Input nhập mã */}
      {!result ? (
        <div>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center",
              border: `1.5px solid ${error ? "#ef4444" : (isDark ? "#374151" : "#e5e7eb")}`,
              borderRadius: "10px",
              background: isDark ? "#1f2937" : "#f9fafb",
              padding: "0 12px",
              transition: "border-color 0.2s",
            }}>
              <Tag size={14} color={isDark ? "#6b7280" : "#9ca3af"} style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Nhập mã voucher..."
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleValidate()}
                style={{
                  flex: 1, border: "none", background: "transparent",
                  outline: "none", padding: "11px 10px",
                  fontSize: "13px", fontWeight: 600, letterSpacing: "1px",
                  color: isDark ? "#e5e7eb" : "#1f2937",
                  fontFamily: "monospace",
                }}
              />
              {code && (
                <button
                  onClick={() => { setCode(""); setError(""); }}
                  style={{ border: "none", background: "none", cursor: "pointer", padding: "2px" }}
                >
                  <X size={13} color="#9ca3af" />
                </button>
              )}
            </div>
            <button
              onClick={() => handleValidate()}
              disabled={loading || !code.trim()}
              style={{
                padding: "0 18px",
                background: loading || !code.trim() ? (isDark ? "#374151" : "#e5e7eb") : "#6366f1",
                color: loading || !code.trim() ? "#9ca3af" : "#fff",
                border: "none", borderRadius: "10px", cursor: loading || !code.trim() ? "not-allowed" : "pointer",
                fontSize: "13px", fontWeight: 700, fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              {loading ? "..." : "Áp dụng"}
            </button>
          </div>

          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              marginTop: "6px", color: "#ef4444", fontSize: "12px",
            }}>
              <AlertCircle size={12} /> {error}
            </div>
          )}

          {/* Toggle ví voucher */}
          <button
            onClick={() => setShowWallet(!showWallet)}
            style={{
              marginTop: "8px", width: "100%", border: `1px dashed ${isDark ? "#374151" : "#d1d5db"}`,
              borderRadius: "8px", padding: "8px", background: "transparent",
              cursor: "pointer", fontSize: "12px", fontWeight: 600,
              color: isDark ? "#9ca3af" : "#6b7280", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "#6366f1";
              e.currentTarget.style.color = "#6366f1";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = isDark ? "#374151" : "#d1d5db";
              e.currentTarget.style.color = isDark ? "#9ca3af" : "#6b7280";
            }}
          >
            {showWallet ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showWallet ? "Ẩn ví voucher" : "Xem ví voucher của tôi"}
          </button>

          {showWallet && (
            <div style={{ marginTop: "10px" }}>
              <VoucherWallet
                compact={false}
                onSelectVoucher={handleSelectFromWallet}
              />
            </div>
          )}
        </div>
      ) : (
        /* Hiển thị kết quả đã áp dụng */
        <div style={{
          border: "1.5px solid #10b981",
          borderRadius: "10px",
          padding: "12px 14px",
          background: isDark ? "rgba(16,185,129,0.08)" : "#f0fdf4",
          display: "flex", alignItems: "flex-start", gap: "10px",
        }}>
          <CheckCircle size={18} color="#10b981" style={{ flexShrink: 0, marginTop: "1px" }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{
                fontFamily: "monospace", fontWeight: 800, color: "#059669",
                fontSize: "14px", letterSpacing: "1px",
              }}>
                {result.voucher.code}
              </span>
              <span style={{
                fontSize: "11px", background: "#d1fae5", color: "#059669",
                padding: "2px 8px", borderRadius: "99px", fontWeight: 700,
              }}>
                Đã áp dụng
              </span>
            </div>
            <div style={{ fontSize: "12px", color: isDark ? "#9ca3af" : "#6b7280", marginBottom: "2px" }}>
              {result.voucher.name}
            </div>
            <div style={{ fontWeight: 700, color: "#059669", fontSize: "13px" }}>
              Giảm ${result.discountAmount}
              {result.eligibleTotal < result.orderTotal && (
                <span style={{ fontWeight: 400, color: isDark ? "#9ca3af" : "#6b7280", fontSize: "11px", marginLeft: "6px" }}>
                  (áp dụng cho ${result.eligibleTotal.toFixed(2)} sản phẩm hợp lệ)
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleRemove}
            title="Bỏ voucher"
            style={{
              border: "none", background: "none", cursor: "pointer", padding: "2px",
              color: "#9ca3af", flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}