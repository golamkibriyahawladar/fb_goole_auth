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
    console.log("META WEBHOOK PAYLOAD:", JSON.stringify(body));
    
    const entries = body?.entry || [];
    
    for (const entry of entries) {
      // Messages
      if (entry.messaging) {
        for (const messaging of entry.messaging) {
          if (messaging.message) {
            pushEvent("fb_message", {
              senderId: messaging.sender?.id,
              message: messaging.message?.text,
              timestamp: messaging.timestamp,
            });
          }
        }
      }

      // Comments / Feed
      if (entry.changes) {
        for (const change of entry.changes) {
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
      }
    }
  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
  }

  return new Response("ok", { status: 200 });
}
