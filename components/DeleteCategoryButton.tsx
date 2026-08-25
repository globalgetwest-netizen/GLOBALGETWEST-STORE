"use client"

import { useTransition } from "react"

export default function DeleteCategoryButton({ deleteAction, id }: { deleteAction: (id: string) => Promise<void>, id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => deleteAction(id))}
      disabled={isPending}
      className="bg-red-600 text-white px-4 py-2 rounded-lg"
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  )
}
