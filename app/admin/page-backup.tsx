"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"


export default function AdminPage() {


  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [paymentLink, setPaymentLink] = useState("")

  const [imageFile, setImageFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)



  async function addProduct() {


    if (!imageFile) {

      alert("Please select product image")
      return

    }


    setLoading(true)



    // Upload image to Supabase Storage

    const fileName = `${Date.now()}-${imageFile.name}`



    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageFile)



    if (uploadError) {

      alert(uploadError.message)
      setLoading(false)
      return

    }




    // Get public image URL

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName)



    const imageUrl = data.publicUrl





    // Save product

    const { error } = await supabase
      .from("products")
      .insert([

        {
          name,
          description,
          price,
          image: imageUrl,
          payment_link: paymentLink
        }

      ])




    if (error) {

      alert(error.message)

    } else {


      alert("Product Added Successfully")


      setName("")
      setDescription("")
      setPrice("")
      setPaymentLink("")
      setImageFile(null)

    }



    setLoading(false)


  }





  return (

    <main className="min-h-screen bg-gray-100 p-10">


      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-8">


        <h1 className="text-3xl font-bold text-blue-900 mb-8">

          GLOBALGETWEST ADMIN

        </h1>



        <input
          className="border w-full p-3 rounded mb-4"
          placeholder="Product Name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
        />



        <textarea
          className="border w-full p-3 rounded mb-4"
          placeholder="Product Description"
          value={description}
          onChange={(e)=>setDescription(e.target.value)}
        />



        <input
          className="border w-full p-3 rounded mb-4"
          placeholder="Price"
          value={price}
          onChange={(e)=>setPrice(e.target.value)}
        />



        <input
          type="file"
          accept="image/*"
          className="border w-full p-3 rounded mb-4"
          onChange={(e)=>
            setImageFile(e.target.files?.[0] || null)
          }
        />



        <input
          className="border w-full p-3 rounded mb-4"
          placeholder="Payment Link"
          value={paymentLink}
          onChange={(e)=>setPaymentLink(e.target.value)}
        />



        <button

          onClick={addProduct}

          disabled={loading}

          className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold"

        >

          {loading ? "Uploading..." : "Add Product"}

        </button>



      </div>


    </main>

  )

}