import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default async function AccountPage() {


const {
data:{
user
}
}=await supabase.auth.getUser()



if(!user){

return(

<main className="min-h-screen flex items-center justify-center bg-gray-100">

<div className="bg-white p-10 rounded-3xl shadow-xl text-center">


<h1 className="text-3xl font-bold text-red-600">

Please Login

</h1>


<Link

href="/auth/login"

className="inline-block mt-8 bg-blue-900 text-white px-8 py-3 rounded-xl"

>

Login

</Link>


</div>

</main>

)

}




const {data:orders}=await supabase

.from("orders")

.select(`

id,

total,

status,

payment_status,

created_at,

order_items(

quantity,

price,

products(

name,

image

)

)

`)

.eq(

"user_id",

user.id

)

.order(

"created_at",

{

ascending:false

}

)







const {data:cartItems}=await supabase

.from("carts")

.select("id")

.eq(

"user_id",

user.id

)







return(

<main className="min-h-screen bg-gray-100">


<div className="max-w-6xl mx-auto px-8 py-12">


<h1 className="text-5xl font-bold text-blue-900 mb-10">

My Account

</h1>




<div className="grid lg:grid-cols-3 gap-8">





{/* Profile */}


<div className="bg-white rounded-3xl shadow p-8">


<div className="w-28 h-28 rounded-full bg-blue-900 text-white flex items-center justify-center text-4xl font-bold mx-auto">

{user.email?.charAt(0).toUpperCase()}

</div>



<h2 className="text-xl font-bold text-center mt-5">

{user.email}

</h2>


<p className="text-center text-gray-500">

Customer

</p>



</div>







{/* Dashboard */}


<div className="lg:col-span-2">


<div className="bg-white rounded-3xl shadow p-8">



<h2 className="text-2xl font-bold text-blue-900">

Dashboard

</h2>





<div className="grid md:grid-cols-3 gap-5 mt-8">



<div className="bg-gray-100 p-6 rounded-2xl">

<p>

Orders

</p>


<h3 className="text-4xl font-bold">

{orders?.length || 0}

</h3>


</div>





<div className="bg-gray-100 p-6 rounded-2xl">

<p>

Cart Items

</p>


<h3 className="text-4xl font-bold">

{cartItems?.length || 0}

</h3>


</div>






<div className="bg-gray-100 p-6 rounded-2xl">

<p>

Wishlist

</p>


<h3 className="text-4xl font-bold">

0

</h3>


</div>




</div>


</div>









{/* Order History */}



<div className="bg-white rounded-3xl shadow p-8 mt-8">


<h2 className="text-3xl font-bold text-blue-900 mb-8">

My Orders

</h2>




{

orders && orders.length > 0 ?


orders.map((order)=>(


<div

key={order.id}

className="border rounded-2xl p-6 mb-5"

>



<div className="flex justify-between">


<div>

<h3 className="font-bold">

Order #{order.id}

</h3>


<p className="text-gray-500">

{new Date(order.created_at).toLocaleDateString()}

</p>

</div>



<div className="text-right">


<p className="font-bold text-green-700">

${order.total}

</p>


<p>

{order.status || "Processing"}

</p>


</div>


</div>





<div className="mt-5 space-y-3">


{

order.order_items?.map((item:any)=>(


<div

key={item.products.name}

className="flex items-center gap-4"

>


<img

src={item.products.image}

className="w-16 h-16 rounded-lg object-cover"

/>



<div>

<p className="font-bold">

{item.products.name}

</p>


<p>

Qty: {item.quantity}

</p>


</div>


</div>


))

}



</div>




</div>


))


:


<p className="text-gray-500">

No orders yet.

</p>



}



</div>







<div className="bg-white rounded-3xl shadow p-8 mt-8">


<h2 className="text-2xl font-bold text-blue-900">

Quick Links

</h2>



<div className="flex gap-4 mt-5">


<Link

href="/cart"

className="bg-blue-900 text-white px-6 py-3 rounded-xl"

>

My Cart

</Link>


<Link

href="/"

className="bg-yellow-400 px-6 py-3 rounded-xl font-bold"

>

Continue Shopping

</Link>


</div>


</div>






</div>


</div>


</div>


</main>

)

}