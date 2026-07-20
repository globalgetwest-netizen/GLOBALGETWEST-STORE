import { getSupabaseAdmin } from "@/lib/supabaseAdmin"

const supabaseAdmin = getSupabaseAdmin()


export default async function CustomersPage(){


  const {
    data:{
      users
    },
    error

  } = await supabaseAdmin.auth.admin.listUsers()



  if(error){

    return(

      <main className="min-h-screen bg-gray-100 p-10">

        <div className="bg-white rounded-3xl shadow p-8">

          <h1 className="text-3xl font-bold text-red-600">

            {error.message}

          </h1>

        </div>

      </main>

    )

  }





  return(

    <main className="min-h-screen bg-gray-100 p-8">


      <div className="max-w-7xl mx-auto">


        <h1 className="text-4xl font-bold text-blue-900 mb-10">

          Customers

        </h1>





        <div className="bg-white rounded-3xl shadow overflow-hidden">



          <table className="w-full">


            <thead className="bg-blue-900 text-white">


              <tr>


                <th className="p-5 text-left">

                  Customer ID

                </th>



                <th className="p-5 text-left">

                  Email

                </th>



                <th className="p-5 text-left">

                  Joined

                </th>



                <th className="p-5 text-left">

                  Status

                </th>


              </tr>


            </thead>





            <tbody>


              {
                users && users.length > 0 ? (

                  users.map((user)=>(


                    <tr

                      key={user.id}

                      className="border-b hover:bg-gray-50"

                    >



                      <td className="p-5 text-sm break-all">

                        {user.id}

                      </td>





                      <td className="p-5 font-semibold">

                        {user.email || "No email"}

                      </td>





                      <td className="p-5">


                        {new Date(
                          user.created_at
                        ).toLocaleDateString()}


                      </td>





                      <td className="p-5">


                        <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">

                          Active

                        </span>


                      </td>




                    </tr>


                  ))


                ) : (


                  <tr>

                    <td

                      colSpan={4}

                      className="p-10 text-center text-gray-500"

                    >

                      No customers found

                    </td>


                  </tr>


                )

              }



            </tbody>



          </table>



        </div>



      </div>



    </main>


  )

}