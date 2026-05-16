import { NextRequest } from "next/server";
import { eventStore } from "@/lib/event-store";

export const dynamic = "force-dynamic";

// GET /api/events — Server-Sent Events for real-time FB messages/comments + Gmail
export async function GET(req: NextRequest) {
  let lastTs = parseInt(req.nextUrl.searchParams.get("since") || "0");

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      let interval: ReturnType<typeof setInterval>;

      const send = () => {
        try {
          const newEvents = eventStore.filter((e) => e.ts > lastTs);
          if (newEvents.length > 0) {
            lastTs = newEvents[newEvents.length - 1].ts;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(newEvents)}\n\n`));
          } else {
            controller.enqueue(encoder.encode(": ping\n\n"));
          }
        } catch (_) {
          if (interval) clearInterval(interval);
        }
      };

      send();
      interval = setInterval(send, 3000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch (_) {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
