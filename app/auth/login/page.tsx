"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"


export default function LoginPage(){


const router = useRouter()


const [email,setEmail]=useState("")
const [password,setPassword]=useState("")

const [loading,setLoading]=useState(false)





async function login(){


if(!email || !password){

alert("Please enter email and password")
return

}



setLoading(true)



const {

error

}=await supabase.auth.signInWithPassword({

email,

password

})





if(error){

alert(error.message)

setLoading(false)

return

}





alert("Login successful")



router.push("/")



setLoading(false)



}





return (


<main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">


<div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md">



<h1 className="text-3xl font-bold text-blue-900 text-center mb-8">

GLOBALGETWEST

</h1>




<h2 className="text-2xl font-bold mb-6">

Customer Login

</h2>







<input

className="border w-full p-3 rounded-xl mb-4"

type="email"

placeholder="Email Address"

value={email}

onChange={(e)=>setEmail(e.target.value)}

/>






<input

className="border w-full p-3 rounded-xl mb-6"

type="password"

placeholder="Password"

value={password}

onChange={(e)=>setPassword(e.target.value)}

/>







<button

onClick={login}

disabled={loading}

className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold"

>


{loading ? "Logging in..." : "Login"}


</button>







<p className="text-center mt-6 text-gray-600">


Don't have an account?


<a

href="/auth/signup"

className="text-blue-900 font-bold ml-2"

>

Sign Up

</a>


</p>




</div>


</main>


)


}