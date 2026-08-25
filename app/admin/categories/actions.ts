"use server"
import { getPrisma } from "@/lib/prisma"
import { authorizeAdmin } from "@/lib/auth-admin"

export async function deleteCategoryAction(formData: FormData) {
  const authResult = await authorizeAdmin();
  if (!authResult.authorized) throw new Error("Forbidden");

  const id = formData.get("id") as string
  const prisma = getPrisma()
  await prisma.category.delete({
    where: { id },
  })
}
