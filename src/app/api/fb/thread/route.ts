import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// GET /api/fb/thread?conversationId=xxx&pageToken=yyy
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.provider !== "facebook") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversationId = req.nextUrl.searchParams.get("conversationId");
  const pageToken = req.nextUrl.searchParams.get("pageToken") || session.accessToken;

  if (!conversationId) return Response.json({ error: "conversationId required" }, { status: 400 });

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${conversationId}?fields=messages{id,message,from,created_time}&access_token=${pageToken}`
    );
    const data = await res.json();
    return Response.json(data);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
