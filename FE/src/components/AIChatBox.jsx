import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom"; 
import axios from "axios";

function AIChatBox() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // 1. Logic cuộn xuống (Giữ nguyên)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 2. Hook useEffect (Phải luôn được gọi, không được nằm sau lệnh return sớm)
  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen]);

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");

    try {
      const res = await axios.post("http://localhost:5000/api/ai/chat", {
        message: currentInput,
      });

      const aiMessage = {
        role: "assistant",
        text: res.data.reply,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Xin lỗi, tôi đang gặp chút sự cố kết nối." },
      ]);
    }
  };

  // --- ĐẶT LỆNH KIỂM TRA Ở ĐÂY (SAU TẤT CẢ CÁC HOOK) ---
  if (location.pathname === "/admin/chat") {
    return null;
  }
  // --------------------------------------------------

  return (
    <>
      <div className={`ai-chat-fab ${isOpen ? "active" : ""}`} onClick={toggleChat}>
        {isOpen ? "✕" : "🤖"}
      </div>

      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div className="ai-info">
              <div className="ai-avatar-status">🤖</div>
              <div>
                <div className="ai-name">AI Assistant</div>
                <div className="ai-status">Online</div>
              </div>
            </div>
          </div>

          <div className="ai-chat-body chat-scrollbar">
            {messages.length === 0 && (
              <div className="ai-welcome">
                <p>Chào bạn! Tôi là trợ lý AI. Bạn cần giúp gì không?</p>
              </div>
            )}
            {messages.map((msg, index) => (
              <div key={index} className={`msg-wrapper ${msg.role}`}>
                <div className="msg-bubble">{msg.text}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-footer">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Hỏi AI điều gì đó..."
            />
            <button onClick={sendMessage} disabled={!input.trim()}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default AIChatBox;