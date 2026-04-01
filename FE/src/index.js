import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import "bootstrap/dist/css/bootstrap.min.css";
// import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
   <React.StrictMode>
      <GoogleOAuthProvider clientId="658342757642-b3lmrik2r42tt8kkibvmq9pf7uume2vi.apps.googleusercontent.com">
        <BrowserRouter>
          <CartProvider>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </CartProvider>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </React.StrictMode>
);