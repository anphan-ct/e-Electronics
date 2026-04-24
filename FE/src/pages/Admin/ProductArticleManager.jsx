// FE/src/pages/Admin/ProductArticleManager.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Sparkles, FileText, Eye, EyeOff, Trash2, Edit3,
  CheckCircle, Clock, Globe, Save, X, Loader2,
  ChevronDown, ChevronUp, Bot, User, RefreshCw,
  AlertTriangle
} from "lucide-react";

import "../../ProductArticleManager.css";

const API  = "http://localhost:5000/api/articles";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

// ── Hiển thị badge trạng thái ──────────────────────────────
function ArticleStatusBadge({ status }) {
  if (status === "published") {
    return (
      <span className="pam-badge pam-badge-published">
        <Globe size={11} /> Đã xuất bản
      </span>
    );
  }
  return (
    <span className="pam-badge pam-badge-draft">
      <Clock size={11} /> Bản nháp
    </span>
  );
}

// ── Editor Modal: Admin chỉnh sửa nội dung bài viết ─────────
function ArticleEditorModal({ article, onClose, onSaved, isDark }) {
  const [title,   setTitle]   = useState(article.title   || "");
  const [content, setContent] = useState(article.content || "");
  const [seoDesc, setSeoDesc] = useState(article.seo_desc || "");
  const [saving,  setSaving]  = useState(false);
  const [preview, setPreview] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      return toast.error("Tiêu đề và nội dung không được để trống");
    }
    setSaving(true);
    try {
      await axios.put(
        `${API}/${article.id}`,
        { title, content, seo_desc: seoDesc },
        { headers: auth() }
      );
      toast.success("Đã lưu bài viết!");
      onSaved({ ...article, title, content, seo_desc: seoDesc });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`pam-modal-overlay ${isDark ? "pam-dark" : ""}`}>
      <div className="pam-modal-box">
        {/* Header */}
        <div className="pam-modal-header">
          <div className="pam-modal-title-wrap">
            <div className="pam-modal-icon-gradient">
              <Edit3 size={18} color="white" />
            </div>
            <div>
              <div className="pam-modal-title">Chỉnh sửa bài viết</div>
              {article.ai_generated ? (
                <div className="pam-modal-subtitle pam-text-purple">
                  <Bot size={11} /> Nội dung gốc do AI tạo
                </div>
              ) : (
                <div className="pam-modal-subtitle pam-text-gray">
                  <User size={11} /> Nội dung thủ công
                </div>
              )}
            </div>
          </div>
          <div className="pam-header-actions">
            <button
              onClick={() => setPreview(!preview)}
              className={`pam-btn-preview ${preview ? "active" : ""}`}
            >
              <Eye size={14} /> {preview ? "Chỉnh sửa" : "Xem trước"}
            </button>
            <button onClick={onClose} className="pam-btn-icon-base">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="pam-modal-body">
          {/* Tiêu đề */}
          <div className="pam-form-group">
            <label className="pam-label">Tiêu đề bài viết *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề hấp dẫn..."
              className="pam-input"
            />
          </div>

          {/* SEO */}
          <div className="pam-form-group">
            <label className="pam-label">Mô tả SEO (120-160 ký tự)</label>
            <input
              type="text"
              value={seoDesc}
              onChange={e => setSeoDesc(e.target.value)}
              maxLength={160}
              placeholder="Mô tả ngắn hiển thị trên Google..."
              className="pam-input pam-input-sm"
            />
            <div className="pam-hint">{seoDesc.length}/160 ký tự</div>
          </div>

          {/* Nội dung */}
          <div className="pam-form-group" style={{ marginBottom: 20 }}>
            <label className="pam-label">Nội dung HTML *</label>

            {preview ? (
              <div className="pam-editor-preview">
                <div
                  className="article-preview-content"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            ) : (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="<h2>Giới thiệu sản phẩm</h2><p>Nội dung...</p>"
                rows={16}
                className="pam-textarea"
              />
            )}
            <div className="pam-hint">
               Bạn đang nhập HTML trực tiếp. Nội dung sẽ được render đúng trên trang web.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pam-modal-footer">
          <button onClick={onClose} className="pam-btn-cancel">Hủy</button>
          <button onClick={handleSave} disabled={saving} className="pam-btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
