"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

// Client-side gate for the /admin area: only users whose profile role is
// 'admin' get in; everyone else is redirected. The real enforcement is the
// Row Level Security policies in supabase/schema.sql — this is the UX layer.
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking")

  useEffect(() => {
    let active = true

    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/auth/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (!active) return

      if (profile?.role === "admin") {
        setStatus("ok")
      } else {
        setStatus("denied")
        router.replace("/")
      }
    }

    check()
    return () => {
      active = false
    }
  }, [router])

  if (status !== "ok") {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        {status === "checking" ? "Checking access…" : "Redirecting…"}
      </div>
    )
  }

  return <>{children}</>
}
