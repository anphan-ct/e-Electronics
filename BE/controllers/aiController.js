const db = require("../config/db");
const { askGemini } = require("../services/geminiService");

exports.chatWithAI = async (req, res) => {

  try {

    const { message, conversation_id } = req.body;

    console.log("User message:", message);

    //Lấy sản phẩm từ database
    const [products] = await db.promise().query(
      "SELECT name, price, description FROM products LIMIT 20"
    );

    //Chuyển dữ liệu sản phẩm thành text để đưa vào AI
    let productContext = "";

    products.forEach((product) => {

      productContext += `
Tên: ${product.name}
Giá: ${product.price} VND
Mô tả: ${product.description}

`;

    });

    //Tạo prompt cho AI
    const prompt = `
Bạn là chatbot tư vấn bán hàng cho website điện tử.

Danh sách sản phẩm trong cửa hàng:

${productContext}

Khách hàng hỏi:
${message}

Yêu cầu:
- Nếu câu hỏi liên quan sản phẩm, hãy gợi ý sản phẩm phù hợp.
- Nếu không có trong danh sách, hãy trả lời bằng kiến thức của bạn.
- Trả lời tự nhiên, thân thiện như nhân viên bán hàng.
`;

    //Gửi prompt cho Gemini
    const aiReply = await askGemini(prompt);

    console.log("AI reply:", aiReply);

    //Trả kết quả
    res.json({
      reply: aiReply
    });

  } catch (error) {

    console.error("AI Controller Error:", error);

    res.status(500).json({
      error: error.message
    });

  }

};