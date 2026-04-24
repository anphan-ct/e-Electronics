// BE/controllers/articleController.js

const db    = require("../config/db");
const axios = require("axios");

// ── Helper: Promise wrapper cho db.query ─────────────────────
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// ── Helper: Lấy tên danh mục theo category_id ────────────────
async function getCategoryName(categoryId) {
  if (!categoryId) return "Điện tử";
  const rows = await query("SELECT name FROM categories WHERE id = ?", [categoryId]);
  return rows[0]?.name || "Điện tử";
}

// ── Helper: Xây dựng Prompt gửi Gemini ───────────────────────
function buildPrompt(product, categoryName) {
  const specsText = product.specs && typeof product.specs === "object"
    ? Object.entries(product.specs)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")
    : "Không có thông số";

  return `Bạn là chuyên gia viết nội dung bán hàng điện tử cao cấp.
Hãy viết một bài viết giới thiệu sản phẩm CHI TIẾT và HẤP DẪN bằng tiếng Việt cho trang web thương mại điện tử.

THÔNG TIN SẢN PHẨM:
- Tên: ${product.name}
- Danh mục: ${categoryName}
- Giá: $${product.price}
- Mô tả ngắn: ${product.description || "Không có"}
- Thông số kỹ thuật:
${specsText}

YÊU CẦU BÀI VIẾT:
1. Viết bằng HTML thuần (dùng các thẻ h2, h3, p, ul, li, strong, em)
2. Độ dài: 600-900 từ
3. Cấu trúc gồm các phần:
   - Giới thiệu tổng quan hấp dẫn (1-2 đoạn)
   - Điểm nổi bật / Tại sao chọn sản phẩm này (3-5 điểm, dùng danh sách)
   - Phân tích thông số kỹ thuật chi tiết
   - Đối tượng phù hợp (ai nên mua sản phẩm này)
   - Kết luận + Kêu gọi hành động

QUAN TRỌNG:
- CHỈ dùng thông số kỹ thuật được cung cấp, KHÔNG được tự bịa thêm thông số
- Nếu thông số không đủ để nhận xét, hãy viết chung chung về lợi ích người dùng
- Giữ giọng văn chuyên nghiệp, nhiệt tình, thuyết phục
- Không bao gồm thẻ <html>, <head>, <body> - chỉ nội dung bên trong body
- Không dùng inline style

Ngoài nội dung HTML, hãy trả về JSON theo định dạng sau (bọc trong ---JSON--- ... ---END---)  :
---JSON---
{
  "title": "Tiêu đề bài viết (50-80 ký tự)",
  "seo_desc": "Mô tả SEO ngắn gọn (120-160 ký tự)"
}
---END---`;
}

