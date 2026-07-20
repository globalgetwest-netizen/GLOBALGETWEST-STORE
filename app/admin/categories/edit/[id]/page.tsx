"use client"

import {useEffect,useState} from "react"
import {supabase} from "@/lib/supabase"
import {useParams,useRouter} from "next/navigation"


export default function EditCategoryPage(){


const params=useParams()
const router=useRouter()

const id=params.id as string


const [name,setName]=useState("")
const [description,setDescription]=useState("")
const [loading,setLoading]=useState(false)



useEffect(()=>{


async function load(){


const {data}=await supabase
.from("categories")
.select("*")
.eq("id",id)
.single()



if(data){

setName(data.name)
setDescription(data.description)

}


}


if(id) load()


},[id])






async function updateCategory(){


setLoading(true)


const {error}=await supabase
.from("categories")
.update({

name,
description

})
.eq("id",id)



if(error){

alert(error.message)

}else{

alert("Category Updated")

router.push("/admin/categories")

}


setLoading(false)


}




return(

<div>


<h1 className="text-4xl font-bold text-blue-900 mb-8">

Edit Category

</h1>



<div className="bg-white shadow rounded-2xl p-8 max-w-xl">


<input

className="border w-full p-3 rounded mb-4"

value={name}

onChange={(e)=>setName(e.target.value)}

/>




<textarea

className="border w-full p-3 rounded mb-4"

value={description}

onChange={(e)=>setDescription(e.target.value)}

/>



<button

onClick={updateCategory}

className="bg-blue-900 text-white w-full py-3 rounded-xl font-bold"

>

{loading ? "Updating..." : "Update Category"}

</button>



</div>


</div>

)

}