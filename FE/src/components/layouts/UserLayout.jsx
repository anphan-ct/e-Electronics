import { Outlet } from "react-router-dom";
import Header from "../Header";
import Footer from "../Footer";
import Login from "../Login";
import Register from "../Register";
import ChatBox from "../ChatBox";

function UserLayout() {
  return (
    <>
      <Header />
      <main className="flex-fill">
        {/* Outlet là nơi nội dung các trang con (Home, Shop,...) sẽ hiển thị */}
        <Outlet />
      </main>
      <Footer />
      
      {/* Các thành phần bổ trợ chỉ dành cho User */}
      <Login />
      <Register />
      <ChatBox />
    </>
  );
}

export default UserLayout;