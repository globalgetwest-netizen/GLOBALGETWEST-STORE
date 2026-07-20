import { supabase } from "@/lib/supabase"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"

export default async function AnalyticsPage() {

  const supabaseAdmin = getSupabaseAdmin()


  const { count: totalProducts } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })



  const { count: totalOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })



  const {
    data: usersData
  } = await supabaseAdmin.auth.admin.listUsers()



  const totalCustomers =
    usersData?.users?.length || 0



  const { data: orders } = await supabase
    .from("orders")
    .select("total")



  const totalRevenue =
    orders?.reduce(
      (sum, order) =>
        sum + Number(order.total),
      0
    ) || 0




  return (

    <main className="min-h-screen bg-gray-100 p-8">


      <div className="max-w-7xl mx-auto">


        <h1 className="text-4xl font-bold text-blue-900 mb-10">
          Analytics Dashboard
        </h1>



        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">



          <div className="bg-white rounded-3xl shadow-lg p-8">

            <p className="text-gray-500">
              Products
            </p>

            <h2 className="text-5xl font-bold text-blue-900 mt-4">
              {totalProducts || 0}
            </h2>

          </div>




          <div className="bg-white rounded-3xl shadow-lg p-8">

            <p className="text-gray-500">
              Customers
            </p>

            <h2 className="text-5xl font-bold text-blue-900 mt-4">
              {totalCustomers}
            </h2>

          </div>





          <div className="bg-white rounded-3xl shadow-lg p-8">

            <p className="text-gray-500">
              Orders
            </p>

            <h2 className="text-5xl font-bold text-blue-900 mt-4">
              {totalOrders || 0}
            </h2>

          </div>





          <div className="bg-white rounded-3xl shadow-lg p-8">

            <p className="text-gray-500">
              Revenue
            </p>

            <h2 className="text-5xl font-bold text-green-700 mt-4">
              ${totalRevenue.toFixed(2)}
            </h2>

          </div>



        </div>


      </div>


    </main>

  )

}