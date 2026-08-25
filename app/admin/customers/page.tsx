import { getPrisma } from "@/lib/prisma"

export default async function CustomersPage() {
  const prisma = getPrisma()

  const customers = await prisma.customer.findMany({
    orderBy: { created_at: "desc" },
  })

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-900 mb-10">
          Customers
        </h1>

        <div className="bg-white rounded-3xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-5 text-left">Customer ID</th>
                <th className="p-5 text-left">Email</th>
                <th className="p-5 text-left">Joined</th>
                <th className="p-5 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers && customers.length > 0 ? (
                customers.map((customer: any) => (
                  <tr
                    key={customer.id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-5 text-sm break-all">{customer.id}</td>
                    <td className="p-5 font-semibold">
                      {customer.email || "No email"}
                    </td>
                    <td className="p-5">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-5">
                      <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">
                        {customer.status || "Active"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="p-10 text-center text-gray-500"
                  >
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

