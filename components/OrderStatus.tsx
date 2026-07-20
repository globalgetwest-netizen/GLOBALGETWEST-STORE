"use client"

import { supabase } from "@/lib/supabase"
import { useState } from "react"


export default function OrderStatus({
  orderId,
  currentStatus
}:{
  orderId:number
  currentStatus:string
}){


const [status,setStatus]=useState(currentStatus)

const [loading,setLoading]=useState(false)



async function updateStatus(){


setLoading(true)


await supabase

.from("orders")

.update({

status

})

.eq(
"id",
orderId
)


setLoading(false)


window.location.reload()


}



return(

<div className="flex gap-3 items-center">


<select

value={status}

onChange={(e)=>setStatus(e.target.value)}

className="border rounded-lg px-3 py-2"

>

<option>
Pending
</option>

<option>
Paid
</option>

<option>
Processing
</option>

<option>
Shipped
</option>

<option>
Delivered
</option>

<option>
Cancelled
</option>


</select>



<button

onClick={updateStatus}

disabled={loading}

className="bg-blue-900 text-white px-4 py-2 rounded-lg"

>

{
loading
?
"Saving..."
:
"Update"
}

</button>


</div>

)

}