import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// GET /api/fb/pages — list user's pages with tokens
export async function GET() {
  const session = await auth();
  if (!session || session.provider !== "facebook") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${session.accessToken}`
    );
    const data = await res.json();
    return Response.json(data);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
