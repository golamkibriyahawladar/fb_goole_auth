"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Comment { id: string; message: string; from: { name: string }; created_time: string; }
interface Post { id: string; message: string; created_time: string; comments?: { data: Comment[] }; }

export default function CommentsPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const lastTs = useRef(0);

  useEffect(() => {
    fetch("/api/fb/pages").then(r => r.json()).then(d => {
      if (d.data?.length) { setPages(d.data); setSelectedPage(d.data[0]); }
      setLoading(false);
    });
  }, []);

  const loadComments = useCallback(async () => {
    if (!selectedPage) return;
    const res = await fetch(`/api/fb/comments?pageId=${selectedPage.id}&pageToken=${selectedPage.access_token}`);
    const data = await res.json();
    if (data.data) setPosts(data.data.filter((p: Post) => p.comments?.data?.length));
  }, [selectedPage]);

  useEffect(() => { if (selectedPage) loadComments(); }, [selectedPage, loadComments]);

  // SSE real-time new comments
  useEffect(() => {
    const es = new EventSource(`/api/events?since=${lastTs.current}`);
    es.onmessage = (e) => {
      const events = JSON.parse(e.data);
      events.forEach((ev: any) => {
        lastTs.current = Math.max(lastTs.current, ev.ts);
        if (ev.type === "fb_comment") loadComments();
      });
    };
    return () => es.close();
  }, [loadComments]);

  const handleReply = async (commentId: string) => {
    if (!replyText.trim() || !selectedPage) return;
    setSending(true);
    await fetch("/api/fb/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, message: replyText, pageToken: selectedPage.access_token }),
    });
    setReplyText(""); setReplyingTo(null); setSending(false);
    loadComments();
  };

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>;
  if (!pages.length) return <div className="empty-state"><div className="empty-state-icon">📭</div><p style={{ fontWeight: 700 }}>No Facebook Pages found</p></div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800 }}>🗨️ Comments</h1>
          <p style={{ color: "var(--text-muted)", fontSize: ".85rem", marginTop: ".2rem" }}>New comments on your posts — reply in real time</p>
        </div>
        <div style={{ display: "flex", gap: ".75rem", alignItems: "center" }}>
          {pages.length > 1 && (
            <select value={selectedPage?.id} onChange={e => setSelectedPage(pages.find(p => p.id === e.target.value))}
              style={{ background: "rgba(255,255,255,.06)", border: "1px solid var(--border)", borderRadius: 8, color: "#fff", padding: ".4rem .75rem", fontSize: ".82rem" }}>
              {pages.map(p => <option key={p.id} value={p.id} style={{ background: "#1a1a2e" }}>{p.name}</option>)}
            </select>
          )}
          <button className="btn btn-ghost btn-sm" onClick={loadComments}>🔄 Refresh</button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">🗨️</div><p>No comments yet</p></div>
      ) : (
        posts.map(post => (
          <div key={post.id} className="card" style={{ marginBottom: "1rem" }}>
            <div className="card-header">
              <div>
                <div style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: ".25rem" }}>
                  📝 Post · {new Date(post.created_time).toLocaleDateString()}
                </div>
                <p style={{ fontSize: ".9rem", color: "rgba(255,255,255,.8)" }}>{post.message || "(No text)"}</p>
              </div>
              <span className="badge badge-purple">{post.comments?.data?.length || 0} comments</span>
            </div>
            <div className="card-body" style={{ padding: "1rem" }}>
              {(post.comments?.data || []).map(comment => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <div className="msg-avatar" style={{ width: 30, height: 30, fontSize: ".75rem" }}>{comment.from?.name?.[0] || "?"}</div>
                    <span className="comment-from">{comment.from?.name}</span>
                    <span className="comment-time">· {new Date(comment.created_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="comment-text">{comment.message}</p>
                  <button className="comment-reply-btn" onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>
                    ↩ Reply
                  </button>
                  {replyingTo === comment.id && (
                    <div className="reply-form">
                      <input
                        id={`reply-input-${comment.id}`}
                        className="reply-input"
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleReply(comment.id); }}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => handleReply(comment.id)} disabled={sending}>
                        {sending ? "..." : "Reply"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
