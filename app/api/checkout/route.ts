import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"


export async function POST(req: Request) {

  try {

    const body = await req.json()

    const {
      userId
    } = body


    if (!userId) {

      return NextResponse.json(
        {
          error: "User not found"
        },
        {
          status: 400
        }
      )

    }



    // Get user's cart

    const {
      data: carts,
      error: cartError
    } =
    await supabaseAdmin

    .from("carts")

    .select(`
      id,
      quantity,
      products(
        id,
        name,
        price,
        stock_quantity
      )
    `)

    .eq(
      "user_id",
      userId
    )




    if (
      cartError ||
      !carts ||
      carts.length === 0
    ) {

      return NextResponse.json(
        {
          error: "Cart is empty"
        },
        {
          status: 400
        }
      )

    }





    // Check stock

    for (const item of carts) {

      const product:any = item.products[0]


      if (
        product.stock_quantity <
        item.quantity
      ) {

        return NextResponse.json(
          {
            error:
            `${product.name} is out of stock`
          },
          {
            status:400
          }
        )

      }

    }





    // Calculate total

    const total =
    carts.reduce(
      (sum:any,item:any)=>{

        const product = item.products[0]


        return sum +
        (
          Number(product.price)
          *
          item.quantity
        )

      },
      0
    )







    // Create order

    const {
      data:order,
      error:orderError
    } =
    await supabaseAdmin

    .from("orders")

    .insert([
      {
        user_id:userId,
        total,
        status:"Pending",
        payment_status:"Pending"
      }
    ])

    .select()

    .single()





    if(orderError){

      return NextResponse.json(
        {
          error:orderError.message
        },
        {
          status:500
        }
      )

    }








    // Create order items

    const orderItems =
    carts.map((item:any)=>{

      const product = item.products[0]


      return {

        order_id:order.id,

        product_id:product.id,

        quantity:item.quantity,

        price:product.price

      }

    })






    const {
      error:itemError
    } =
    await supabaseAdmin

    .from("order_items")

    .insert(orderItems)





    if(itemError){

      return NextResponse.json(
        {
          error:itemError.message
        },
        {
          status:500
        }
      )

    }








    // Reduce stock

    for(const item of carts){

      const product = item.products[0]


      await supabaseAdmin

      .from("products")

      .update({

        stock_quantity:
        product.stock_quantity -
        item.quantity

      })

      .eq(
        "id",
        product.id
      )

    }








    // Clear cart

    await supabaseAdmin

    .from("carts")

    .delete()

    .eq(
      "user_id",
      userId
    )







    return NextResponse.json({

      success:true,

      orderId:order.id

    })





  } catch(error:any){


    return NextResponse.json(

      {
        error:error.message
      },

      {
        status:500
      }

    )


  }

}