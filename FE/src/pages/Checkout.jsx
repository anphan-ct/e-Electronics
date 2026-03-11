import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

function Checkout() {

  const { theme } = useContext(ThemeContext);

  return (
    <div className="container py-5">

      <h2 className="fw-bold mb-4">
        Checkout
      </h2>

      <form className="checkout-form p-4 rounded shadow-sm">

        <div className="mb-3">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className={`form-control ${
              theme === "dark"
                ? "bg-dark text-light border-secondary"
                : ""
            }`}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Address</label>
          <input
            type="text"
            className={`form-control ${
              theme === "dark"
                ? "bg-dark text-light border-secondary"
                : ""
            }`}
          />
        </div>

        <button className="btn btn-primary">
          Place Order
        </button>

      </form>

    </div>
  );
}

export default Checkout;