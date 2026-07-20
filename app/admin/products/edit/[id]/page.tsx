"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"


export default function EditProductPage(){


  const params = useParams()
  const router = useRouter()

  const id = params.id as string



  const [name,setName] = useState("")
  const [description,setDescription] = useState("")
  const [price,setPrice] = useState("")
  const [paymentLink,setPaymentLink] = useState("")
  const [loading,setLoading] = useState(false)



  useEffect(()=>{

    async function loadProduct(){

      const {data} = await supabase
        .from("products")
        .select("*")
        .eq("id",id)
        .single()


      if(data){

        setName(data.name)
        setDescription(data.description)
        setPrice(data.price)
        setPaymentLink(data.payment_link)

      }

    }


    if(id){
      loadProduct()
    }


  },[id])





  async function updateProduct(){


    setLoading(true)



    const {error} = await supabase
      .from("products")
      .update({

        name,
        description,
        price,
        payment_link: paymentLink

      })
      .eq("id",id)



    if(error){

      alert(error.message)

    }else{

      alert("Product Updated Successfully")

      router.push("/admin/products")

    }


    setLoading(false)

  }





  return (

    <div>


      <h1 className="text-4xl font-bold text-blue-900 mb-8">

        Edit Product

      </h1>




      <div className="bg-white rounded-2xl shadow p-8 max-w-2xl">


        <input
          className="border w-full p-3 rounded mb-4"
          value={name}
          onChange={(e)=>setName(e.target.value)}
          placeholder="Product Name"
        />



        <textarea
          className="border w-full p-3 rounded mb-4"
          value={description}
          onChange={(e)=>setDescription(e.target.value)}
          placeholder="Description"
        />



        <input
          className="border w-full p-3 rounded mb-4"
          value={price}
          onChange={(e)=>setPrice(e.target.value)}
          placeholder="Price"
        />



        <input
          className="border w-full p-3 rounded mb-4"
          value={paymentLink}
          onChange={(e)=>setPaymentLink(e.target.value)}
          placeholder="Payment Link"
        />



        <button

          onClick={updateProduct}

          disabled={loading}

          className="bg-blue-900 text-white w-full py-3 rounded-xl font-bold"

        >

          {loading ? "Updating..." : "Update Product"}

        </button>



      </div>


    </div>

  )

}