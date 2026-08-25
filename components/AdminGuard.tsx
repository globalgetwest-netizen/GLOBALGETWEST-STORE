"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"

// Client-side gate for the /admin area: only users whose role is
// 'admin' get in; everyone else is redirected.
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoaded, isSignedIn } = useUser()
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking")

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.replace("/auth/login")
      return
    }

    // Clerk users can have roles in publicMetadata or organization membership.
    // Assuming role is stored in publicMetadata for now.
    const role = user.publicMetadata.role as string

    if (role === "admin") {
      setStatus("ok")
    } else {
      setStatus("denied")
      router.replace("/")
    }
  }, [isLoaded, isSignedIn, user, router])

  if (status !== "ok") {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        {status === "checking" ? "Checking access…" : "Redirecting…"}
      </div>
    )
  }

  return <>{children}</>
}
