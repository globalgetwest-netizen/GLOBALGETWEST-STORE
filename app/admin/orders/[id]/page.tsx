import { supabase } from "@/lib/supabase"
import Link from "next/link"


export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {


  const { id } = await params


  const { data: order } = await supabase
    .from("orders")
    .select(`
      id,
      total,
      status,
      payment_status,
      created_at
    `)
    .eq("id", Number(id))
    .single()



  if (!order) {

    return (

      <main className="p-10">

        <h1 className="text-3xl font-bold text-red-600">
          Order Not Found
        </h1>

      </main>

    )

  }




  const { data: items } = await supabase

    .from("order_items")

    .select(`
      id,
      quantity,
      price,
      products(
        name,
        image
      )
    `)

    .eq(
      "order_id",
      order.id
    )





  return (

    <main className="min-h-screen bg-gray-100 p-8">


      <Link
        href="/admin/orders"
        className="bg-blue-900 text-white px-6 py-3 rounded-xl"
      >
        ← Back Orders
      </Link>




      <div className="mt-8 bg-white rounded-3xl shadow p-8">


        <h1 className="text-4xl font-bold text-blue-900">
          Order #{order.id}
        </h1>



        <div className="grid md:grid-cols-3 gap-6 mt-8">


          <div>
            <p className="text-gray-500">
              Status
            </p>

            <p className="font-bold">
              {order.status}
            </p>
          </div>



          <div>
            <p className="text-gray-500">
              Payment
            </p>

            <p className="font-bold">
              {order.payment_status}
            </p>
          </div>



          <div>
            <p className="text-gray-500">
              Total
            </p>

            <p className="font-bold text-green-700">
              ${order.total}
            </p>
          </div>



        </div>



      </div>





      <div className="mt-10 bg-white rounded-3xl shadow p-8">


        <h2 className="text-3xl font-bold text-blue-900 mb-8">
          Products
        </h2>



        <div className="space-y-5">


        {
          items?.map((item:any)=>(

            <div
              key={item.id}
              className="flex gap-6 border-b pb-5"
            >


              <img

                src={
                  item.products?.image ||
                  "/placeholder.png"
                }

                className="w-24 h-24 rounded-xl object-cover"

              />



              <div>

                <h3 className="font-bold text-xl">

                  {item.products?.name}

                </h3>


                <p>
                  Quantity: {item.quantity}
                </p>


                <p className="text-green-700 font-bold">

                  ${item.price}

                </p>


              </div>



            </div>

          ))
        }


        </div>


      </div>



    </main>

  )

}