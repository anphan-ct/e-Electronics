import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { User, ShoppingBag, UserCircle, Edit3, Save, X, Lock, ShieldCheck, Eye, EyeOff, Star } from "lucide-react";
import { toast } from "react-toastify";

function UserProfile() {
  const { theme } = useContext(ThemeContext);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);

  // --- TRẠNG THÁI MỚI CHO ĐỔI MẬT KHẨU ---
  const [showPassModal, setShowPassModal] = useState(false);
  const [passData, setPassData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/"); return; }
      try {
        const res = await axios.get("http://localhost:5000/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
        setEditData({ name: res.data.name, email: res.data.email });
      } catch (err) {
        setError(true);
        navigate("/");
      }
    };
    fetchProfile();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();
    }
  }, [activeTab]);

  const groupOrders = (data) => {
    const result = {};

    data.forEach(item => {
      if (!result[item.order_id]) {
        result[item.order_id] = {
          id: item.order_id,
          created_at: item.created_at,
          status: item.status,
          payment_status: item.payment_status,
          total: item.total,
          items: []
        };
      }

      result[item.order_id].items.push({
        name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        image: item.image
      });
    });

    return Object.values(result);
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    const token = localStorage.getItem("token");

    try {
      const res = await axios.get("http://localhost:5000/api/orders/my-orders", {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOrders(groupOrders(res.data));
    } catch (err) {
      toast.error("Không tải được đơn hàng");
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.put("http://localhost:5000/api/auth/update-profile", editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser({ ...user, ...editData });
      const currentUser = JSON.parse(localStorage.getItem("user"));
      localStorage.setItem("user", JSON.stringify({ ...currentUser, ...editData }));
      window.dispatchEvent(new Event("storage"));
      toast.success(res.data.message);
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  // --- LOGIC XỬ LÝ ĐỔI MẬT KHẨU ---
  const handleChangePassword = async (e) => {
    e.preventDefault();

    // 1. Kiểm tra confirm password
    if (passData.newPassword !== passData.confirmPassword) {
      return toast.error("Mật khẩu xác nhận không khớp!");
    }

    // 2. Không cho trùng mật khẩu cũ
    if (passData.oldPassword === passData.newPassword) {
      return toast.error("Mật khẩu mới không được trùng mật khẩu cũ!");
    }

    // 3. Độ dài tối thiểu
    if (passData.newPassword.length < 6) {
      return toast.error("Mật khẩu phải có ít nhất 6 ký tự!");
    }

    // 4. Phải có chữ và số
    const hasLetter = /[a-zA-Z]/.test(passData.newPassword);
    const hasNumber = /[0-9]/.test(passData.newPassword);

    if (!hasLetter || !hasNumber) {
      return toast.error("Mật khẩu phải bao gồm chữ và số!");
    }

    if (!passData.oldPassword || !passData.newPassword || !passData.confirmPassword) {
      return toast.error("Vui lòng nhập đầy đủ thông tin!");
    }

    setChanging(true);

    const token = localStorage.getItem("token");

    try {
      const res = await axios.put(
        "http://localhost:5000/api/auth/change-password",
        {
          oldPassword: passData.oldPassword,
          newPassword: passData.newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(res.data.message);

      setShowPassModal(false);
      setPassData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
      });

    } catch (err) {
      toast.error(err.response?.data?.message || "Đổi mật khẩu thất bại");
    } finally {
      setChanging(false);
    }
  };

  if (error) return <div className="text-center py-5">Lỗi tải dữ liệu...</div>;
  if (!user) return <div className="text-center py-5"><div className="spinner-border"></div></div>;

  return (
    <div className={`container py-5 min-vh-100 ${theme === "dark" ? "text-light" : "text-dark"}`}>
      <div className="row g-4">
        {/* SIDEBAR TÙY CHỈNH */}
        <div className="col-lg-4">
          <div className={`card border-0 shadow-lg p-4 text-center h-100 ${theme === "dark" ? "bg-dark border border-secondary" : "bg-white"}`} style={{ borderRadius: '25px' }}>
            <div className="mb-4 position-relative d-inline-block mx-auto">
              <div className="p-1 rounded-circle" style={{ background: 'linear-gradient(135deg, #21d4fd 0%, #b721ff 100%)' }}>
                <img src={`https://ui-avatars.com/api/?name=${user.name}&background=fff&color=0D6EFD&size=128`} className="rounded-circle border border-4 border-white shadow-sm" alt="avatar" style={{ width: '110px', height: '110px' }} />
              </div>
            </div>
            <h4 className="fw-bold mb-1">{user.name}</h4>
            <p className={`mb-3 ${theme === 'dark' ? 'text-white-50' : 'text-muted'}`}>{user.email}</p>
            <div className="nav flex-column gap-2 mt-2">
              
              {/* Tab Thông tin cá nhân */}
              <button className={`nav-link border-0 py-3 px-4 fw-bold d-flex align-items-center justify-content-between rounded-4 transition-all ${activeTab === "info" ? "btn-auth-gradient text-white" : (theme === "dark" ? "text-light hover-dark" : "text-dark border")}`} onClick={() => { setActiveTab("info"); setIsEditing(false); }}>
                <div className="d-flex align-items-center"><UserCircle size={20} className="me-3" /> Thông tin cá nhân</div>
              </button>
              
              {/* Tab Lịch sử mua hàng */}
              <button className={`nav-link border-0 py-3 px-4 fw-bold d-flex align-items-center justify-content-between rounded-4 transition-all ${activeTab === "orders" ? "btn-auth-gradient text-white" : (theme === "dark" ? "text-light hover-dark" : "text-dark border")}`} onClick={() => setActiveTab("orders")}>
                <div className="d-flex align-items-center"><ShoppingBag size={20} className="me-3" /> Lịch sử mua hàng</div>
              </button>

              <hr className={theme === "dark" ? "border-secondary" : "border-light-subtle"} />

              {/* NÚT ĐIỂM THƯỞNG (MỚI) */}
              <button 
                className={`nav-link border-0 py-3 px-4 fw-bold d-flex align-items-center justify-content-between rounded-4 transition-all hover-lift`}
                style={{ 
                  background: theme === "dark" ? "rgba(245, 158, 11, 0.15)" : "linear-gradient(135deg, #fffbeb, #fef3c7)",
                  color: "#d97706",
                  border: theme === "dark" ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid #fde68a"
                }} 
                onClick={() => navigate("/loyalty")}
              >
                <div className="d-flex align-items-center">
                  <Star size={20} className="me-3" fill="currentColor" /> 
                  Điểm thưởng
                </div>
              </button>

            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="col-lg-8">
          <div className={`card border-0 shadow-lg p-4 p-md-5 h-100 ${theme === "dark" ? "bg-dark border border-secondary" : "bg-white"}`} style={{ borderRadius: '25px' }}>
            {activeTab === "info" ? (
              <div className="animate-fade-in">
                <div className="d-flex justify-content-between align-items-center mb-5">
                  <div className="d-flex align-items-center gap-3">
                    <div className="btn-auth-gradient p-3 rounded-4 shadow-sm"><User size={24} color="white" /></div>
                    <h3 className="fw-bold mb-0">Hồ sơ cá nhân</h3>
                  </div>
                  {!isEditing && (
                    <button className="btn btn-outline-primary rounded-pill px-4 fw-bold shadow-sm" onClick={() => setIsEditing(true)}>
                      <Edit3 size={18} className="me-2" /> Chỉnh sửa
                    </button>
                  )}
                </div>

                <form onSubmit={handleUpdate}>
                  <div className="row g-4">
                    <div className="col-12">
                      <div className={`p-4 rounded-4 border ${theme === 'dark' ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light border-light-subtle'}`}>
                        <small className="d-block text-uppercase fw-bold opacity-50 mb-1" style={{ fontSize: '11px' }}>Họ và tên</small>
                        {isEditing ? <input type="text" className="form-control bg-transparent border-primary border-0 border-bottom rounded-0 px-0 fw-bold fs-5 shadow-none" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} required /> : <div className="fs-5 fw-bold">{user.name}</div>}
                      </div>
                    </div>
                    <div className="col-12">
                      <div className={`p-4 rounded-4 border ${theme === 'dark' ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light border-light-subtle'}`}>
                        <small className="d-block text-uppercase fw-bold opacity-50 mb-1" style={{ fontSize: '11px' }}>Địa chỉ Email</small>
                        {isEditing ? <input type="email" className="form-control bg-transparent border-primary border-0 border-bottom rounded-0 px-0 fw-bold fs-5 shadow-none" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} required /> : <div className="fs-5 fw-bold">{user.email}</div>}
                      </div>
                    </div>

                    {!isEditing && (
                      <>
                        <div className="col-12">
                          <div className={`p-4 rounded-4 border ${theme === 'dark' ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light border-light-subtle'}`}>
                            <small className="d-block text-uppercase fw-bold opacity-50 mb-1" style={{ fontSize: '11px' }}>Ngày tham gia</small>
                            <div className="fs-5 fw-bold">{new Date(user.created_at).toLocaleDateString('vi-VN')}</div>
                          </div>
                        </div>

                        {/* PHẦN ĐỔI MẬT KHẨU */}
                        <div className="col-12 mt-4">
                          <div className="d-flex align-items-center gap-3 mb-4">
                            <div className="btn-auth-gradient p-3 rounded-4 shadow-sm"><ShieldCheck size={24} color="white" /></div>
                            <h3 className="fw-bold mb-0">Bảo mật tài khoản</h3>
                          </div>
                          <div className={`p-4 rounded-4 border ${theme === 'dark' ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light border-light-subtle'}`}>
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                              <div className="d-flex align-items-center gap-3">
                                <div className="p-2 rounded-3 bg-white shadow-sm text-danger"><Lock size={20} /></div>
                                <div>
                                  <small className="d-block text-uppercase fw-bold opacity-50 mb-1" style={{ fontSize: '11px' }}>Mật khẩu</small>
                                  <div className="fs-5 fw-bold">••••••••</div>
                                </div>
                              </div>
                              <button type="button" className="btn btn-outline-secondary px-4 py-2 rounded-pill fw-bold border-2 transition-all hover-lift shadow-sm"
                                onClick={() => {
                                  setPassData({
                                    oldPassword: "",
                                    newPassword: "",
                                    confirmPassword: ""
                                  });
                                  setShowPassModal(true);
                                }}>
                                Đổi mật khẩu
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-5 d-flex gap-3">
                      <button type="submit" className="btn btn-auth-gradient px-5 py-3 fw-bold shadow-lg d-flex align-items-center gap-2 rounded-pill" disabled={saving}>
                        {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : <Save size={18} />} LƯU THAY ĐỔI
                      </button>
                      <button type="button" className="btn btn-outline-secondary px-4 py-3 rounded-pill fw-bold border-2" onClick={() => { setIsEditing(false); setEditData({ name: user.name, email: user.email }); }}>
                        <X size={18} className="me-2" /> HỦY
                      </button>
                    </div>
                  )}
                </form>
              </div>
            ) : (
              <div className="animate-fade-in">
                <h3 className="fw-bold mb-4">Lịch sử mua hàng</h3>

                {/* LOADING */}
                {loadingOrders ? (
                  <div className="text-center">
                    <div className="spinner-border"></div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="display-1 mb-4 opacity-25">📦</div>
                    <h4 className="fw-bold">Chưa có đơn hàng</h4>
                    <button
                      onClick={() => navigate("/shop")}
                      className="btn btn-auth-gradient px-5 py-3 rounded-pill fw-bold shadow-lg mt-4"
                    >
                      KHÁM PHÁ CỬA HÀNG
                    </button>
                  </div>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="card mb-4 p-3 shadow-sm rounded-4">

                      {/* HEADER */}
                      <div className="d-flex justify-content-between mb-3">
                        <div>
                          <strong>Đơn #{order.id}</strong><br />
                          <small>
                            {new Date(order.created_at).toLocaleDateString("vi-VN")}
                          </small>
                        </div>

                        <div className="text-end">
                          <span className="badge bg-success">{order.status}</span><br />
                          <span className="badge bg-info">{order.payment_status}</span>
                        </div>
                      </div>

                      {/* ITEMS */}
                      {order.items?.map((item, index) => (
                          <div key={index} className="d-flex align-items-center border-top pt-3 mb-3">
                            {/* Hình ảnh sản phẩm */}
                            <div className="flex-shrink-0">
                              <img
                                src={`/assets/img/${item.image}`} 
                                alt={item.name}
                                width="70"
                                height="70"
                                className="rounded-3 shadow-sm object-fit-cover me-3 border"
                              />
                            </div>

                            {/* Thông tin sản phẩm */}
                            <div className="flex-grow-1">
                              <div className={`fw-bold fs-6 mb-1 ${theme === 'dark' ? 'text-white' : 'text-dark'}`}>
                                {item.name}
                              </div>
                              <div className={`small ${theme === 'dark' ? 'text-white-50' : 'text-muted'}`}>
                                Số lượng: <span className={`fw-bold ${theme === 'dark' ? 'text-white' : 'text-dark'}`}>{item.quantity}</span>
                              </div>
                            </div>

                            {/* Giá sản phẩm */}
                            <div className="fw-bold text-primary fs-6">
                              ${item.price.toLocaleString()}
                            </div>
                          </div>
                        ))}

                        {/* TOTAL */}
                        <div className="text-end mt-3 fw-bold text-danger">
                          Tổng: ${order.total}
                        </div>

                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      

      {/* MODAL ĐỔI MẬT KHẨU */}
      {showPassModal && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className={`modal-content border-0 shadow-lg p-3 ${theme === 'dark' ? 'bg-dark text-light border border-secondary' : 'bg-white'}`} style={{ borderRadius: '30px' }}>
              <div className="modal-header border-0 pb-0">
                <h4 className="fw-bold"><Lock size={24} className="me-2 text-primary" /> Đổi mật khẩu</h4>
                <button
                  type="button"
                  className={`btn-close ${theme === 'dark' ? 'btn-close-white' : ''}`}
                  onClick={() => {
                    setShowPassModal(false);
                    setPassData({ oldPassword: "", newPassword: "", confirmPassword: "" });
                  }}
                ></button>
              </div>
              <form onSubmit={handleChangePassword} className="modal-body p-4">
                <div className="mb-3">
                  <label className="small fw-bold mb-2 opacity-75">Mật khẩu hiện tại</label>
                  <div className="position-relative">
                    <input type={showOldPass ? "text" : "password"} className={`form-control auth-input ${theme === 'dark' ? 'bg-secondary text-white border-0' : 'bg-light border'}`} value={passData.oldPassword} onChange={(e) => setPassData({ ...passData, oldPassword: e.target.value })} required />
                    <button type="button" className="position-absolute end-0 top-50 translate-middle-y btn border-0" onClick={() => setShowOldPass(!showOldPass)}>{showOldPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="small fw-bold mb-2 opacity-75">Mật khẩu mới</label>
                  <div className="position-relative">
                    <input type={showNewPass ? "text" : "password"} className={`form-control auth-input ${theme === 'dark' ? 'bg-secondary text-white border-0' : 'bg-light border'}`} value={passData.newPassword} onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })} required />
                    <button type="button" className="position-absolute end-0 top-50 translate-middle-y btn border-0" onClick={() => setShowNewPass(!showNewPass)}>{showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="small fw-bold mb-2 opacity-75">Xác nhận mật khẩu mới</label>
                  <input type="password" className={`form-control auth-input ${theme === 'dark' ? 'bg-secondary text-white border-0' : 'bg-light border'}`} value={passData.confirmPassword} onChange={(e) => setPassData({ ...passData, confirmPassword: e.target.value })} required />
                </div>
                <button
                  type="submit"
                  className="btn btn-auth-gradient w-100 py-3 fw-bold rounded-pill shadow"
                  disabled={changing}
                >
                  {changing ? "Đang xử lý..." : "CẬP NHẬT MẬT KHẨU"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;