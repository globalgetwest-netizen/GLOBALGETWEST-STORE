"use client"

import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useState } from "react"


export default function CheckoutPage(){

const router = useRouter()

const [loading,setLoading] = useState(false)

const [message,setMessage] = useState("")



async function checkout(){

setLoading(true)

setMessage("")



// Get logged in user

const {
data:{
user
}

}=await supabase.auth.getUser()



if(!user){

setMessage("Please login before checkout")

setLoading(false)

return

}





// Call secure checkout API

const response = await fetch(
"/api/checkout",
{
method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

userId:user.id

})

}

)



const result = await response.json()



if(!response.ok){

setMessage(
result.error || "Checkout failed"
)

setLoading(false)

return

}




setMessage(
"Order created successfully"
)



setTimeout(()=>{

router.push("/account")

},2000)



setLoading(false)


}





return(

<main className="min-h-screen bg-gray-100 flex items-center justify-center p-8">


<div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-lg">


<h1 className="text-4xl font-bold text-blue-900">

Checkout

</h1>




<p className="mt-5 text-gray-600">

Complete your order securely.

</p>




<button

onClick={checkout}

disabled={loading}

className="mt-8 bg-yellow-400 px-10 py-4 rounded-xl font-bold"

>

{

loading

?

"Processing..."

:

"Place Order"

}

</button>





{

message &&

<p className="mt-6 font-semibold text-blue-900">

{message}

</p>

}



</div>


</main>

)


}