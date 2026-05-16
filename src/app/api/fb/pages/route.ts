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

    // ZERO-CONFIG: Automatically subscribe the app to webhooks for all returned pages
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((page: any) => {
        fetch(`https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscribed_fields: "messages,messaging_postbacks,feed",
            access_token: page.access_token,
          }),
        }).catch(err => console.error("Auto-subscribe failed for page", page.id, err));
      });
    }

    return Response.json(data);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
