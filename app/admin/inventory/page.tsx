import { supabase } from "@/lib/supabase"


export default async function InventoryPage(){


const {data:products,error}=await supabase

.from("products")

.select(`

id,

name,

price,

image

`)

.order(
"created_at",
{
ascending:false
}
)





if(error){

return(

<main className="p-10">

<h1 className="text-red-600 font-bold">

{error.message}

</h1>

</main>

)

}





return(


<main className="min-h-screen bg-gray-100 p-8">



<div className="max-w-7xl mx-auto">



<h1 className="text-4xl font-bold text-blue-900 mb-10">

Inventory

</h1>





<div className="grid md:grid-cols-3 gap-8">



{

products?.map((product)=>(


<div

key={product.id}

className="bg-white rounded-3xl shadow p-6"

>


<img

src={product.image || "/placeholder.png"}

alt={product.name}

className="w-full h-52 object-cover rounded-2xl"

/>





<h2 className="text-2xl font-bold text-blue-900 mt-5">

{product.name}

</h2>





<p className="text-green-700 font-bold text-xl mt-3">

${product.price}

</p>





<div className="mt-5 bg-green-100 text-green-700 px-5 py-3 rounded-xl font-semibold">

Available

</div>





<button

className="mt-5 w-full bg-blue-900 text-white py-3 rounded-xl font-bold"

>

Manage Stock

</button>





</div>


))


}




</div>



</div>


</main>


)


}