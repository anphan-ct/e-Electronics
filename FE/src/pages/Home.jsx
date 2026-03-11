function Home() {
  return (
    <section className="hero-section">

      <div className="container text-center hero-content">

        <h1 className="hero-title">
          Welcome to <span>MyShop</span>
        </h1>

        <p className="hero-subtitle">
          Best electronics products at best price
        </p>

        <div className="mt-4">

          <a href="/shop" className="btn btn-primary btn-lg me-3">
            Shop Now
          </a>

          <a href="/shop" className="btn btn-outline-light btn-lg">
            View Products
          </a>

        </div>

      </div>

    </section>
  );
}

export default Home;