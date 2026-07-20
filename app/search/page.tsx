import { supabase } from "@/lib/supabase"



export default async function SearchPage({

searchParams

}:{

searchParams:{
q?:string
}

}){


const query = searchParams.q || ""



const {data:products}=await supabase

.from("products")

.select(`

*,

categories(

name

)

`)

.ilike("name",`%${query}%`)







return (

<div className="min-h-screen bg-gray-100 p-10">


<h1 className="text-4xl font-bold text-blue-900 mb-8">

Search Results

</h1>




<p className="mb-6 text-gray-600">

Results for:
<b>{query}</b>

</p>





<div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">





{products?.map((product)=>(



<a

key={product.id}

href={`/product/${product.id}`}

className="bg-white rounded-2xl shadow overflow-hidden hover:shadow-xl"

>



<img

src={product.image || "/placeholder.png"}

alt={product.name}

className="w-full h-48 object-cover"

/>





<div className="p-5">



<h2 className="text-xl font-bold text-blue-900">

{product.name}

</h2>





<p className="text-sm text-blue-700 mt-2">

{product.categories?.name}

</p>





<p className="text-2xl font-bold mt-3">

${product.price}

</p>




</div>



</a>



))}



</div>





{products?.length===0 && (

<p>

No products found.

</p>

)}





</div>

)

}