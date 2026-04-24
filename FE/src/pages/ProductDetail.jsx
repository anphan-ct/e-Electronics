// FE/src/pages/ProductDetail.jsx

import { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { CartContext } from "../context/CartContext";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";
import {
  ArrowLeft, Sparkles, ShoppingCart,
  Shield, Truck, RotateCcw, Zap,
  ChevronDown, ChevronUp, BadgeCheck,
  Package, FileText, Cpu
} from "lucide-react";

// ── Huy hiệu tin tưởng ──────────────────────────────────
function TrustBadges({ isDark }) {
  const items = [
    { icon: <Shield size={15} />,    text: "Bảo hành chính hãng" },
    { icon: <Truck size={15} />,     text: "Giao hàng nhanh" },
    { icon: <RotateCcw size={15} />, text: "Đổi trả 7 ngày" },
    { icon: <Zap size={15} />,       text: "Hỗ trợ 24/7" },
  ];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr",
      gap: 8, marginTop: 20
    }}>
      {items.map((b, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 12px", borderRadius: 10,
          background: isDark ? "rgba(255,255,255,.04)" : "#f8f9fa",
          border: `1px solid ${isDark ? "#374151" : "#e9ecef"}`,
          fontSize: 12, fontWeight: 600,
          color: isDark ? "#9ca3af" : "#495057"
        }}>
          <span style={{ color: "#0d6efd", flexShrink: 0 }}>{b.icon}</span>
          {b.text}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════
function ProductDetail() {
  const { id }          = useParams();
  const { addToCart }   = useContext(CartContext);
  const { theme }       = useContext(ThemeContext);
  const navigate        = useNavigate();
  const isDark          = theme === "dark";

  const [product,   setProduct]   = useState(null);
  const [article,   setArticle]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("article");
  const [isArticleOpen, setIsArticleOpen] = useState(true);
  const [isReadMore, setIsReadMore] = useState(false);

  // Refs cho scroll-to
  const articleRef = useRef(null);
  const specsRef   = useRef(null);
  const tabBarRef  = useRef(null);

  useEffect(() => {
    setLoading(true);
    setArticle(null);
    
    setActiveTab("article");

    Promise.all([
      axios.get(`http://localhost:5000/api/products/${id}`),
      axios.get(`http://localhost:5000/api/articles/public/${id}`)
        .catch(() => ({ data: null }))
    ]).then(([pRes, aRes]) => {
      setProduct(pRes.data);
      setArticle(aRes.data);
      if (!aRes.data) setActiveTab("specs");
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    const user = localStorage.getItem("user");
    if (!user) {
      toast.info("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!");
      const el = document.getElementById("loginModal");
      if (window.bootstrap && el) window.bootstrap.Modal.getOrCreateInstance(el).show();
      return;
    }
    addToCart(product);
    toast.success("Đã thêm vào giỏ hàng!");
  };

  const scrollToSection = (tab) => {
    setActiveTab(tab);
    const target = tab === "article" ? articleRef : specsRef;
    if (target.current) {
      const offset = (tabBarRef.current?.offsetHeight || 52) + 72;
      const top    = target.current.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="spinner-border text-primary" role="status" />
    </div>
  );
  if (!product) return (
    <div className="container py-5 text-center">Sản phẩm không tồn tại</div>
  );

  const hasArticle = Boolean(article);
  const hasSpecs   = product.specs && Object.keys(product.specs).length > 0;

  const cardBg     = isDark ? "#1c2030" : "#ffffff";
  const cardBorder = isDark ? "#2d3448" : "#e9ecef";
  const pageBg     = isDark ? "#0f1117" : "#f4f6fb";
  const textMain   = isDark ? "#e5e7eb" : "#1f2937";
  const textSub    = isDark ? "#9ca3af" : "#6b7280";

  return (
    <div className={isDark ? "dark" : ""} style={{ background: pageBg, minHeight: "100vh", paddingBottom: 60 }}>
      <div className="container" style={{ maxWidth: 1200, paddingTop: 28 }}>

        {/* ── Nút Quay lại ─────────────────────────────── */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            fontWeight: "bold", fontSize: 14, marginBottom: 20,
            color: isDark ? "#9ca3af" : "#6b7280", padding: 0
          }}
        >
          <ArrowLeft size={18} /> Quay lại
        </button>

        {/* ═══════════════════════════════════════════════
            HERO ROW — Ảnh (trái) + Thông tin mua (phải)
        ════════════════════════════════════════════════ */}
        <div style={{
          display: "grid", gridTemplateColumns: "minmax(0,5fr) minmax(0,7fr)",
          gap: 28, marginBottom: 24, alignItems: "start"
        }}>
          {/* Cột Ảnh */}
          <div style={{
            background: cardBg, borderRadius: 20, border: `1px solid ${cardBorder}`,
            padding: 16, overflow: "hidden", position: "sticky", top: 80,
            boxShadow: isDark ? "0 8px 32px rgba(0,0,0,.4)" : "0 4px 24px rgba(0,0,0,.06)"
          }}>
            <div className="pd-img-wrap" style={{ borderRadius: 14, overflow: "hidden" }}>
              <img
                src={`/assets/img/${product.image}`} alt={product.name}
                style={{ width: "100%", display: "block", objectFit: "contain", maxHeight: 420 }}
                onError={e => { e.target.src = "https://placehold.co/600x420?text=No+Image"; }}
              />
            </div>
          </div>

          {/* Cột Thông tin */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{
              background: cardBg, borderRadius: 20, border: `1px solid ${cardBorder}`,
              padding: "28px 28px 24px",
              boxShadow: isDark ? "0 8px 32px rgba(0,0,0,.3)" : "0 4px 24px rgba(0,0,0,.05)"
            }}>
              
              <h1 style={{
                fontSize: "clamp(20px, 3vw, 28px)", fontWeight: "bold",
                margin: "0 0 16px", lineHeight: 1.3, color: textMain
              }}>
                {product.name}
              </h1>

              <p style={{ fontSize: 15, color: textSub, margin: "0 0 20px", lineHeight: 1.6 }}>
                {product.description}
              </p>

              {/* Giá */}
              <div style={{
                padding: "16px 20px", borderRadius: 14, marginBottom: 20,
                background: isDark ? "rgba(13,110,253,.08)" : "#eff6ff",
                border: `1.5px solid rgba(13,110,253,.2)`
              }}>
                <div style={{ fontSize: 11, color: "#0d6efd", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Giá bán
                </div>
                <div style={{ fontSize: 28, fontWeight: "bold", color: "#dc3545", lineHeight: 1.2 }}>
                  ${parseFloat(product.price)}
                </div>
              </div>

              {/* Nút thêm vào giỏ */}
              <button className="pd-btn-cart" onClick={handleAddToCart}>
                <ShoppingCart size={20} /> Thêm vào Giỏ hàng
              </button>

              {/* Badges tin tưởng */}
              <TrustBadges isDark={isDark} />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            STICKY TAB BAR
        ════════════════════════════════════════════════ */}
        <div
          ref={tabBarRef}
          className="pd-sticky-tabs"
          style={{
            background: isDark ? "rgba(15,17,23,.88)" : "rgba(244,246,251,.92)",
            borderBottom: `2px solid ${cardBorder}`,
            marginBottom: 24
          }}
        >
          <div style={{ display: "flex", gap: 0, maxWidth: 1200, margin: "0 auto" }}>
            {[
              hasArticle && { id: "article", label: "Mô tả sản phẩm", icon: <FileText size={15} /> },
              hasSpecs   && { id: "specs",   label: "Thông số kỹ thuật", icon: <Cpu size={15} /> },
            ].filter(Boolean).map(tab => (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "14px 22px", border: "none", cursor: "pointer",
                  background: "transparent",
                  fontWeight: "bold", fontSize: 14,
                  color: activeTab === tab.id ? "#0d6efd" : textSub,
                  borderBottom: activeTab === tab.id ? "3px solid #0d6efd" : "3px solid transparent",
                  marginBottom: -2, transition: "color .2s"
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            CONTENT AREA — Bài viết (trái) + Thông số (phải)
        ════════════════════════════════════════════════ */}
        <div style={{
          display: "grid", gap: 24, alignItems: "start",
          gridTemplateColumns: hasArticle && hasSpecs ? "minmax(0,8fr) minmax(0,4fr)" : "1fr",
        }}>

          {/* ── Cột Bài viết ─────────────────────────── */}
          {hasArticle && (
            <div ref={articleRef} className="pd-section">
              <div style={{
                background: cardBg, borderRadius: 20, border: `1px solid ${cardBorder}`,
                overflow: "hidden", boxShadow: isDark ? "0 8px 32px rgba(0,0,0,.3)" : "0 4px 24px rgba(0,0,0,.05)"
              }}>
                
                {/* 1. HEADER - Bấm để đóng/mở khối (Về còn mỗi tiêu đề) */}
                <div
                  onClick={() => {
                    setIsArticleOpen(!isArticleOpen);
                    // Nếu người dùng đóng khối lại, reset luôn trạng thái "Xem thêm" về mặc định
                    if (isArticleOpen) setIsReadMore(false);
                  }}
                  style={{
                    padding: "18px 24px", 
                    borderBottom: isArticleOpen ? `1px solid ${cardBorder}` : "none",
                    display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                    background: isDark ? "rgba(99,102,241,.08)" : "linear-gradient(135deg, #f8faff, #f0f4ff)",
                    transition: "background 0.2s"
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)"
                  }}>
                    <FileText size={16} color="white" />
                  </div>
                  <span 
                    title={article.title}
                    style={{ 
                      fontWeight: "bold", 
                      fontSize: 16, 
                      color: textMain,
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}
                  >
                    {article.title || "Mô tả sản phẩm"}
                  </span>

                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                    {article.ai_generated === 1 && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: "bold",
                        background: "rgba(99,102,241,.12)", color: "#6366f1", border: "1px solid rgba(99,102,241,.2)",
                        whiteSpace: "nowrap",
                        flexShrink: 0
                      }}>
                        <Sparkles size={11} /> Hỗ trợ bởi AI
                      </span>
                    )}
                    {/* Icon mũi tên xoay */}
                    <div style={{
                      transform: isArticleOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.3s ease", display: "flex"
                    }}>
                      <ChevronDown size={20} color={textSub} />
                    </div>
                  </div>
                </div>

                {/* 2. BODY CONTENT - Dùng Grid 0fr để thu gọn biến mất hoàn toàn khi tắt */}
                <div style={{
                  display: "grid",
                  gridTemplateRows: isArticleOpen ? "1fr" : "0fr",
                  transition: "grid-template-rows 0.35s ease-in-out"
                }}>
                  <div style={{ overflow: "hidden" }}>
                    
                    {/* KHU VỰC CHỨA BÀI VIẾT (Có logic Xem thêm 350px) */}
                    <div style={{ position: "relative" }}>
                      <div style={{ padding: "24px 28px 0" }}>
                        <div
                          className="pd-article"
                          style={{ 
                            color: isDark ? "#d1d5db" : "#374151",
                            maxHeight: isReadMore ? "5000px" : "350px", // 350px khi chưa xem thêm
                            overflow: "hidden", 
                            transition: "max-height 0.6s ease"
                          }}
                          dangerouslySetInnerHTML={{ __html: article.content }}
                        />
                      </div>

                      {/* Lớp phủ Gradient làm mờ chữ khi CHƯA mở rộng */}
                      {!isReadMore && (
                        <div style={{
                          position: "absolute", bottom: 0, left: 0, right: 0, height: "140px", pointerEvents: "none",
                          background: isDark ? "linear-gradient(to bottom, rgba(28,32,48,0), rgba(28,32,48,1))" : "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))"
                        }} />
                      )}
                    </div>

                    {/* 3. NÚT XEM THÊM / THU GỌN BÊN TRONG */}
                    <div style={{ padding: "16px 28px 24px", textAlign: "center", position: "relative", zIndex: 2 }}>
                      <button className="pd-btn-toggle" onClick={() => {
                        setIsReadMore(!isReadMore);
                        // Bấm "Thu gọn" thì cuộn trang về lại đúng đầu bài viết
                        if (isReadMore) scrollToSection("article");
                      }}>
                        {isReadMore ? <><ChevronUp size={15} /> Thu gọn nội dung</> : <><ChevronDown size={15} /> Xem thêm nội dung</>}
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── Cột Thông số kỹ thuật (Sticky) ──────── */}
          {hasSpecs && (
            <div ref={specsRef} className="pd-section" style={{ position: "sticky", top: 60 }}>
              <div style={{
                background: cardBg, borderRadius: 20, border: `1px solid ${cardBorder}`,
                overflow: "hidden", boxShadow: isDark ? "0 8px 32px rgba(0,0,0,.3)" : "0 4px 24px rgba(0,0,0,.05)"
              }}>
                <div style={{
                  padding: "18px 24px", borderBottom: `1px solid ${cardBorder}`,
                  display: "flex", alignItems: "center", gap: 10,
                  background: isDark ? "rgba(16,185,129,.06)" : "#f0fdf4"
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    background: "linear-gradient(135deg, #10b981, #059669)"
                  }}>
                    <Cpu size={16} color="white" />
                  </div>
                  <span style={{ fontWeight: "bold", fontSize: 16, color: textMain }}>
                    Thông số kỹ thuật
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: textSub }}>
                    {Object.keys(product.specs).length} thông số
                  </span>
                </div>

                <div>
                  {Object.entries(product.specs).map(([key, value], idx) => (
                    <div
                      key={key}
                      className="pd-spec-row"
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "13px 20px",
                        borderBottom: idx < Object.keys(product.specs).length - 1 ? `1px solid ${isDark ? "#2d3448" : "#f3f4f6"}` : "none"
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.4px", color: textSub, width: "42%" }}>
                        {key}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: "bold", color: textMain, textAlign: "right", width: "56%" }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{
                  padding: "14px 20px", background: isDark ? "rgba(16,185,129,.06)" : "#f0fdf4",
                  borderTop: `1px solid ${isDark ? "#2d3448" : "#d1fae5"}`,
                  display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#059669", fontWeight: "bold"
                }}>
                  <BadgeCheck size={16} /> Thông số từ nhà sản xuất chính hãng
                </div>
              </div>

              {/* Mini CTA */}
              <div style={{
                marginTop: 16, padding: "16px 20px",
                background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}`,
                boxShadow: isDark ? "0 4px 16px rgba(0,0,0,.2)" : "0 2px 12px rgba(0,0,0,.04)"
              }}>
                <button className="pd-btn-cart-sm" onClick={handleAddToCart}>
                  <ShoppingCart size={16} /> Thêm vào giỏ hàng
                </button>
              </div>
            </div>
          )}
        </div>

        {!hasArticle && !hasSpecs && (
          <div style={{ textAlign: "center", padding: "48px 0", color: textSub, fontSize: 14 }}>
            Sản phẩm chưa có mô tả chi tiết.
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetail;