"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"


export default function AddToCartButton({
  productId
}:{
  productId:number
}){


const [loading,setLoading]=useState(false)



async function addToCart(){


setLoading(true)



const {error}=await supabase
.from("carts")
.insert([
{
product_id:productId,
quantity:1
}
])



if(error){

alert(error.message)

}else{

alert("Product added to cart")

}



setLoading(false)

}




return (

<button

onClick={addToCart}

disabled={loading}

className="bg-blue-900 text-white px-10 py-4 rounded-xl font-bold"

>

{loading ? "Adding..." : "Add To Cart"}

</button>

)


}