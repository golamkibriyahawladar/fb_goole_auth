import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// POST /api/fb/posts — create a new post
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.provider !== "facebook") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId, message, pageToken } = await req.json();

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, access_token: pageToken }),
      }
    );
    const data = await res.json();
    return Response.json(data);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/fb/posts — get recent posts from page
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.provider !== "facebook") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pageId = req.nextUrl.searchParams.get("pageId");
  const pageToken = req.nextUrl.searchParams.get("pageToken") || session.accessToken;

  if (!pageId) return Response.json({ error: "pageId required" }, { status: 400 });

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/feed?fields=id,message,created_time,full_picture,likes.summary(true),comments.summary(true)&limit=10&access_token=${pageToken}`
    );
    const data = await res.json();
    return Response.json(data);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
