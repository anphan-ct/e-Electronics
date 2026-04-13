import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";
import {
  Ticket, Star, Gift, Tag, Clock,
  ChevronDown, ChevronUp, Coins, CheckCircle
} from "lucide-react";
import "../voucher.css";

const API = "http://localhost:5000/api/vouchers";

// ── Màu badge theo scope ──────────────────────────────────
const SCOPE_CONFIG = {
  all:      { label: "Toàn shop",      color: "#6366f1", bg: "#e0e7ff" },
  category: { label: "Theo ngành",     color: "#0891b2", bg: "#e0f2fe" },
  product:  { label: "Theo sản phẩm",  color: "#059669", bg: "#d1fae5" },
};

const TYPE_CONFIG = {
  percent: (v) => `Giảm ${v.discount_value}%${v.max_discount ? ` (tối đa $${v.max_discount})` : ""}`,
  fixed:   (v) => `Giảm $${v.discount_value}`,
};

function VoucherCard({ voucher, onCopy }) {
  const scopeCfg = SCOPE_CONFIG[voucher.apply_scope] || SCOPE_CONFIG.all;
  const discountText = TYPE_CONFIG[voucher.discount_type]?.(voucher) || "";
  const isExpired = voucher.expire_at && new Date(voucher.expire_at) < new Date();
  const isUsed = voucher.status === "used";
  const isDisabled = isUsed || isExpired;

  return (
    <div
      className={`voucher-card ${isDisabled ? "disabled" : ""}`}
      style={{
        "--scope-color": scopeCfg.color,
        "--scope-color-light": scopeCfg.color + "55",
        "--scope-bg": scopeCfg.bg,
      }}
    >
      {/* Sọc màu trái */}
      <div className="voucher-card-strip" />

      <div className="voucher-card-body">
        {/* Header */}
        <div className="voucher-card-header">
          <div className="voucher-info-wrap">
            <div className="voucher-badges">
              <span className="voucher-code">{voucher.code}</span>
              <span className="badge-scope">{scopeCfg.label}</span>
              {voucher.source === "redeem_points" && (
                <span className="badge-redeem">⭐ Đổi điểm</span>
              )}
            </div>
            <div className="voucher-name">{voucher.name}</div>
            <div className="voucher-desc">
              {discountText}
              {voucher.min_order > 0 && ` · Đơn từ $${voucher.min_order}`}
            </div>
          </div>

          <div className="voucher-action-wrap">
            {isUsed ? (
              <span className="badge-status used">Đã dùng</span>
            ) : isExpired ? (
              <span className="badge-status expired">Hết hạn</span>
            ) : (
              <button className="btn-use" onClick={() => onCopy?.(voucher.code)}>
                Dùng ngay
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        {voucher.expire_at && !isExpired && (
          <div className="voucher-footer">
            <Clock size={11} />
            HSD: {new Date(voucher.expire_at).toLocaleDateString("vi-VN")}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card voucher đổi điểm ────────────────────────────────
function RedeemCard({ voucher, userPoints, onRedeem, loading }) {
  const canAfford = userPoints >= voucher.points_cost;
  const discountText = TYPE_CONFIG[voucher.discount_type]?.(voucher) || "";

  return (
    <div className={`redeem-card ${canAfford ? "affordable" : ""} ${voucher.alreadyObtained ? "obtained" : ""}`}>
      {/* Top banner */}
      <div className="redeem-top">
        <div className="redeem-icon-wrap">
          <Ticket size={18} color={canAfford ? "#fff" : "#9ca3af"} />
        </div>
        <div className="voucher-info-wrap">
          <div className="voucher-name">{voucher.name}</div>
          <div className="voucher-desc">
            {discountText}
            {voucher.min_order > 0 && ` · Đơn từ $${voucher.min_order}`}
          </div>
        </div>
        <div className="redeem-points-cost">
          {voucher.points_cost?.toLocaleString()} điểm
        </div>
      </div>

      {/* Action */}
      <div className="redeem-action">
        <div className="redeem-status-text">
          {canAfford
            ? `Bạn có ${userPoints.toLocaleString()} điểm`
            : `Cần thêm ${(voucher.points_cost - userPoints).toLocaleString()} điểm`}
        </div>

        {voucher.alreadyObtained ? (
          <div className="redeem-badge-obtained">
            <CheckCircle size={14} /> Đã đổi
          </div>
        ) : (
          <button
            className="btn-redeem"
            disabled={!canAfford || loading}
            onClick={() => onRedeem(voucher.id, voucher.name, voucher.points_cost)}
          >
            {/* Luôn render Icon Coins, nhưng ẩn đi nếu đang loading. Luôn bọc chữ trong <span> */}
            <Coins size={13} style={{ display: loading ? 'none' : 'inline-block' }} />
            <span>{loading ? "Đang đổi..." : " Đổi ngay"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
export default function VoucherWallet({ onSelectVoucher, compact = false }) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";
  const token = localStorage.getItem("token");

  const [activeTab, setActiveTab] = useState("my");
  const [myVouchers,   setMyVouchers]   = useState([]);
  const [redeemList,   setRedeemList]   = useState([]);
  const [userPoints,   setUserPoints]   = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [redeeming,    setRedeeming]    = useState(false);
  const [expanded,     setExpanded]     = useState(!compact);
  const [publicList, setPublicList] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetchAll();
  }, [token]);

const fetchAll = async () => {
    setLoading(true);
    try {
      const [mineRes, redeemRes, publicRes, loyaltyRes] = await Promise.all([
        axios.get(`${API}/my-vouchers`,  { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/redeemable`,   { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/public`,       { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("http://localhost:5000/api/loyalty/info", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setMyVouchers(mineRes.data);
      setRedeemList(redeemRes.data);
      setPublicList(publicRes.data);
      setUserPoints(loyaltyRes.data.currentPoints || 0);
    } catch (err) {
      console.error("VoucherWallet fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code);
    if (onSelectVoucher) {
      onSelectVoucher(code);
      toast.success(`Đã chọn voucher "${code}"!`);
    } else {
      toast.success(`Đã copy mã "${code}" vào clipboard!`);
    }
  };

  const handleRedeem = async (voucherId, voucherName, cost) => {
    if (!window.confirm(`Đổi ${cost.toLocaleString()} điểm để lấy voucher "${voucherName}"?`)) return;
    setRedeeming(true);
    try {
      const res = await axios.post(
        `${API}/redeem-points`,
        { voucherId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message);
      fetchAll(); // Refresh toàn bộ
    } catch (err) {
      toast.error(err.response?.data?.message || "Đổi voucher thất bại");
    } finally {
      setRedeeming(false);
    }
  };

  const handleSaveVoucher = async (voucherId) => {
    try {
      await axios.post(`${API}/save`, { voucherId }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Lưu voucher thành công! Hãy kiểm tra trong Ví của bạn.");
      fetchAll(); // Refresh để update lại danh sách
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi khi lưu voucher");
    }
  };

  const activeVouchers = myVouchers.filter(v => v.status === "active");
  const usedVouchers   = myVouchers.filter(v => v.status !== "active");

  if (!token) return null;

  return (
    <div className={`voucher-wallet-container ${isDark ? "dark" : ""}`}>
      {/* Header */}
      <div
        className={`wallet-header ${compact ? "compact" : ""}`}
        onClick={() => compact && setExpanded(!expanded)}
      >
        <div className="wallet-header-title">
          <Ticket size={20} color="#6366f1" />
          <div>
            <span className="wallet-title-text">Ví Voucher</span>
            {activeVouchers.length > 0 && (
              <span className="wallet-count-badge">
                {activeVouchers.length} khả dụng
              </span>
            )}
          </div>
        </div>
        {compact && (expanded ? <ChevronUp size={16} color="#6366f1" /> : <ChevronDown size={16} color="#6366f1" />)}
      </div>

      {(!compact || expanded) && (
        <div className="wallet-content">
          {/* Tabs */}
          <div className="wallet-tabs">
            {[
              { id: "public", label: "Săn Voucher", icon: <Gift size={13} /> }, // THÊM DÒNG NÀY (Đưa lên đầu tiên cho thu hút)
              { id: "my",     label: "Voucher của tôi", icon: <Tag size={13} /> },
              { id: "redeem", label: "Đổi điểm",        icon: <Star size={13} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`wallet-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

{loading ? (
            <div className="wallet-empty-state">Đang tải...</div>
          ) : (
            <>
              {/* Tab: Săn Voucher Public */}
              {activeTab === "public" && (
                <div>
                  {publicList.length === 0 ? (
                    <div className="wallet-empty-state">Hiện không có mã ưu đãi nào mới.</div>
                  ) : (
                    <div className="wallet-list">
                      {publicList.map((v, i) => {
                        const scopeCfg = SCOPE_CONFIG[v.apply_scope] || SCOPE_CONFIG.all;
                        const discountText = TYPE_CONFIG[v.discount_type]?.(v) || "";
                        // Dùng màu cam/hồng đặc trưng cho thẻ "Săn voucher" thay vì màu theo scope
                        const highlightColor = "#ec4899"; 

                        return (
                          <div key={i} className={`voucher-card ${!v.canSave ? "disabled" : ""}`}
                            style={{
                              "--scope-color": highlightColor,
                              "--scope-color-light": highlightColor + "22",
                              "--scope-bg": highlightColor + "11",
                            }}
                          >
                            <div className="voucher-card-strip" />
                            <div className="voucher-card-body">
                              <div className="voucher-card-header">
                                <div className="voucher-info-wrap">
                                  <div className="voucher-badges">
                                    <span className="voucher-code" style={{ color: highlightColor, borderColor: highlightColor + "55", backgroundColor: highlightColor + "11" }}>{v.code}</span>
                                    {/* Hiển thị badge phạm vi áp dụng */}
                                    <span className="badge-scope" style={{ backgroundColor: scopeCfg.bg, color: scopeCfg.color, borderColor: scopeCfg.color + "33" }}>{scopeCfg.label}</span>
                                  </div>
                                  <div className="voucher-name">{v.name}</div>
                                  <div className="voucher-desc">
                                    {discountText}
                                    {v.min_order > 0 && ` · Đơn từ $${v.min_order}`}
                                  </div>
                                  {/* Tuỳ chọn: Hiển thị thêm giới hạn lưu nếu muốn */}
                                  {v.usage_per_user > 1 && (
                                     <div style={{fontSize: '11px', color: '#6b7280', marginTop: '4px'}}>
                                        Có thể lưu: {v.user_saved_count || 0}/{v.usage_per_user} lần
                                     </div>
                                  )}
                                </div>
                                <div className="voucher-action-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                  {v.canSave ? (
                                    <button 
                                      className="btn-use" 
                                      onClick={() => handleSaveVoucher(v.id)}
                                      style={{ background: highlightColor, color: '#fff', border: 'none', width: '100%' }}
                                    >
                                      Lưu ngay
                                    </button>
                                  ) : (
                                    <span className="badge-status used" style={{ width: '100%', textAlign: 'center' }}>Đã lưu</span>
                                  )}
                                </div>
                              </div>
                              <div className="voucher-footer">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Clock size={11} />
                                  {v.expire_at ? `HSD: ${new Date(v.expire_at).toLocaleDateString('vi-VN')} ${new Date(v.expire_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}` : 'Không thời hạn'}
                                </div>
                                {/* Hiển thị tiến độ (progress) nếu có thông tin số lượng đã lưu */}
                                {v.usage_limit && (
                                   <div style={{ fontSize: '11px', color: '#ec4899', fontWeight: '500' }}>
                                      Số lượng có hạn
                                   </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/*Tab Voucher của tôi */}
              {activeTab === "my" && (
                <div>
                  {activeVouchers.length === 0 && usedVouchers.length === 0 ? (
                    <div className="wallet-empty-state">
                      <Gift size={36} style={{ marginBottom: "8px", opacity: 0.5 }} />
                      <div>Chưa có voucher nào</div>
                      <button className="wallet-go-redeem-btn" onClick={() => setActiveTab("redeem")} style={{ background: "none", border: "none", color: "#6366f1", marginTop: "10px", cursor: "pointer", fontWeight: "bold" }}>
                        Đổi điểm lấy voucher →
                      </button>
                    </div>
                  ) : (
                    <div className="wallet-list">
                      {activeVouchers.map((v, i) => (
                        <VoucherCard key={i} voucher={v} onCopy={handleCopyCode} />
                      ))}
                      {usedVouchers.length > 0 && (
                        <>
                          <div className="wallet-used-title" style={{ marginTop: "15px", fontSize: "13px", fontWeight: "bold", color: "#9ca3af" }}>
                            Đã sử dụng / Hết hạn
                          </div>
                          {usedVouchers.map((v, i) => (
                            <VoucherCard key={i} voucher={v} onCopy={handleCopyCode} />
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Đổi điểm */}
              {activeTab === "redeem" && (
                <div>
                  <div className="points-info-box">
                    <Coins size={16} color="#d97706" />
                    <span>
                      Điểm hiện có: <strong style={{ fontSize: "14px" }}>{userPoints.toLocaleString()}</strong> điểm
                    </span>
                  </div>

                  {redeemList.length === 0 ? (
                    <div className="wallet-empty-state">Hiện không có voucher nào có thể đổi</div>
                  ) : (
                    <div className="wallet-list">
                      {redeemList.map((v, i) => (
                        <RedeemCard
                          key={i}
                          voucher={v}
                          userPoints={userPoints}
                          onRedeem={handleRedeem}
                          loading={redeeming}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}