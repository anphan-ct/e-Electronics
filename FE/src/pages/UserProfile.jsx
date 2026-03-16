import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { User, Mail, Calendar, ShoppingBag, UserCircle, Edit3, ChevronRight } from "lucide-react";

function UserProfile() {
  const { theme } = useContext(ThemeContext);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  // --- GIỮ NGUYÊN LOGIC XỬ LÝ ---
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/"); return; }
      try {
        const res = await axios.get("http://localhost:5000/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` } 
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
      <div className="row g-4">
        
        {/* SIDEBAR: Thiết kế theo dạng Card nổi bật */}
        <div className="col-lg-4">
          <div className={`card border-0 shadow-lg p-4 text-center h-100 ${
            theme === "dark" ? "bg-dark border border-secondary" : "bg-white"
          }`} style={{ borderRadius: '25px' }}>
            
            <div className="mb-4 position-relative d-inline-block mx-auto">
              <div className="p-1 rounded-circle" style={{ background: 'linear-gradient(135deg, #21d4fd 0%, #b721ff 100%)' }}>
                <img 
                  src={`https://ui-avatars.com/api/?name=${user.name}&background=fff&color=0D6EFD&size=128`} 
                  className="rounded-circle border border-4 border-white shadow-sm" 
                  alt="avatar" 
                  style={{ width: '110px', height: '110px' }}
                />
              </div>
              <div className="position-absolute bottom-0 end-0 bg-success border border-3 border-white rounded-circle shadow-sm" style={{ width: '24px', height: '24px' }}></div>
            </div>
            
            <h4 className="fw-bold mb-1">{user.name}</h4>
            <p className={`mb-3 ${theme === 'dark' ? 'text-white-50' : 'text-muted'}`}>{user.email}</p>
            
            <div className="d-flex justify-content-center gap-2 mb-4">
               <span className="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '1px' }}>
                {user.role} Member
              </span>
            </div>
            
            <div className="nav flex-column gap-2 mt-2">
              <button 
                className={`nav-link border-0 py-3 px-4 fw-bold d-flex align-items-center justify-content-between rounded-4 transition-all ${
                  activeTab === "info" ? "btn-auth-gradient text-white shadow-lg" : (theme === "dark" ? "text-light hover-dark" : "text-dark hover-light border")
                }`}
                onClick={() => setActiveTab("info")}
              >
                <div className="d-flex align-items-center">
                    <UserCircle size={20} className="me-3" /> Thông tin cá nhân
                </div>
                <ChevronRight size={16} opacity={0.5} />
              </button>

              <button 
                className={`nav-link border-0 py-3 px-4 fw-bold d-flex align-items-center justify-content-between rounded-4 transition-all ${
                  activeTab === "orders" ? "btn-auth-gradient text-white shadow-lg" : (theme === "dark" ? "text-light hover-dark" : "text-dark hover-light border")
                }`}
                onClick={() => setActiveTab("orders")}
              >
                <div className="d-flex align-items-center">
                    <ShoppingBag size={20} className="me-3" /> Lịch sử mua hàng
                </div>
                <ChevronRight size={16} opacity={0.5} />
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT AREA: Hiển thị chi tiết mượt mà */}
        <div className="col-lg-8">
          <div className={`card border-0 shadow-lg p-4 p-md-5 h-100 ${
            theme === "dark" ? "bg-dark border border-secondary" : "bg-white"
          }`} style={{ borderRadius: '25px' }}>
            
            {activeTab === "info" ? (
              <div className="animate-fade-in">
                <div className="d-flex align-items-center gap-3 mb-5">
                  <div className="btn-auth-gradient p-3 rounded-4 shadow-sm">
                    <User size={24} color="white" />
                  </div>
                  <h3 className="fw-bold mb-0">Hồ sơ cá nhân</h3>
                </div>

                <div className="row g-4">
                  {[
                    { icon: <User size={20} />, label: "Họ và tên", value: user.name, color: "#0d6efd" },
                    { icon: <Mail size={20} />, label: "Địa chỉ Email", value: user.email, color: "#6610f2" },
                    { icon: <Calendar size={20} />, label: "Ngày tham gia", value: new Date(user.created_at).toLocaleDateString('vi-VN'), color: "#fd7e14" }
                  ].map((item, idx) => (
                    <div key={idx} className="col-12">
                      <div className={`p-4 rounded-4 border transition-all ${
                        theme === 'dark' ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light border-light-subtle'
                      } hover-lift`}>
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-2 rounded-3 bg-white shadow-sm" style={{ color: item.color }}>
                            {item.icon}
                          </div>
                          <div>
                            <small className={`d-block text-uppercase fw-bold opacity-50 mb-1`} style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                                {item.label}
                            </small>
                            <div className="fs-5 fw-bold">{item.value}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 d-flex flex-wrap gap-3">
                  <button className="btn btn-auth-gradient px-5 py-3 fw-bold shadow-lg d-flex align-items-center gap-2 rounded-pill transition-all hover-lift">
                    <Edit3 size={18} /> CHỈNH SỬA HỒ SƠ
                  </button>
                  <button className="btn btn-outline-secondary px-4 py-3 rounded-pill fw-bold border-2">
                    Đổi mật khẩu
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-5 animate-fade-in">
                <div className="display-1 mb-4 opacity-25">📦</div>
                <h4 className="fw-bold">Đơn hàng trống</h4>
                <p className={`mb-4 px-md-5 ${theme === 'dark' ? 'text-white-50' : 'text-muted'}`}>
                  Bạn chưa thực hiện giao dịch nào trên MyShop. Hãy bắt đầu trải nghiệm mua sắm những sản phẩm công nghệ tuyệt vời ngay!
                </p>                
                <button onClick={() => navigate("/shop")} className="btn btn-auth-gradient px-5 py-3 rounded-pill fw-bold shadow-lg">
                  KHÁM PHÁ CỬA HÀNG
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default UserProfile;