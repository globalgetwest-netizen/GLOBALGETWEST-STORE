"use client"

import { SignIn } from "@clerk/nextjs"

export default function LoginPage(){
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md">
        <h1 className="text-3xl font-bold text-blue-900 text-center mb-8">
          GLOBALGETWEST
        </h1>
        <h2 className="text-2xl font-bold mb-6">
          Customer Login
        </h2>
        <SignIn />
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
