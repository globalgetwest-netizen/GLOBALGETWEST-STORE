"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function NewProductPage() {

  const router = useRouter()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [paymentLink, setPaymentLink] = useState("")

  const [imageFile, setImageFile] = useState<File | null>(null)

  const [categoryId, setCategoryId] = useState("")
  const [categories, setCategories] = useState<any[]>([])

  const [loading, setLoading] = useState(false)



  // Load Categories
  useEffect(() => {

    async function loadCategories(){

      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending:false })


      setCategories(data || [])

    }


    loadCategories()


  },[])




  async function addProduct() {


    if (!imageFile) {

      alert("Please select product image")
      return

    }


    if (!categoryId) {

      alert("Please select product category")
      return

    }



    setLoading(true)



    // Upload Image

    const fileName = `${Date.now()}-${imageFile.name}`



    const { error: uploadError } =
      await supabase.storage
        .from("product-images")
        .upload(fileName, imageFile)



    if (uploadError) {

      alert(uploadError.message)

      setLoading(false)

      return

    }




    // Get Image URL

    const { data } =
      supabase.storage
      .from("product-images")
      .getPublicUrl(fileName)



    const imageUrl = data.publicUrl





    // Save Product

    const { error } =
      await supabase
      .from("products")
      .insert([

        {

          name,

          description,

          price,

          image:imageUrl,

          payment_link:paymentLink,

          category_id:categoryId

        }

      ])





    if(error){

      alert(error.message)


    }else{


      alert("Product Added Successfully")


      setName("")
      setDescription("")
      setPrice("")
      setPaymentLink("")
      setImageFile(null)
      setCategoryId("")


      router.push("/admin/products")


    }



    setLoading(false)


  }







  return (

    <div>


      <h1 className="text-4xl font-bold text-blue-900 mb-8">

        Add New Product

      </h1>




      <div className="bg-white rounded-2xl shadow p-8 max-w-2xl">



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





        <select

          className="border w-full p-3 rounded mb-4"

          value={categoryId}

          onChange={(e)=>setCategoryId(e.target.value)}

        >


          <option value="">

            Select Category

          </option>



          {categories.map((category)=>(


            <option

              key={category.id}

              value={category.id}

            >

              {category.name}

            </option>


          ))}



        </select>





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

          className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold"

        >

          {loading ? "Uploading..." : "Add Product"}

        </button>



      </div>


    </div>

  )

}