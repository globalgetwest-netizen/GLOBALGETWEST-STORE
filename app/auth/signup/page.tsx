"use client"

import { SignUp } from "@clerk/nextjs"

export default function SignupPage(){
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md">
        <h1 className="text-3xl font-bold text-blue-900 mb-8 text-center">
          GLOBALGETWEST
        </h1>
        <h2 className="text-2xl font-bold mb-6">
          Create Account
        </h2>
        <SignUp />
        <p className="text-center mt-6 text-gray-600">
          Already have an account?
          <a
            href="/auth/login"
            className="text-blue-900 font-bold ml-2"
          >
            Login
          </a>
        </p>
      </div>
    </main>
  )
}
