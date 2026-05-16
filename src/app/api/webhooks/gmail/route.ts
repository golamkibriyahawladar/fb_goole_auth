import { NextRequest } from "next/server";
import { pushEvent } from "@/lib/event-store";

// POST /api/webhooks/gmail — receive Gmail push notifications from Google Pub/Sub
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Pub/Sub sends base64-encoded message
    const messageData = body?.message?.data;
    if (messageData) {
      const decoded = Buffer.from(messageData, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      // Store the event for SSE delivery
      pushEvent("gmail_new", {
        historyId: parsed.historyId,
        emailAddress: parsed.emailAddress,
        timestamp: Date.now(),
      });

      // Forward to user webhook URL if configured
      const forwardUrl = process.env.EMAIL_WEBHOOK_FORWARD_URL;
      if (forwardUrl) {
        await fetch(forwardUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "gmail", ...parsed }),
        }).catch(() => {});
      }
    }
  } catch (_) {}

  return new Response("ok", { status: 200 });
}
