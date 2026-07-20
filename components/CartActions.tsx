"use client"

import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"


export default function CartActions({

cartId,
quantity

}:{

cartId:number
quantity:number

}){


const router = useRouter()



async function updateQuantity(newQuantity:number){


if(newQuantity < 1){

return

}


const {error}=await supabase

.from("carts")

.update({

quantity:newQuantity

})

.eq("id",cartId)



if(!error){

router.refresh()

}


}





async function removeItem(){


const {error}=await supabase

.from("carts")

.delete()

.eq("id",cartId)



if(!error){

router.refresh()

}


}





return (

<div className="mt-4 flex items-center gap-3">


<button

onClick={()=>updateQuantity(quantity-1)}

className="bg-gray-200 px-4 py-2 rounded-lg"

>

-

</button>




<span className="font-bold">

{quantity}

</span>




<button

onClick={()=>updateQuantity(quantity+1)}

className="bg-gray-200 px-4 py-2 rounded-lg"

>

+

</button>





<button

onClick={removeItem}

className="ml-5 bg-red-600 text-white px-5 py-2 rounded-lg"

>

Remove

</button>



</div>

)

}