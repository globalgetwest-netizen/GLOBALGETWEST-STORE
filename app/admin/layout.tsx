export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-gray-100">

      {/* Sidebar */}
      <aside className="w-72 bg-blue-950 text-white p-6">

        <h1 className="text-2xl font-bold mb-10">
          GLOBALGETWEST
        </h1>

        <nav className="space-y-3">

          <a href="/admin" className="block p-3 rounded hover:bg-blue-800">
            📊 Dashboard
          </a>

          <a href="/admin/products" className="block p-3 rounded hover:bg-blue-800">
            📦 Products
          </a>

          <a href="/admin/categories" className="block p-3 rounded hover:bg-blue-800">
            🗂 Categories
          </a>

          <a href="/admin/orders" className="block p-3 rounded hover:bg-blue-800">
            🛒 Orders
          </a>

          <a href="/admin/customers" className="block p-3 rounded hover:bg-blue-800">
            👥 Customers
          </a>

          <a href="/admin/inventory" className="block p-3 rounded hover:bg-blue-800">
            📦 Inventory
          </a>

          <a href="/admin/analytics" className="block p-3 rounded hover:bg-blue-800">
            📈 Analytics
          </a>

          <a href="/admin/settings" className="block p-3 rounded hover:bg-blue-800">
            ⚙ Settings
          </a>

        </nav>

      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {children}
      </main>

    </div>
  )
}