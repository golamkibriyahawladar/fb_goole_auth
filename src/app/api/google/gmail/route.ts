import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { google } from "googleapis";

function getGmailClient(accessToken: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2 });
}

// GET /api/google/gmail?action=list&pageToken=xxx&maxResults=10
// GET /api/google/gmail?action=get&id=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.provider !== "google") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = req.nextUrl.searchParams.get("action") || "list";
  const gmail = getGmailClient(session.accessToken);

  try {
    if (action === "list") {
      const pageToken = req.nextUrl.searchParams.get("pageToken") || undefined;
      const maxResults = parseInt(req.nextUrl.searchParams.get("maxResults") || "10");

      const listRes = await gmail.users.messages.list({
        userId: "me",
        labelIds: ["INBOX"],
        maxResults,
        pageToken,
      });

      const messages = listRes.data.messages || [];

      // Fetch metadata for each message
      const details = await Promise.all(
        messages.slice(0, maxResults).map(async (m) => {
          const msg = await gmail.users.messages.get({
            userId: "me",
            id: m.id!,
            format: "metadata",
            metadataHeaders: ["From", "Subject", "Date"],
          });
          const headers = msg.data.payload?.headers || [];
          const getH = (name: string) => headers.find((h) => h.name === name)?.value || "";
          return {
            id: m.id,
            threadId: m.threadId,
            snippet: msg.data.snippet,
            from: getH("From"),
            subject: getH("Subject"),
            date: getH("Date"),
            labelIds: msg.data.labelIds || [],
            isUnread: msg.data.labelIds?.includes("UNREAD"),
          };
        })
      );

      return Response.json({
        messages: details,
        nextPageToken: listRes.data.nextPageToken || null,
      });
    }

    if (action === "get") {
      const id = req.nextUrl.searchParams.get("id");
      if (!id) return Response.json({ error: "id required" }, { status: 400 });

      const msg = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      });

      const headers = msg.data.payload?.headers || [];
      const getH = (name: string) => headers.find((h) => h.name === name)?.value || "";

      // Extract body
      let body = "";
      const parts = msg.data.payload?.parts || [];
      const textPart = parts.find((p) => p.mimeType === "text/plain");
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
      } else if (msg.data.payload?.body?.data) {
        body = Buffer.from(msg.data.payload.body.data, "base64").toString("utf-8");
      }

      return Response.json({
        id: msg.data.id,
        threadId: msg.data.threadId,
        from: getH("From"),
        to: getH("To"),
        subject: getH("Subject"),
        date: getH("Date"),
        body,
        isUnread: msg.data.labelIds?.includes("UNREAD"),
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/google/gmail — send email
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.provider !== "google") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to, subject, body } = await req.json();
  const gmail = getGmailClient(session.accessToken);

  try {
    const raw = btoa(
      `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    return Response.json({ id: res.data.id, status: "sent" });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/google/gmail?id=xxx — delete (trash) email
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.provider !== "google") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const gmail = getGmailClient(session.accessToken);

  try {
    await gmail.users.messages.trash({ userId: "me", id });
    return Response.json({ success: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
