const db = require('../config/db');

exports.getProducts = (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const formatted = results.map(p => ({
            ...p,
            specs: p.specs ? JSON.parse(p.specs) : {}
        }));
        res.json(formatted);
    });
};

exports.getProductById = (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: 'Không tìm thấy' });

        const product = results[0];
        product.specs = product.specs ? JSON.parse(product.specs) : {};
        res.json(product);
    });
};

exports.searchProducts = (req, res) => {
    const searchQuery = req.query.q || '';
    
    // Chỉ thực hiện truy vấn nếu có từ khóa để tiết kiệm tài nguyên
    if (!searchQuery.trim()) {
        return res.status(200).json([]);
    }

    const query = `
        SELECT * FROM products 
        WHERE name LIKE ? 
        LIMIT 20
    `;
    const values = [`%${searchQuery}%`];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error("Lỗi tìm kiếm sản phẩm:", err);
            return res.status(500).json({ message: "Lỗi server khi tìm kiếm sản phẩm" });
        }
        
        const formatted = results.map(p => ({
            ...p,
            specs: p.specs ? JSON.parse(p.specs) : {}
        }));

        res.status(200).json(formatted);
    });
};