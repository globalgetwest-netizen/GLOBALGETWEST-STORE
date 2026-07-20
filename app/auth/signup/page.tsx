"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"


export default function SignupPage(){


const router = useRouter()


const [name,setName]=useState("")
const [email,setEmail]=useState("")
const [password,setPassword]=useState("")

const [loading,setLoading]=useState(false)





async function signup(){


if(!name || !email || !password){

alert("Please fill all fields")
return

}



setLoading(true)



// Create authentication account

const {

data,

error

}=await supabase.auth.signUp({

email,

password

})





if(error){

alert(error.message)

setLoading(false)

return

}






if(data.user){


// Create customer profile


const {error:profileError}=await supabase

.from("profiles")

.insert([

{

id:data.user.id,

full_name:name,

email:email

}

])





if(profileError){

alert(profileError.message)

setLoading(false)

return

}


}





alert("Account created successfully")

router.push("/auth/login")



setLoading(false)


}





return (


<main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">


<div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md">


<h1 className="text-3xl font-bold text-blue-900 mb-8 text-center">

GLOBALGETWEST

</h1>


<h2 className="text-2xl font-bold mb-6">

Create Account

</h2>





<input

className="border w-full p-3 rounded-xl mb-4"

placeholder="Full Name"

value={name}

onChange={(e)=>setName(e.target.value)}

/>






<input

className="border w-full p-3 rounded-xl mb-4"

placeholder="Email Address"

type="email"

value={email}

onChange={(e)=>setEmail(e.target.value)}

/>






<input

className="border w-full p-3 rounded-xl mb-6"

placeholder="Password"

type="password"

value={password}

onChange={(e)=>setPassword(e.target.value)}

/>






<button

onClick={signup}

disabled={loading}

className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold"

>


{loading ? "Creating Account..." : "Sign Up"}


</button>





<p className="text-center mt-6 text-gray-600">

Already have an account?

<a

href="/auth/login"

className="text-blue-900 font-bold ml-2"

>

Login

</a>

</p>



</div>


</main>


)


}