"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface EmailMeta { id: string; threadId: string; from: string; subject: string; date: string; snippet: string; isUnread: boolean; }
interface EmailFull extends EmailMeta { to: string; body: string; }

export default function GmailPage() {
  const [emails, setEmails] = useState<EmailMeta[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailFull | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [composing, setComposing] = useState(false);
  const [compTo, setCompTo] = useState("");
  const [compSubject, setCompSubject] = useState("");
  const [compBody, setCompBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const lastTs = useRef(0);

  const loadEmails = useCallback(async (pageToken?: string, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    const params = new URLSearchParams({ action: "list", maxResults: "10" });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`/api/google/gmail?${params}`);
    const data = await res.json();
    if (data.messages) {
      setEmails(prev => append ? [...prev, ...data.messages] : data.messages);
      setNextPageToken(data.nextPageToken);
    }
    if (!append) setLoading(false); else setLoadingMore(false);
  }, []);

  useEffect(() => { loadEmails(); }, [loadEmails]);

  // SSE real-time new emails
  useEffect(() => {
    const es = new EventSource(`/api/events?since=${lastTs.current}`);
    es.onmessage = (e) => {
      const events = JSON.parse(e.data);
      events.forEach((ev: any) => {
        lastTs.current = Math.max(lastTs.current, ev.ts);
        if (ev.type === "gmail_new") loadEmails(); // auto-refresh on new email
      });
    };
    return () => es.close();
  }, [loadEmails]);

  const openEmail = async (email: EmailMeta) => {
    setLoadingEmail(true);
    setSelectedEmail(null);
    setComposing(false);
    const res = await fetch(`/api/google/gmail?action=get&id=${email.id}`);
    const data = await res.json();
    setSelectedEmail(data);
    // Mark as read locally
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, isUnread: false } : e));
    setLoadingEmail(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/google/gmail?id=${id}`, { method: "DELETE" });
    setEmails(prev => prev.filter(e => e.id !== id));
    if (selectedEmail?.id === id) setSelectedEmail(null);
    setDeletingId(null);
  };

  const handleSend = async () => {
    if (!compTo || !compSubject || !compBody) return;
    setSending(true);
    const res = await fetch("/api/google/gmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: compTo, subject: compSubject, body: compBody }),
    });
    const data = await res.json();
    if (data.id) {
      setSentMsg("✓ Email sent!");
      setCompTo(""); setCompSubject(""); setCompBody("");
      setTimeout(() => { setSentMsg(""); setComposing(false); }, 2000);
    }
    setSending(false);
  };

  const fromName = (from: string) => {
    const match = from.match(/^([^<]+)/);
    return match ? match[1].trim() : from.split("@")[0];
  };

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading Gmail...</span></div>;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", gap: "1rem" }}>
      {/* Left: Email List */}
      <div className="card" style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="card-header">
          <span className="card-title">📧 Inbox</span>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => loadEmails()}>🔄</button>
            <button id="btn-compose" className="btn btn-primary btn-sm" onClick={() => { setComposing(true); setSelectedEmail(null); }}>✍️ Compose</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {emails.map(email => (
            <div
              key={email.id}
              id={`email-${email.id}`}
              className={`email-item ${email.isUnread ? "unread" : ""} ${selectedEmail?.id === email.id ? "active" : ""}`}
              onClick={() => openEmail(email)}
              style={{ position: "relative" }}
            >
              {email.isUnread && <div className="email-unread-dot" style={{ flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".2rem" }}>
                  <span className="email-from">{fromName(email.from)}</span>
                  <span className="email-date">{new Date(email.date).toLocaleDateString()}</span>
                </div>
                <div className="email-subject">{email.subject || "(No subject)"}</div>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginTop: ".2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {email.snippet}
                </div>
              </div>
            </div>
          ))}

          {nextPageToken && (
            <div style={{ padding: "1rem", textAlign: "center" }}>
              <button id="btn-load-more-emails" className="btn btn-ghost" onClick={() => loadEmails(nextPageToken, true)} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load 20 more"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Email Detail / Compose */}
      <div className="card" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {composing ? (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1.25rem", gap: ".75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontWeight: 700 }}>✍️ New Email</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setComposing(false)}>✕ Cancel</button>
            </div>
            <input id="compose-to" className="email-compose-input" placeholder="To: email@example.com" value={compTo} onChange={e => setCompTo(e.target.value)} />
            <input id="compose-subject" className="email-compose-input" placeholder="Subject" value={compSubject} onChange={e => setCompSubject(e.target.value)} />
            <textarea id="compose-body" className="email-compose-textarea" placeholder="Your message..." value={compBody} onChange={e => setCompBody(e.target.value)} style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
              {sentMsg && <span style={{ color: "#86efac", fontSize: ".85rem" }}>{sentMsg}</span>}
              <button id="btn-send-email" className="btn btn-primary" onClick={handleSend} disabled={sending || !compTo || !compSubject}>
                {sending ? "Sending..." : "📤 Send Email"}
              </button>
            </div>
          </div>
        ) : loadingEmail ? (
          <div className="loading-center" style={{ flex: 1 }}><div className="spinner" /></div>
        ) : selectedEmail ? (
          <div className="email-panel" style={{ flex: 1 }}>
            <div className="email-panel-header">
              <div className="email-panel-subject">{selectedEmail.subject || "(No subject)"}</div>
              <div className="email-panel-meta">
                <span>From: <b>{selectedEmail.from}</b></span><br />
                <span>To: {selectedEmail.to}</span><br />
                <span>{new Date(selectedEmail.date).toLocaleString()}</span>
              </div>
            </div>
            <div className="email-panel-body">{selectedEmail.body || "(Empty email)"}</div>
            <div className="email-panel-actions">
              <button className="btn btn-primary btn-sm" onClick={() => {
                setCompTo(selectedEmail.from.replace(/.*<(.+)>/, "$1"));
                setCompSubject(`Re: ${selectedEmail.subject}`);
                setCompBody(`\n\n---\nOn ${selectedEmail.date}, ${selectedEmail.from} wrote:\n${selectedEmail.body?.split("\n").slice(0, 5).join("\n")}`);
                setComposing(true);
              }}>↩ Reply</button>
              <button
                id={`btn-delete-${selectedEmail.id}`}
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(selectedEmail.id)}
                disabled={deletingId === selectedEmail.id}
              >
                {deletingId === selectedEmail.id ? "Deleting..." : "🗑️ Delete"}
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ flex: 1 }}>
            <div className="empty-state-icon">📧</div>
            <p>Select an email to read it</p>
          </div>
        )}
      </div>
    </div>
  );
}
