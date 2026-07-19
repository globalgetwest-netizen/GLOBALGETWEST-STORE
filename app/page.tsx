export default function Home() {
  const products = [
    {
      name: "GLOBALGETWEST Herbal Formula",
      description: "Premium natural wellness product.",
      price: "$500",
      image: "/product.png",
    },
    {
      name: "GLOBALGETWEST Wellness Support",
      description: "Natural health support solution.",
      price: "$300",
      image: "/product.png",
    },
    {
      name: "GLOBALGETWEST Natural Collection",
      description: "Quality herbal products for daily wellness.",
      price: "$200",
      image: "/product.png",
    },
  ];

  return (
    <main className="min-h-screen bg-white text-gray-900">

      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-700">
            GLOBALGETWEST
          </h1>

          <nav className="space-x-6 text-sm">
            <a href="#">Products</a>
            <a href="#">About</a>
            <a href="#">Contact</a>
          </nav>
        </div>
      </header>


      <section className="bg-gradient-to-r from-green-800 to-green-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-24">

          <h2 className="text-5xl font-bold max-w-3xl">
            Natural Wellness Products Trusted Worldwide
          </h2>

          <p className="mt-6 text-lg max-w-xl">
            Explore premium herbal products from GLOBALGETWEST.
            Simple shopping. Secure payment. Global delivery.
          </p>

          <button className="mt-8 bg-white text-green-700 px-8 py-3 rounded-full font-semibold">
            Explore Products
          </button>

        </div>
      </section>


      <section className="max-w-7xl mx-auto px-6 py-16">

        <h3 className="text-3xl font-bold mb-10">
          Featured Products
        </h3>


        <div className="grid md:grid-cols-3 gap-8">

          {products.map((product, index) => (
            <div
              key={index}
              className="border rounded-2xl p-6 shadow-sm hover:shadow-lg transition"
            >

              <div className="h-48 bg-gray-100 rounded-xl flex items-center justify-center">
                Product Image
              </div>

              <h4 className="text-xl font-bold mt-5">
                {product.name}
              </h4>

              <p className="text-gray-600 mt-2">
                {product.description}
              </p>

              <div className="flex justify-between items-center mt-5">

                <span className="font-bold text-green-700">
                  {product.price}
                </span>

                <button className="bg-green-700 text-white px-5 py-2 rounded-full">
                  Buy Now
                </button>

              </div>

            </div>
          ))}

        </div>

      </section>


      <footer className="bg-gray-900 text-white text-center py-8">
        © 2026 GLOBALGETWEST. All rights reserved.
      </footer>

    </main>
  );
}