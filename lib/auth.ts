import { currentUser } from "@clerk/nextjs/server"

// Get user from request (using cookies) via Clerk
export async function getUserFromRequest(request: Request) {
  const user = await currentUser()

  if (!user) {
    return null
  }

  // Return user object compatible with previous Supabase format
  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    first_name: user.firstName,
    last_name: user.lastName,
    // Add other fields as needed for compatibility
  }
}

// Optional: Keep the Supabase admin function for backward compatibility 
// but mark it as deprecated
export function getSupabaseAdminServer() {
  throw new Error('getSupabaseAdminServer is deprecated. Use Clerk auth instead.')
}