// ── Helper: Parse response từ Gemini ─────────────────────────
function parseGeminiResponse(rawText) {
  let title    = "";
  let seoDesc  = "";
  let content  = rawText;

  // Tách phần JSON metadata ra
  const jsonMatch = rawText.match(/---JSON---([\s\S]*?)---END---/);
  if (jsonMatch) {
    try {
      const meta = JSON.parse(jsonMatch[1].trim());
      title   = meta.title   || "";
      seoDesc = meta.seo_desc || "";
    } catch { /* Bỏ qua lỗi parse */ }
    // Xoá phần JSON khỏi content
    content = rawText.replace(/---JSON---([\s\S]*?)---END---/, "").trim();
  }

  // Dọn dẹp content: bỏ markdown code block nếu Gemini lỡ sinh ra
  content = content
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/,      "")
    .replace(/```\s*$/,      "")
    .trim();

  return { title, seoDesc, content };
}

// ════════════════════════════════════════════════════════════
// POST /api/articles/generate
// Admin yêu cầu AI tạo bài viết → lưu dạng draft
// ════════════════════════════════════════════════════════════
exports.generateArticle = async (req, res) => {
  const { productId } = req.body;
  const adminId = req.user.id;

  if (!productId) {
    return res.status(400).json({ message: "Thiếu productId" });
  }

  try {
    // 1. Lấy thông tin sản phẩm từ DB
    const [product] = await query("SELECT * FROM products WHERE id = ?", [productId]);
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    // Parse specs nếu là string
    if (product.specs && typeof product.specs === "string") {
      try { product.specs = JSON.parse(product.specs); } catch { product.specs = {}; }
    }

    // 2. Lấy tên danh mục
    const categoryName = await getCategoryName(product.category_id);

    // 3. Gọi Gemini API
    const prompt = buildPrompt(product, categoryName);
    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      }
    );

    const rawText = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!rawText) {
      return res.status(500).json({ message: "AI không trả về nội dung" });
    }

    // 4. Parse kết quả
    const { title, seoDesc, content } = parseGeminiResponse(rawText);

    // 5. Lưu vào DB với status = 'draft'
    // Nếu đã có draft cho sản phẩm này → tạo thêm (cho phép nhiều draft)
    const insertResult = await query(
      `INSERT INTO product_articles 
         (product_id, title, content, seo_desc, status, ai_generated, created_by)
       VALUES (?, ?, ?, ?, 'draft', 1, ?)`,
      [productId, title || `Giới thiệu ${product.name}`, content, seoDesc, adminId]
    );

    res.status(201).json({
      message: "AI đã tạo bài viết thành công! Hãy kiểm duyệt trước khi xuất bản.",
      articleId: insertResult.insertId,
      article: {
        id:           insertResult.insertId,
        product_id:   productId,
        title:        title || `Giới thiệu ${product.name}`,
        content,
        seo_desc:     seoDesc,
        status:       "draft",
        ai_generated: 1,
        created_at:   new Date(),
      }
    });

  } catch (err) {
    console.error("[ARTICLE] generateArticle error:", err.message);
    const status = err.response?.status;
    if (status === 429) {
      return res.status(429).json({ message: "AI đang bận, vui lòng thử lại sau vài giây." });
    }
    res.status(500).json({ message: "Lỗi server khi tạo bài viết AI", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/articles/product/:productId
// Lấy tất cả bài viết của 1 sản phẩm (Admin xem)
// ════════════════════════════════════════════════════════════
exports.getArticlesByProduct = async (req, res) => {
  const { productId } = req.params;
  try {
    const rows = await query(
      `SELECT pa.*, u.name as creator_name, pu.name as publisher_name
       FROM product_articles pa
       LEFT JOIN users u  ON pa.created_by   = u.id
       LEFT JOIN users pu ON pa.published_by = pu.id
       WHERE pa.product_id = ?
       ORDER BY pa.created_at DESC`,
      [productId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/articles/:id
// Lấy chi tiết 1 bài viết (Admin)
// ════════════════════════════════════════════════════════════
exports.getArticleById = async (req, res) => {
  const { id } = req.params;
  try {
    const [article] = await query(
      `SELECT pa.*, u.name as creator_name, pu.name as publisher_name,
              p.name as product_name
       FROM product_articles pa
       LEFT JOIN users    u  ON pa.created_by   = u.id
       LEFT JOIN users    pu ON pa.published_by = pu.id
       LEFT JOIN products p  ON pa.product_id   = p.id
       WHERE pa.id = ?`,
      [id]
    );
    if (!article) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    res.json(article);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
// PUT /api/articles/:id
// Admin cập nhật nội dung bài viết (chỉnh sửa thủ công)
// ════════════════════════════════════════════════════════════
exports.updateArticle = async (req, res) => {
  const { id } = req.params;
  const { title, content, seo_desc } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: "Tiêu đề và nội dung không được để trống" });
  }

  try {
    const [existing] = await query("SELECT id FROM product_articles WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    await query(
      "UPDATE product_articles SET title=?, content=?, seo_desc=? WHERE id=?",
      [title, content, seo_desc || null, id]
    );
    res.json({ message: "Cập nhật bài viết thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
// PUT /api/articles/:id/publish
// Admin xuất bản bài viết (draft → published)
// Khi xuất bản, nếu sản phẩm đã có bài published khác → đưa về draft
// ════════════════════════════════════════════════════════════
exports.publishArticle = async (req, res) => {
  const { id }    = req.params;
  const adminId   = req.user.id;

  try {
    const [article] = await query(
      "SELECT id, product_id, status FROM product_articles WHERE id = ?",
      [id]
    );
    if (!article) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    if (article.status === "published") {
      return res.status(400).json({ message: "Bài viết đã được xuất bản rồi" });
    }

    // Đưa bài published hiện tại (nếu có) của sản phẩm về draft
    await query(
      `UPDATE product_articles 
       SET status='draft', published_by=NULL, published_at=NULL
       WHERE product_id=? AND status='published' AND id != ?`,
      [article.product_id, id]
    );

    // Xuất bản bài này
    await query(
      `UPDATE product_articles 
       SET status='published', published_by=?, published_at=NOW()
       WHERE id=?`,
      [adminId, id]
    );

    res.json({ message: "Xuất bản bài viết thành công! Bài viết đã hiển thị công khai." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
// PUT /api/articles/:id/unpublish
// Admin gỡ bài viết (published → draft)
// ════════════════════════════════════════════════════════════
exports.unpublishArticle = async (req, res) => {
  const { id } = req.params;
  try {
    const [article] = await query(
      "SELECT id, status FROM product_articles WHERE id = ?",
      [id]
    );
    if (!article) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    await query(
      "UPDATE product_articles SET status='draft', published_by=NULL, published_at=NULL WHERE id=?",
      [id]
    );
    res.json({ message: "Đã gỡ bài viết về trạng thái nháp" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
// DELETE /api/articles/:id
// Admin xoá bài viết
// ════════════════════════════════════════════════════════════
exports.deleteArticle = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query("DELETE FROM product_articles WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }
    res.json({ message: "Xoá bài viết thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/articles/public/:productId
// Lấy bài viết PUBLISHED của sản phẩm (User xem – Public)
// ════════════════════════════════════════════════════════════
exports.getPublicArticle = async (req, res) => {
  const { productId } = req.params;
  try {
    const [article] = await query(
      `SELECT id, title, content, seo_desc, ai_generated, published_at
       FROM product_articles
       WHERE product_id = ? AND status = 'published'
       ORDER BY published_at DESC
       LIMIT 1`,
      [productId]
    );
    // Trả về null nếu chưa có bài published (không phải lỗi)
    res.json(article || null);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/articles/admin/all
// Admin xem tất cả bài viết của mọi sản phẩm (tổng quan)
// ════════════════════════════════════════════════════════════
exports.adminGetAllArticles = async (req, res) => {
  const { status, search } = req.query;
  try {
    let sql = `
      SELECT pa.id, pa.title, pa.status, pa.ai_generated,
             pa.created_at, pa.published_at,
             p.id as product_id, p.name as product_name, p.image as product_image,
             u.name as creator_name
      FROM product_articles pa
      LEFT JOIN products p ON pa.product_id = p.id
      LEFT JOIN users    u ON pa.created_by  = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== "all") {
      sql += " AND pa.status = ?";
      params.push(status);
    }
    if (search) {
      sql += " AND (pa.title LIKE ? OR p.name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY pa.updated_at DESC";

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};