export default function ProductArticleManager({ productId, productName, isDark }) {
  const [articles,       setArticles]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [generating,     setGenerating]     = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [expanded,       setExpanded]       = useState(true);
  const [actionLoading,  setActionLoading]  = useState(null);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/product/${productId}`, { headers: auth() });
      setArticles(res.data);
    } catch {
      toast.error("Không thể tải danh sách bài viết");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) fetchArticles();
  }, [productId]);

  const handleGenerate = async () => {
    if (!window.confirm(`AI sẽ tạo bài viết cho "${productName}".\nTiếp tục?`)) return;
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/generate`, { productId }, { headers: auth() });
      toast.success(res.data.message);
      setArticles(prev => [res.data.article, ...prev]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi khi tạo bài viết AI");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (article) => {
    if (!window.confirm(`Xuất bản bài "${article.title}"?`)) return;
    setActionLoading(article.id);
    try {
      await axios.put(`${API}/${article.id}/publish`, {}, { headers: auth() });
      toast.success("Xuất bản thành công!");
      setArticles(prev => prev.map(a => ({
        ...a,
        status:       a.id === article.id ? "published" : (a.status === "published" ? "draft" : a.status),
        published_at: a.id === article.id ? new Date().toISOString() : a.published_at,
      })));
    } catch (err) {
      toast.error(err.response?.data?.message || "Xuất bản thất bại");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnpublish = async (article) => {
    if (!window.confirm("Gỡ bài viết về trạng thái nháp?")) return;
    setActionLoading(article.id);
    try {
      await axios.put(`${API}/${article.id}/unpublish`, {}, { headers: auth() });
      toast.success("Đã gỡ bài viết về nháp");
      setArticles(prev => prev.map(a =>
        a.id === article.id ? { ...a, status: "draft", published_at: null } : a
      ));
    } catch (err) {
      toast.error("Gỡ bài thất bại");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (article) => {
    if (!window.confirm(`Xoá bài viết "${article.title}"?`)) return;
    setActionLoading(article.id);
    try {
      await axios.delete(`${API}/${article.id}`, { headers: auth() });
      toast.success("Đã xoá bài viết");
      setArticles(prev => prev.filter(a => a.id !== article.id));
    } catch (err) {
      toast.error("Xoá thất bại");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaved = (updated) => {
    setArticles(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
  };

  const publishedCount = articles.filter(a => a.status === "published").length;
  const draftCount     = articles.filter(a => a.status === "draft").length;

  return (
    <div className={isDark ? "pam-dark" : ""}>
      {/* ── PANEL BÀI VIẾT ───────────────────────────────── */}
      <div className="pam-main-panel">
        {/* Header */}
        <div
          onClick={() => setExpanded(!expanded)}
          className={`pam-panel-header ${expanded ? "expanded" : ""}`}
        >
          <div className="pam-modal-title-wrap">
            <div className="pam-modal-icon-gradient">
              <FileText size={20} color="white" />
            </div>
            <div>
              <div className="pam-panel-title">Bài viết sản phẩm</div>
              <div className="pam-text-gray" style={{ fontSize: 12, marginTop: 2 }}>
                {articles.length > 0
                  ? `${publishedCount} đã xuất bản · ${draftCount} nháp`
                  : "Chưa có bài viết nào"
                }
              </div>
            </div>
          </div>

          <div className="pam-header-actions">
            <button
              onClick={e => { e.stopPropagation(); handleGenerate(); }}
              disabled={generating}
              className="pam-btn-generate"
            >
              {generating
                ? <><Loader2 size={14} className="animate-spin" /> Đang tạo...</>
                : <><Sparkles size={14} /> Dùng AI Viết Bài</>
              }
            </button>

            <button
              onClick={e => { e.stopPropagation(); fetchArticles(); }}
              className="pam-btn-icon-base"
            >
              <RefreshCw size={15} />
            </button>
            {expanded ? <ChevronUp size={18} className="pam-text-gray" /> : <ChevronDown size={18} className="pam-text-gray" />}
          </div>
        </div>

        {/* Body */}
        {expanded && (
          <div className="pam-modal-body">
            {/* Generating skeleton */}
            {generating && (
              <div className="pam-generating-box">
                <div className="pam-modal-icon-gradient" style={{ width: 44, height: 44, justifyContent: 'center' }}>
                  <Sparkles size={20} color="white" />
                </div>
                <div>
                  <div className="pam-generating-title">AI đang phân tích thông số và viết bài...</div>
                  <div className="pam-generating-desc">Gemini đang đọc thông số kỹ thuật và tạo nội dung.</div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && articles.length === 0 && !generating && (
              <div className="pam-empty-state">
                <div className="pam-empty-icon">
                  <FileText size={30} className="pam-text-gray" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Chưa có bài viết nào</div>
                <div style={{ fontSize: 13, marginBottom: 20 }}>
                  Nhấn nút <strong> <Sparkles size={14} />  Dùng AI Viết Bài</strong> để tạo nội dung tự động<br />
                  hoặc tạo bài viết thủ công.
                </div>
                <div className="pam-warning-box">
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div className="pam-warning-text">
                      <strong>Lưu ý:</strong> AI tạo bài theo quy trình an toàn - bài mới tạo sẽ ở trạng thái <strong>Nháp</strong>. 
                      Admin cần kiểm tra nội dung trước khi nhấn <strong>Xuất bản</strong>.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: "center", padding: "32px 0" }} className="pam-text-gray">
                <Loader2 size={28} className="animate-spin" color="#6366f1" style={{ marginBottom: 8, margin: "0 auto" }} />
                <div style={{ fontSize: 13 }}>Đang tải bài viết...</div>
              </div>
            )}

            {/* Danh sách bài viết */}
            {!loading && articles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                actionLoading={actionLoading}
                onEdit={() => setEditingArticle(article)}
                onPublish={() => handlePublish(article)}
                onUnpublish={() => handleUnpublish(article)}
                onDelete={() => handleDelete(article)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal chỉnh sửa */}
      {editingArticle && (
        <ArticleEditorModal
          article={editingArticle}
          isDark={isDark}
          onClose={() => setEditingArticle(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ── Card từng bài viết ──────────────────────────────────────
function ArticleCard({ article, actionLoading, onEdit, onPublish, onUnpublish, onDelete }) {
  const [showPreview, setShowPreview] = useState(false);
  const isProcessing = actionLoading === article.id;
  const isPublished = article.status === "published";

  return (
    <div className={`pam-card ${isPublished ? "published" : ""}`}>
      {/* Card Header */}
      <div className="pam-card-header">
        <div className={`pam-card-avatar ${article.ai_generated ? "ai" : "user"}`}>
          {article.ai_generated
            ? <Sparkles size={16} color="white" />
            : <User size={16} className="pam-text-gray" />
          }
        </div>

        <div className="pam-card-info">
          <div className="pam-card-tags">
            <ArticleStatusBadge status={article.status} />
            {article.ai_generated && (
              <span className="pam-tag-ai">
                <Bot size={10} /> AI Generated
              </span>
            )}
          </div>

          <div className="pam-card-title">{article.title}</div>

          <div className="pam-card-meta">
            Tạo: {new Date(article.created_at).toLocaleDateString("vi-VN")}
            {article.creator_name && ` bởi ${article.creator_name}`}
            {article.published_at && (
              <> · Xuất bản: {new Date(article.published_at).toLocaleDateString("vi-VN")}</>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="pam-card-actions">
          <button
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? "Ẩn nội dung" : "Xem nội dung"}
            className="pam-btn-icon-base" style={{ width: 32, height: 32 }}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

          <button onClick={onEdit} title="Chỉnh sửa" disabled={isProcessing} className="pam-action-btn pam-btn-edit">
            <Edit3 size={14} />
          </button>

          {article.status === "draft" ? (
            <button onClick={onPublish} title="Xuất bản" disabled={isProcessing} className="pam-action-btn pam-btn-publish">
              {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle size={13} /> Xuất bản</>}
            </button>
          ) : (
            <button onClick={onUnpublish} title="Gỡ xuất bản" disabled={isProcessing} className="pam-action-btn pam-btn-unpublish">
              {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <><EyeOff size={13} /> Gỡ bài</>}
            </button>
          )}

          <button onClick={onDelete} title="Xoá" disabled={isProcessing} className="pam-action-btn pam-btn-delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Preview nội dung */}
      {showPreview && (
        <div className="pam-card-preview">
          <div className="pam-preview-content">
            <div className="article-preview-content" dangerouslySetInnerHTML={{ __html: article.content }} />
          </div>
        </div>
      )}
    </div>
  );
}