"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"


export default function NewCategoryPage(){


const router = useRouter()


const [name,setName]=useState("")
const [description,setDescription]=useState("")
const [imageFile,setImageFile]=useState<File | null>(null)

const [loading,setLoading]=useState(false)



async function createCategory(){


if(!imageFile){

alert("Please select category image")
return

}


setLoading(true)



// Upload image

const fileName =
`${Date.now()}-${imageFile.name}`



const {error:uploadError}=await supabase.storage
.from("category-images")
.upload(fileName,imageFile)



if(uploadError){

alert(uploadError.message)
setLoading(false)
return

}



// Get image URL

const {data}=supabase.storage
.from("category-images")
.getPublicUrl(fileName)



const imageUrl=data.publicUrl




// Save category

const {error}=await supabase
.from("categories")
.insert([
{
name,
description,
image:imageUrl
}
])



if(error){

alert(error.message)

}else{


alert("Category Created Successfully")


router.push("/admin/categories")


}



setLoading(false)


}





return(

<div>


<h1 className="text-4xl font-bold text-blue-900 mb-8">

Add New Category

</h1>




<div className="bg-white rounded-2xl shadow p-8 max-w-2xl">



<input

className="border w-full p-3 rounded mb-4"

placeholder="Category Name"

value={name}

onChange={(e)=>setName(e.target.value)}

/>




<textarea

className="border w-full p-3 rounded mb-4"

placeholder="Category Description"

value={description}

onChange={(e)=>setDescription(e.target.value)}

/>




<input

type="file"

accept="image/*"

className="border w-full p-3 rounded mb-4"

onChange={(e)=>
setImageFile(e.target.files?.[0] || null)
}

/>




<button

onClick={createCategory}

disabled={loading}

className="bg-blue-900 text-white w-full py-3 rounded-xl font-bold"

>


{loading ? "Uploading..." : "Create Category"}


</button>



</div>


</div>

)

}