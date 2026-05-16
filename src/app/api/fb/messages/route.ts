import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// GET /api/fb/messages — list page conversations
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.provider !== "facebook") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.searchParams;
  const pageId = url.get("pageId");
  if (!pageId) return Response.json({ error: "pageId required" }, { status: 400 });

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/conversations?fields=id,snippet,updated_time,participants&access_token=${session.accessToken}`
    );
    const data = await res.json();
    return Response.json(data);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/fb/messages?thread=<convId> — get messages in a conversation
// POST /api/fb/messages — reply to conversation
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.provider !== "facebook") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, message, pageId } = await req.json();

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: conversationId },
          message: { text: message },
          access_token: session.accessToken,
        }),
      }
    );
    const data = await res.json();
    return Response.json(data);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
