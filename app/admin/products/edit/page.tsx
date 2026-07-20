import Link from "next/link"


export default function EditProductPage(){


return (

<main className="min-h-screen bg-gray-100 p-10">


<div className="bg-white rounded-3xl shadow p-10">


<h1 className="text-4xl font-bold text-blue-900">

Edit Product

</h1>


<p className="mt-5 text-gray-600">

Product editing page is ready.

</p>



<Link

href="/admin/products"

className="inline-block mt-8 bg-blue-900 text-white px-6 py-3 rounded-xl"

>

Back to Products

</Link>



</div>


</main>

)

}