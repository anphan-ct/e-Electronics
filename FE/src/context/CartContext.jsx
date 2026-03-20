import { createContext, useState, useEffect } from "react";
 
export const CartContext = createContext();
 
export const CartProvider = ({ children }) => {
 
  const getUserId = () => {
    try {
      const data = localStorage.getItem("user");
      if (data && data !== "undefined") return JSON.parse(data)?.id;
    } catch {}
    return null;
  };
 
  const getCartKey = (uid) => `cart_user_${uid}`;
 
  const loadCartFromStorage = (uid) => {
    if (!uid) return [];
    try {
      const saved = localStorage.getItem(getCartKey(uid));
      return saved ? JSON.parse(saved) : [];
    } catch {}
    return [];
  };
 
  // Khởi tạo từ localStorage ngay lần đầu — giữ cart khi F5
  const [cart, setCart] = useState(() => loadCartFromStorage(getUserId()));
 
  // Lưu cart vào localStorage mỗi khi thay đổi
  useEffect(() => {
    const uid = getUserId();
    if (uid) {
      localStorage.setItem(getCartKey(uid), JSON.stringify(cart));
    }
  }, [cart]);
 
  // Lắng nghe login/logout để load hoặc reset cart
  useEffect(() => {
    const handleAuthChange = () => {
      const uid = getUserId();
      if (uid) {
        setCart(loadCartFromStorage(uid)); // login → load cart của user
      } else {
        setCart([]);                       // logout → reset về rỗng
      }
    };
 
    window.addEventListener("login", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("login", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);
 
  // Giữ nguyên 100% các hàm gốc
  const addToCart = (product) => {
    setCart((prevCart) => {
      const isItemInCart = prevCart.find((item) => item.id === product.id);
      if (isItemInCart) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };
 
  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return;
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };
 
  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };
 
  const clearCart = () => setCart([]);
 
  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};