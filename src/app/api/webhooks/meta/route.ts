import { NextRequest } from "next/server";
import { pushEvent } from "@/lib/event-store";

// GET /api/webhooks/meta — verify webhook by Meta
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// POST /api/webhooks/meta — receive real-time events from Meta
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = body?.entry?.[0];
    if (!entry) return new Response("ok");

    // Messages
    const messaging = entry?.messaging?.[0];
    if (messaging?.message) {
      pushEvent("fb_message", {
        senderId: messaging.sender?.id,
        message: messaging.message?.text,
        timestamp: messaging.timestamp,
      });
    }

    // Comments / Feed
    const changes = entry?.changes || [];
    for (const change of changes) {
      if (change.field === "feed" && change.value?.item === "comment") {
        pushEvent("fb_comment", {
          commentId: change.value?.comment_id,
          postId: change.value?.post_id,
          message: change.value?.message,
          from: change.value?.from,
          verb: change.value?.verb,
          timestamp: change.value?.created_time,
        });
      }
    }
  } catch (_) {}

  return new Response("ok", { status: 200 });
}
