import { useState, useEffect, useContext } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  ArrowUpRight, ArrowDownRight,
  DollarSign, ShoppingCart, Users, Package,
  MessageSquare, ChevronRight, Calendar,
} from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";
import { Sparkline, StatusBadge, LoadingSpinner } from "../../layouts/AdminUI";
import { useOverview } from "../../api/useOverview";

// ─── BIỂU ĐỒ AREA CHART (SVG) ───────────────────────────
function RevenueAreaChart({ data, isDark, loading }) {
  if (loading) return (
    <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="adm-spinner" style={{ width: 28, height: 28, borderWidth: 2 }} />
    </div>
  );
  if (!data || data.length === 0) {
  return (
    <div style={{
      height: 180,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--text2)",
      fontSize: 13
    }}>
      Chưa có dữ liệu trong khoảng thời gian này
    </div>
  );
}

  // xử lý riêng trường hợp 1 data
  if (data.length === 1) {
    const v = parseFloat(data[0].revenue) || 0;

    return (
      <div style={{
        height: 180,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column"
      }}>
        <div style={{ fontSize: 13, color: "var(--text2)" }}>
          Chỉ có 1 ngày dữ liệu
        </div>
        <div style={{
          fontSize: 22,
          fontWeight: 800,
          color: "var(--accent)"
        }}>
          ${v.toLocaleString()}
        </div>
      </div>
    );
}

  const W = 600, H = 160, PAD = 30;
  const values = data.map(d => {
    const val = parseFloat(d.revenue);
    return isNaN(val) ? 0 : val;
  });
  const max      = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = values.length === 1
      ? W / 2   // 👉 đặt điểm ở giữa nếu chỉ có 1 data
      : PAD + (i / (values.length - 1)) * (W - PAD * 2);

    const y = H - PAD - (v / max) * (H - PAD * 2);

    return [x, y];
  });
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]},${p[1]}`).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length-1][0]},${H-PAD} L ${pts[0][0]},${H-PAD} Z`;

  // Chỉ hiện tối đa 6 nhãn để tránh chồng chéo
  const step   = Math.max(1, Math.floor(data.length / 6));
  const labels = data.filter((_, i) => i % step === 0 || i === data.length - 1)
  .map(d => {
    const dateObj = new Date(d.date);
    // Lấy giờ-phút-giây và thay dấu ":" thành "-"
    // const time = dateObj.toLocaleTimeString("vi-VN", { 
    //   hour: '2-digit', 
    //   minute: '2-digit', 
    //   second: '2-digit', 
    //   hour12: false 
    // }).replace(/:/g, '-');

    // Lấy ngày/tháng/năm
    const date = dateObj.toLocaleDateString("vi-VN", { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    return `${date}`; 
  });

  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="180" preserveAspectRatio="none">
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i}
            x1={PAD} y1={PAD + t*(H-PAD*2)} x2={W-PAD} y2={PAD + t*(H-PAD*2)}
            stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="1" />
        ))}
        <path d={areaPath} fill="url(#revenueGrad)" />
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round" />
        {/* Điểm cuối */}
        {(() => { const [x,y]=pts[pts.length-1]; return <circle cx={x} cy={y} r={5} fill="#6366f1" stroke="white" strokeWidth={2} />; })()}
      </svg>
      <div style={{ display:"flex", justifyContent:"space-between", paddingLeft:PAD/2, paddingRight:PAD/2, marginTop:4 }}>
        {labels.map((l, i) => (
          <span key={i} style={{ fontSize:10, color:"var(--text2)", fontWeight:500 }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

// ─── PAYMENT DONUT ────────────────────────────────────────
function PaymentDonutChart({ data, isDark }) {
  const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6"];
  const total  = data.reduce((s, d) => s + (d.count||0), 0) || 1;
  let ang = -90;
  const r=50, cx=70, cy=70, rad=d=>(d*Math.PI)/180;
  const slices = data.map((d, i) => {
    const a  = ((d.count||0)/total)*360;
    const x1 = cx+r*Math.cos(rad(ang)); const y1=cy+r*Math.sin(rad(ang));
    ang += a;
    const x2 = cx+r*Math.cos(rad(ang)); const y2=cy+r*Math.sin(rad(ang));
    return { path:`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${a>180?1:0} 1 ${x2} ${y2} Z`, color:COLORS[i%COLORS.length] };
  });
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <svg viewBox="0 0 140 140" width="120" height="120">
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={isDark ? "#2c2f3e" : "#f0f2f5"} strokeWidth={18} />
        {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} />)}
        <circle cx={cx} cy={cy} r={r-14} fill={isDark?"#1c2030":"white"} />
        <text x={cx} y={cy+6} textAnchor="middle" fontSize={16} fontWeight={800}
          fill={isDark?"#e8eaf6":"#1a1d2e"}>{total}</text>
      </svg>
      <div style={{ width:"100%", marginTop:12 }}>
        {data.map((p,i)=>(
          <div key={i} className="adm-donut-legend-row" style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div className="adm-dot" style={{ width:8, height:8, borderRadius:"50%", background:COLORS[i%COLORS.length], flexShrink:0 }} />
              <span style={{ fontSize:11, color:"var(--text2)" }}>
                {p.payment_method?.toUpperCase()} — {p.payment_status}
              </span>
            </div>
            <span style={{ fontSize:12, fontWeight:700, color:"var(--text)" }}>{p.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RANGE CONTROLS — Ngày / Tuần / Tháng / Tuỳ chọn ────
function ChartRangeControls({ range, onRangeChange, customFrom, customTo, onCustomChange, onApply, loading }) {
  const RANGES = [
    { val:"day",   label:"Ngày" },
    { val:"week",  label:"Tuần" },
    { val:"month", label:"Tháng" },
    { val:"custom",label:"Tuỳ chọn" },
  ];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
      {/* Tabs chọn range */}
      <div style={{
        display:"flex", background:"var(--card2)", borderRadius:10, padding:3,
        border:"1px solid var(--border)",
      }}>
        {RANGES.map(r => (
          <button key={r.val}
            onClick={() => onRangeChange(r.val)}
            style={{
              padding:"5px 14px", borderRadius:8, border:"none", cursor:"pointer",
              fontSize:12, fontWeight:600, fontFamily:"inherit",
              background: range===r.val ? "var(--accent)" : "transparent",
              color:      range===r.val ? "white" : "var(--text2)",
              transition:"all .2s",
            }}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Date picker — chỉ hiện khi chọn "Tuỳ chọn" */}
      {range === "custom" && (
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6,
            background:"var(--card2)", border:"1px solid var(--border)",
            borderRadius:9, padding:"5px 12px" }}>
            <Calendar size={13} color="var(--text2)" />
            <input type="date" value={customFrom}
              onChange={e => onCustomChange("from", e.target.value)}
              style={{
                border:"none", background:"transparent", outline:"none",
                color:"var(--text)", fontSize:12, fontFamily:"inherit", cursor:"pointer",
              }} />
          </div>
          <span style={{ fontSize:12, color:"var(--text2)" }}>→</span>
          <div style={{ display:"flex", alignItems:"center", gap:6,
            background:"var(--card2)", border:"1px solid var(--border)",
            borderRadius:9, padding:"5px 12px" }}>
            <Calendar size={13} color="var(--text2)" />
            <input type="date" value={customTo}
              onChange={e => onCustomChange("to", e.target.value)}
              style={{
                border:"none", background:"transparent", outline:"none",
                color:"var(--text)", fontSize:12, fontFamily:"inherit", cursor:"pointer",
              }} />
          </div>
          <button onClick={onApply} disabled={!customFrom || !customTo || loading}
            style={{
              padding:"6px 16px", borderRadius:8, border:"none",
              background: "var(--accent)", color:"white",
              fontSize:12, fontWeight:700, cursor:"pointer",
              opacity: (!customFrom || !customTo || loading) ? 0.6 : 1,
              fontFamily:"inherit",
            }}>
            {loading ? "..." : "Xem"}
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// OVERVIEW PAGE  —  route: /admin/dashboard
// ════════════════════════════════════════════════════════════

export default function Overview() {
  const { theme } = useContext(ThemeContext);
  const navigate  = useNavigate();
  const isDark    = theme === "dark";

  // Context từ AdminLayout (searchQuery — không dùng ở trang này)
  const outletCtx = useOutletContext() || {};

  // ★ Hook riêng — chỉ gọi API tổng quan
  const {
    stats, revenueChart, recentOrders, topProducts, paymentStats,
    loading, chartLoading,
    fetchOverview, fetchChart,
  } = useOverview();

  const admin    = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return {}  ; } })();
  const sparkData = revenueChart
    .slice(-12)
    .map(r => parseFloat(r.revenue) || 0);
  const maxSold   = Math.max(...topProducts.map(p => p.total_sold), 1);

  // State bộ lọc biểu đồ
  const [range,      setRange]      = useState("day");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");

  // Khi đổi range (không phải custom) → fetch ngay
  const handleRangeChange = (val) => {
    setRange(val);
    if (val !== "custom") fetchChart(val);
  };

  // Khi nhấn "Xem" với range custom
  const handleApplyCustom = () => { 
    if (!customFrom || !customTo) {
      alert("Vui lòng chọn đầy đủ ngày");
      return;
    } 
    if (new Date(customFrom) > new Date(customTo)) {
      alert("Ngày bắt đầu phải trước ngày kết thúc");
      return;
    }
    fetchChart("custom", customFrom, customTo);
  };

  const handleCustomChange = (field, val) => {
    if (field === "from") setCustomFrom(val);
    else setCustomTo(val);
  };

  const STAT_CARDS = [
    { label:"Tổng doanh thu", value:`$${(stats.revenue||0).toLocaleString()}`, icon:DollarSign,  color:"#6366f1", sub:`${stats.paidOrders||0} đơn đã TT`,    up:true  },
    { label:"Tổng đơn hàng",  value: stats.totalOrders  ||0,                  icon:ShoppingCart, color:"#10b981", sub:`${stats.pendingOrders||0} chờ xử lý`, up:true  },
    { label:"Người dùng",     value: stats.totalUsers   ||0,                  icon:Users,        color:"#f59e0b", sub:"Khách đã đăng ký",                     up:true  },
    { label:"Sản phẩm",       value: stats.totalProducts||0,                  icon:Package,      color:"#ef4444", sub:"Đang kinh doanh",                      up:false },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">

      {/* ══ WELCOME BANNER ══ */}
      <div className="adm-welcome">
        <div>
          <p className="adm-welcome-date">
            {new Date().toLocaleDateString("vi-VN", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
          </p>
          <h2 className="adm-welcome-title">Xin chào, {admin?.name}!</h2>
          <p className="adm-welcome-sub">
            Hôm nay có <strong>{stats.pendingOrders||0}</strong> đơn chờ xử lý
          </p>
        </div>
        <div className="adm-welcome-actions">
          <button className="adm-welcome-btn-outline"
            onClick={() => navigate("/admin/dashboard/orders")}>
            Xem đơn hàng
          </button>
          <Link to="/admin/chat" className="adm-welcome-btn-solid">
            <MessageSquare size={14} /> Chat ngay
          </Link>
        </div>
      </div>

      {/* ══ STAT CARDS ══ */}
      <div className="adm-stats-grid">
        {STAT_CARDS.map((s,i) => (
          <div key={i} className="adm-stat-card">
            {/* Glow */}
            <div className="adm-stat-card-glow" style={{ background:`${s.color}10` }} />
            <div className="adm-stat-top">
              <div className="adm-stat-icon" style={{ background:`${s.color}18` }}>
                <s.icon size={20} color={s.color} />
              </div>
              
            </div>
            <div className="adm-stat-value">{s.value}</div>
            <div className="adm-stat-label">{s.label}</div>
            <div className="adm-stat-sub">
              {s.up
                ? <ArrowUpRight   size={12} color="var(--green)" />
                : <ArrowDownRight size={12} color="var(--red)" />}
              <span style={{ color: s.up ? "var(--green)" : "var(--red)" }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ══ BIỂU ĐỒ ROW ══ */}
      <div className="adm-charts-row">

        {/* Biểu đồ doanh thu + bộ lọc */}
        <div className="adm-card">
          <div className="adm-card-header">
            <div>
              <h3 className="adm-card-title">Doanh thu chi tiết</h3>
              <p className="adm-card-sub">Thống kê theo trạng thái thanh toán</p>
            </div>
            {/* Controls chọn khoảng thời gian */}
            <ChartRangeControls
              range={range}
              onRangeChange={handleRangeChange}
              customFrom={customFrom}
              customTo={customTo}
              onCustomChange={handleCustomChange}
              onApply={handleApplyCustom}
              loading={chartLoading}
            />
          </div>

          {/* Tổng doanh thu của khoảng đang hiển thị */}
          <div style={{ display:"flex", gap:24, marginBottom:16 }}>
            <div>
              <div style={{ fontSize:11, color:"var(--text2)", fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>
                Tổng doanh thu
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:"var(--accent)" }}>
                ${revenueChart.reduce((s,d)=>s+parseFloat(d.revenue||0),0).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, color:"var(--text2)", fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>
                Số đơn
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:"var(--green)" }}>
                {revenueChart.reduce((s,d)=>s+(parseInt(d.orders)||0),0)}
              </div>
            </div>
          </div>

          <RevenueAreaChart data={revenueChart} isDark={isDark} loading={chartLoading} />
        </div>

        {/* Donut phương thức TT */}
        <div className="adm-card">
          <h3 className="adm-card-title" style={{ marginBottom:16 }}>Phương thức TT</h3>
          <PaymentDonutChart data={paymentStats} isDark={isDark} />
        </div>
      </div>

      {/* ══ BOTTOM ROW ══ */}
      <div className="adm-bottom-row">

        {/* Đơn hàng gần đây */}
        <div className="adm-card">
          <div className="adm-section-header">
            <h3 className="adm-card-title">Đơn hàng gần đây</h3>
            <button className="adm-see-all-btn"
              onClick={() => navigate("/admin/dashboard/orders")}>
              Xem tất cả <ChevronRight size={13} />
            </button>
          </div>
          {recentOrders.slice(0,6).map(o => (
            <div key={o.id} className="adm-order-row">
              <div className="adm-order-avatar">#{o.id}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="adm-order-name">{o.shipping_name||o.user_name}</div>
                <div className="adm-order-date">
                  {new Date(o.created_at).toLocaleDateString("vi-VN")}
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div className="adm-order-price">${parseFloat(o.total).toFixed(0)}</div>
                <StatusBadge status={o.status} />
              </div>
            </div>
          ))}
          {recentOrders.length === 0 && (
            <div style={{ textAlign:"center", padding:"20px 0", color:"var(--text2)", fontSize:13 }}>
              Chưa có đơn hàng
            </div>
          )}
        </div>

        {/* Top sản phẩm */}
        <div className="adm-card">
          <div className="adm-section-header">
            <h3 className="adm-card-title">Top sản phẩm</h3>
            <span className="adm-pill">Bán chạy nhất</span>
          </div>
          {topProducts.slice(0,5).map((p,i) => (
            <div key={p.id} className="adm-product-row">
              <div className={`adm-rank-badge adm-rank-${i<2?i+1:"3+"}`}>{i+1}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="adm-product-name">{p.name}</div>
                <div className="adm-progress-wrap">
                  <div className="adm-progress-bar">
                    <div className="adm-progress-fill"
                      style={{ width:`${Math.max((p.total_sold/maxSold)*100,4)}%` }} />
                  </div>
                  <span className="adm-progress-label">{p.total_sold} đã bán</span>
                </div>
              </div>
              <div className="adm-product-price">${parseFloat(p.price).toFixed(0)}</div>
            </div>
          ))}
          {topProducts.length === 0 && (
            <div style={{ textAlign:"center", padding:"20px 0", color:"var(--text2)", fontSize:13 }}>
              Chưa có dữ liệu
            </div>
          )}
        </div>
      </div>
    </div>
  );
}