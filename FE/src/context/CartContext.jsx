import { createContext, useState } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // 1. Hàm Thêm vào giỏ (Xử lý gộp sản phẩm)
  const addToCart = (product) => {
    setCart((prevCart) => {
      // Kiểm tra sản phẩm đã tồn tại trong giỏ chưa
      const isItemInCart = prevCart.find((item) => item.id === product.id);

      if (isItemInCart) {
        // Nếu có rồi, tăng số lượng thêm 1
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        );
      }
      // Nếu chưa có, thêm mới với quantity mặc định là 1
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  // 2. Hàm Cập nhật số lượng (+ / -)
  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return; // Không cho giảm xuống dưới 1
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // 3. Hàm Xóa sản phẩm
  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // 4. Hàm Xóa sạch giỏ hàng
  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};