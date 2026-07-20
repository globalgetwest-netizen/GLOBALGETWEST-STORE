import { supabase } from "@/lib/supabase"


export default async function CategoriesPage(){


const {data:categories}=await supabase
.from("categories")
.select("*")
.order("created_at",{ascending:false})



async function deleteCategory(id:number){

"use server"


await supabase
.from("categories")
.delete()
.eq("id",id)

}




return (

<div>


<div className="flex justify-between items-center mb-8">


<h1 className="text-4xl font-bold text-blue-900">
Categories
</h1>



<a
href="/admin/categories/new"
className="bg-blue-900 text-white px-6 py-3 rounded-xl font-bold"
>
+ Add Category
</a>


</div>




<div className="bg-white rounded-2xl shadow overflow-hidden">


<table className="w-full">


<thead className="bg-gray-100">


<tr>

<th className="p-4 text-left">
Image
</th>


<th className="p-4 text-left">
Name
</th>


<th className="p-4 text-left">
Description
</th>


<th className="p-4 text-left">
Action
</th>


</tr>


</thead>



<tbody>


{categories?.map((category)=>(


<tr key={category.id} className="border-t">


<td className="p-4">


<img

src={category.image || "/placeholder.png"}

alt={category.name}

className="w-20 h-20 rounded-xl object-cover"

/>


</td>




<td className="p-4 font-bold">

{category.name}

</td>



<td className="p-4">

{category.description}

</td>



<td className="p-4 flex gap-3">


<a

href={`/admin/categories/edit/${category.id}`}

className="bg-yellow-400 px-4 py-2 rounded-lg"

>

Edit

</a>




<form action={deleteCategory.bind(null,category.id)}>


<button

className="bg-red-600 text-white px-4 py-2 rounded-lg"

>

Delete

</button>


</form>



</td>


</tr>


))}


</tbody>


</table>


</div>


</div>

)


}