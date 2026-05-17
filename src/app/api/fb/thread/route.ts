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
  const cursor = req.nextUrl.searchParams.get("cursor");

  if (!conversationId) return Response.json({ error: "conversationId required" }, { status: 400 });

  try {
    let url = `https://graph.facebook.com/v19.0/${conversationId}/messages?fields=id,message,from,created_time&access_token=${pageToken}`;
    if (cursor) {
      url += `&after=${cursor}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    
    // Wrap data to match existing frontend expectations
    return Response.json({
      id: conversationId,
      messages: data
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
