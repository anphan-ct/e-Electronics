# e-Electronics - Fullstack E-commerce Platform

**e-Electronics** là một ứng dụng thương mại điện tử hiện đại, tích hợp trí tuệ nhân tạo và hệ thống giao tiếp thời gian thực để tối ưu hóa trải nghiệm mua sắm thiết bị điện tử.

## 🌟 Tính năng chính

* **Trợ lý AI thông minh**: Tích hợp mô hình **Gemini 2.5 Flash** để hỗ trợ giải đáp thắc mắc của người dùng về sản phẩm.
* **Chat thời gian thực**: Hệ thống nhắn tin trực tiếp giữa người dùng và quản trị viên sử dụng **Socket.io**.
* **Quản lý giao diện (Theming)**: Hỗ trợ chế độ sáng/tối (Dark/Light mode) linh hoạt trên toàn hệ thống.
* **Xác thực bảo mật**: Hệ thống đăng ký/đăng nhập an toàn với mã hóa mật khẩu Bcrypt và xác thực qua JSON Web Token (JWT).
* **Giỏ hàng & Thanh toán**: Quản lý giỏ hàng đồng bộ và quy trình thanh toán tối ưu.
* **Tìm kiếm & Lọc sản phẩm**: Hỗ trợ tìm kiếm sản phẩm nhanh chóng.

## 🛠 Công nghệ sử dụng

### Backend (Node.js & Express)
* **Framework**: Express (v5.2.1).
* **Cơ sở dữ liệu**: MySQL với thư viện `mysql2`.
* **Thời gian thực**: Socket.io (v4.8.3).
* **AI SDK**: Google Generative AI.

### Frontend (React)
* **Library**: React 19.
* **Styling**: Bootstrap 5 & Lucide React.
* **Routing**: React Router DOM (v6.30.3).
* **Thông báo**: React-Toastify.

## 📂 Cấu trúc thư mục chính

* `BE/`: Chứa mã nguồn máy chủ, cấu hình database và các dịch vụ AI.
* `FE/`: Chứa mã nguồn giao diện React và các trang chức năng.

## ⚙️ Cài đặt và Khởi chạy

### 1. Cấu hình Backend (BE)
* Di chuyển vào thư mục: `cd BE`
* Cài đặt thư viện: `npm install`
* Tạo file `.env` và thêm các thông số:
    ```env
    PORT=5000
    DB_HOST=localhost
    DB_USER=root
    DB_PASS=your_password
    DB_NAME=electronics_db
    JWT_SECRET=your_secret_key
    GEMINI_API_KEY=your_api_key_here
    ```
* Chạy server: `node server.js`.

### 2. Cấu hình Frontend (FE)
* Di chuyển vào thư mục: `cd FE`
* Cài đặt thư viện: `npm install`
* Chạy ứng dụng: `npm start`.

## 📄 Giấy phép
Dự án sử dụng giấy phép **ISC**.
