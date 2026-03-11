const db = require("../config/db");
const { askGemini } = require("../services/geminiService");

exports.chatWithAI = async (req, res) => {

  try {

    const { message, conversation_id } = req.body;

    console.log("User message:", message);//

    const aiReply = await askGemini(message);

    console.log("AI reply:", aiReply);//

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