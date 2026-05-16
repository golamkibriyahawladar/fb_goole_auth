"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef, useCallback } from "react";

interface Conversation {
  id: string;
  snippet: string;
  updated_time: string;
  participants?: { data: { id: string; name: string }[] };
}

interface Message {
  id: string;
  message: string;
  from: { id: string; name: string };
  created_time: string;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastEventTs = useRef(0);

  // Load pages
  useEffect(() => {
    fetch("/api/fb/pages")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.length) {
          setPages(d.data);
          setSelectedPage(d.data[0]);
        }
        setLoading(false);
      });
  }, []);

  // Load conversations when page changes
  useEffect(() => {
    if (!selectedPage) return;
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPage]);

  const loadConversations = useCallback(async () => {
    if (!selectedPage) return;
    const res = await fetch(`/api/fb/messages?pageId=${selectedPage.id}`);
    const data = await res.json();
    if (data.data) setConversations(data.data);
  }, [selectedPage]);

  // Load thread
  const loadThread = useCallback(async (conv: Conversation) => {
    setActiveConv(conv);
    setLoadingThread(true);
    const token = selectedPage?.access_token || "";
    const res = await fetch(`/api/fb/thread?conversationId=${conv.id}&pageToken=${token}`);
    const data = await res.json();
    if (data.messages?.data) setMessages(data.messages.data.reverse());
    setLoadingThread(false);
  }, [selectedPage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // SSE real-time
  useEffect(() => {
    const es = new EventSource(`/api/events?since=${lastEventTs.current}`);
    es.onmessage = (e) => {
      const events = JSON.parse(e.data);
      events.forEach((ev: any) => {
        lastEventTs.current = Math.max(lastEventTs.current, ev.ts);
        if (ev.type === "fb_message") {
          loadConversations();
          if (activeConv) loadThread(activeConv);
        }
      });
    };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv]);

  const handleSend = async () => {
    if (!reply.trim() || !activeConv || !selectedPage) return;
    setSending(true);
    await fetch("/api/fb/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeConv.participants?.data?.find(p => p.id !== selectedPage.id)?.id || "",
        message: reply,
        pageId: selectedPage.id,
      }),
    });
    setReply("");
    setSending(false);
    if (activeConv) loadThread(activeConv);
  };

  const pageUserId = session?.user?.name;

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>;

  if (!pages.length) return (
    <div className="empty-state">
      <div className="empty-state-icon">📭</div>
      <p style={{ fontWeight: 700 }}>No Facebook Pages found</p>
      <p style={{ fontSize: ".85rem" }}>Make sure your Facebook App has the pages_show_list permission and you manage at least one Page.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", gap: "1rem" }}>
      {/* Left: Conversation List */}
      <div className="card" style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="card-header">
          <span className="card-title">💬 Inbox</span>
          {pages.length > 1 && (
            <select
              value={selectedPage?.id}
              onChange={(e) => setSelectedPage(pages.find(p => p.id === e.target.value))}
              style={{ background: "rgba(255,255,255,.06)", border: "1px solid var(--border)", borderRadius: 8, color: "#fff", padding: ".25rem .5rem", fontSize: ".78rem" }}
            >
              {pages.map(p => <option key={p.id} value={p.id} style={{ background: "#1a1a2e" }}>{p.name}</option>)}
            </select>
          )}
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">💬</div><p>No conversations yet</p></div>
          ) : (
            <div className="msg-list" style={{ padding: ".5rem" }}>
              {conversations.map((conv) => {
                const other = conv.participants?.data?.find(p => p.id !== selectedPage?.id);
                return (
                  <div
                    key={conv.id}
                    id={`conv-${conv.id}`}
                    className={`msg-item ${activeConv?.id === conv.id ? "active" : ""}`}
                    onClick={() => loadThread(conv)}
                  >
                    <div className="msg-avatar">{other?.name?.[0] || "?"}</div>
                    <div className="msg-info">
                      <div className="msg-name">{other?.name || "Unknown"}</div>
                      <div className="msg-preview">{conv.snippet}</div>
                    </div>
                    <div className="msg-time">
                      {new Date(conv.updated_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Chat Window */}
      <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!activeConv ? (
          <div className="empty-state" style={{ flex: 1 }}>
            <div className="empty-state-icon">👈</div>
            <p>Select a conversation to view messages</p>
          </div>
        ) : (
          <>
            <div className="card-header">
              <span className="card-title">
                {activeConv.participants?.data?.find(p => p.id !== selectedPage?.id)?.name || "Conversation"}
              </span>
              <span className="badge badge-blue">Messenger</span>
            </div>
            <div className="chat-messages-area" style={{ flex: 1 }}>
              {loadingThread ? (
                <div className="loading-center"><div className="spinner" /></div>
              ) : messages.length === 0 ? (
                <div className="empty-state"><p>No messages</p></div>
              ) : (
                messages.map((msg) => {
                  const isPage = msg.from?.id === selectedPage?.id;
                  return (
                    <div key={msg.id} className={`bubble-row ${isPage ? "right" : ""}`}>
                      {!isPage && (
                        <div className="msg-avatar" style={{ width: 28, height: 28, fontSize: ".7rem" }}>
                          {msg.from?.name?.[0]}
                        </div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: isPage ? "flex-end" : "flex-start" }}>
                        <div className={`bubble ${isPage ? "right" : "left"}`}>{msg.message}</div>
                        <div className="bubble-time">
                          {new Date(msg.created_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-bar">
              <textarea
                id="msg-reply-input"
                className="chat-input"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type a reply..."
                rows={1}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <button id="btn-send-reply" className="btn btn-primary" onClick={handleSend} disabled={sending || !reply.trim()}>
                {sending ? "..." : "Send ✈"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
