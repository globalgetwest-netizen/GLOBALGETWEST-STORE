import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Server-side authorization utility for administrative routes.
 * This function enforces BOTH authentication AND authorization.
 */
export async function authorizeAdmin() {
  const { userId } = await auth();

  if (!userId) {
    return {
      authorized: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = user.publicMetadata.role as string;

    if (role !== "admin") {
      return {
        authorized: false,
        error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    return { authorized: true, userId, error: null };
  } catch (error) {
    console.error("Authorization error:", error);
    return {
      authorized: false,
      error: NextResponse.json({ error: "Internal Server Error" }, { status: 500 }),
    };
  }
}
