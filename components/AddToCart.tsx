"use client"

import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"


export default function AddToCart({

productId

}:{

productId:number

}){


const router = useRouter()



async function addCart(){



const {

data:{user}

}=await supabase.auth.getUser()



if(!user){

alert("Please login before adding products to cart")

router.push("/auth/login")

return

}




const {data:existing}=await supabase

.from("carts")

.select("*")

.eq("user_id",user.id)

.eq("product_id",productId)

.single()





if(existing){


await supabase

.from("carts")

.update({

quantity: existing.quantity + 1

})

.eq("id",existing.id)



}

else{


await supabase

.from("carts")

.insert([

{

user_id:user.id,

product_id:productId,

quantity:1

}

])


}





alert("Added to cart")



}



return (

<button

onClick={addCart}

className="bg-blue-900 text-white px-10 py-4 rounded-xl font-bold"

>

Add To Cart

</button>

)


}