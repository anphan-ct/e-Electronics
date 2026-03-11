import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";

function UserProfile() {
  const { theme } = useContext(ThemeContext);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const res = await axios.get("http://localhost:5000/api/auth/profile", {
          headers: { Authorization: token } 
        });
        setUser(res.data);
      } catch (err) {
        setError(true);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
      }
    };
    fetchProfile();
  }, [navigate]);

  if (error) return (
    <div className={`container py-5 text-center ${theme === "dark" ? "text-light" : ""}`}>
      <div className="alert alert-danger d-inline-block px-5 shadow-sm rounded-4">
        Lỗi tải dữ liệu. Vui lòng đăng nhập lại.
      </div>
    </div>
  );
  
  if (!user) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" role="status"></div>
    </div>
  );

  return (
    <div className={`container py-5 min-vh-100 ${theme === "dark" ? "text-light" : "text-dark"}`}>
      <div className="row g-5">
        
        {/* SIDEBAR: Thông tin cơ bản */}
        <div className="col-md-4">
          <div className={`card shadow-lg p-4 text-center auth-modal-content h-100 border ${
            theme === "dark" ? "bg-dark border-secondary" : "bg-white border-light-subtle"
          }`} style={{ borderRadius: '25px' }}>
            
            <div className="mb-4 position-relative d-inline-block mx-auto">
              <img 
                src={`https://ui-avatars.com/api/?name=${user.name}&background=0D6EFD&color=fff&size=128`} 
                className="rounded-circle shadow-sm border border-4 border-white" 
                alt="avatar" 
                style={{ width: '120px' }}
              />
              <div className="position-absolute bottom-0 end-0 bg-success border border-3 border-white rounded-circle" style={{ width: '22px', height: '22px' }}></div>
            </div>
            
            <h4 className="fw-bold mb-1">{user.name}</h4>
            <p className={theme === 'dark' ? 'text-white-50' : 'text-muted'}>{user.email}</p>
            <span className="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill text-uppercase mb-4" style={{ fontSize: '12px' }}>
              {user.role}
            </span>
            
            <div className="list-group list-group-flush text-start rounded-4 overflow-hidden border-top pt-3">
              <button 
                className={`list-group-item list-group-item-action border-0 py-3 fw-bold d-flex align-items-center rounded-3 mb-2 transition-all ${
                  activeTab === "info" ? "bg-primary text-white shadow" : (theme === "dark" ? "bg-dark text-light" : "bg-white text-dark")
                }`}
                onClick={() => setActiveTab("info")}
              >
                <span className="me-2">👤</span> Thông tin cá nhân
              </button>
              <button 
                className={`list-group-item list-group-item-action border-0 py-3 fw-bold d-flex align-items-center rounded-3 transition-all ${
                  activeTab === "orders" ? "bg-primary text-white shadow" : (theme === "dark" ? "bg-dark text-light" : "bg-white text-dark")
                }`}
                onClick={() => setActiveTab("orders")}
              >
                <span className="me-2">📦</span> Lịch sử mua hàng
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT AREA: Chi tiết hồ sơ */}
        <div className="col-md-8">
          <div className={`card shadow-lg p-5 h-100 auth-modal-content border ${
            theme === "dark" ? "bg-dark border-secondary" : "bg-white border-light-subtle"
          }`} style={{ borderRadius: '25px' }}>
            
            {activeTab === "info" ? (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-5">
                  <h3 className="fw-bold mb-0">Chi tiết tài khoản</h3>
                  <div className="btn-auth-gradient p-1 rounded-circle" style={{ width: '10px', height: '10px' }}></div>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Họ và tên", value: user.name },
                    { label: "Địa chỉ Email", value: user.email },
                    { label: "Ngày tham gia", value: new Date(user.created_at).toLocaleDateString('vi-VN') }
                  ].map((item, idx) => (
                    <div key={idx} className={`row py-4 border-bottom ${theme === 'dark' ? 'border-secondary' : 'border-light'}`}>
                      <div className={`col-sm-4 fw-bold ${theme === 'dark' ? 'text-white-50' : 'text-muted'}`}>
                        {item.label}:
                      </div>
                      <div className="col-sm-8 fs-5 fw-semibold text-primary">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-3">
                  <button className="btn btn-auth-gradient px-5 py-3 fw-bold shadow-lg text-uppercase tracking-wider">
                    CHỈNH SỬA HỒ SƠ
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-5">
                <div className="fs-1 mb-3 opacity-25">📦</div>
                <h5 className={theme === 'dark' ? 'text-white-50' : 'text-muted'}>Bạn chưa có đơn hàng nào.</h5>
                <p className="small mb-4 text-secondary">Hãy bắt đầu khám phá các sản phẩm tuyệt vời của chúng tôi!</p>
                <a href="/shop" className="btn btn-outline-primary px-4 rounded-pill fw-bold">Mua sắm ngay</a>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default UserProfile;