"use client";

import { useState, useEffect, useCallback } from "react";

interface Post { id: string; message: string; created_time: string; likes?: { summary: { total_count: number } }; comments?: { summary: { total_count: number } }; full_picture?: string; }

export default function PostsPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/fb/pages").then(r => r.json()).then(d => {
      if (d.data?.length) { setPages(d.data); setSelectedPage(d.data[0]); }
      setLoading(false);
    });
  }, []);

  const loadPosts = useCallback(async () => {
    if (!selectedPage) return;
    const res = await fetch(`/api/fb/posts?pageId=${selectedPage.id}&pageToken=${selectedPage.access_token}`);
    const data = await res.json();
    if (data.data) setPosts(data.data);
  }, [selectedPage]);

  useEffect(() => { if (selectedPage) loadPosts(); }, [selectedPage, loadPosts]);

  const handlePost = async () => {
    if (!postText.trim() || !selectedPage) return;
    setPosting(true);
    const res = await fetch("/api/fb/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: selectedPage.id, message: postText, pageToken: selectedPage.access_token }),
    });
    const data = await res.json();
    if (data.id) {
      setPostText(""); setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      loadPosts();
    }
    setPosting(false);
  };

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>;
  if (!pages.length) return <div className="empty-state"><div className="empty-state-icon">📭</div><p style={{ fontWeight: 700 }}>No Facebook Pages found</p></div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800 }}>📝 Posts</h1>
          <p style={{ color: "var(--text-muted)", fontSize: ".85rem", marginTop: ".2rem" }}>Create and manage posts on your Facebook Page</p>
        </div>
        {pages.length > 1 && (
          <select value={selectedPage?.id} onChange={e => setSelectedPage(pages.find(p => p.id === e.target.value))}
            style={{ background: "rgba(255,255,255,.06)", border: "1px solid var(--border)", borderRadius: 8, color: "#fff", padding: ".4rem .75rem", fontSize: ".82rem" }}>
            {pages.map(p => <option key={p.id} value={p.id} style={{ background: "#1a1a2e" }}>{p.name}</option>)}
          </select>
        )}
      </div>

      {/* Composer */}
      <div className="post-composer">
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: ".875rem" }}>
          <div className="msg-avatar" style={{ width: 36, height: 36 }}>{selectedPage?.name?.[0]}</div>
          <div>
            <div style={{ fontSize: ".875rem", fontWeight: 700 }}>{selectedPage?.name}</div>
            <div style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>Posting as Page</div>
          </div>
        </div>
        <textarea
          id="post-compose-textarea"
          className="post-textarea"
          placeholder="What's on your mind?"
          value={postText}
          onChange={e => setPostText(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>{postText.length} characters</span>
          <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
            {success && <span style={{ color: "#86efac", fontSize: ".8rem" }}>✓ Posted!</span>}
            <button id="btn-create-post" className="btn btn-primary" onClick={handlePost} disabled={posting || !postText.trim()}>
              {posting ? "Posting..." : "🚀 Post Now"}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Posts */}
      <h2 style={{ fontSize: ".9rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: ".75rem", textTransform: "uppercase", letterSpacing: ".06em" }}>Recent Posts</h2>
      {posts.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📝</div><p>No posts yet</p></div>
      ) : (
        posts.map(post => (
          <div key={post.id} className="card" style={{ marginBottom: ".75rem" }}>
            <div className="card-body">
              {post.full_picture && (
                <img src={post.full_picture} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: ".75rem", maxHeight: 200, objectFit: "cover" }} />
              )}
              <p style={{ fontSize: ".9rem", color: "rgba(255,255,255,.85)", lineHeight: 1.6, marginBottom: ".75rem" }}>{post.message || "(No text)"}</p>
              <div style={{ display: "flex", gap: "1rem", fontSize: ".78rem", color: "var(--text-muted)" }}>
                <span>👍 {post.likes?.summary?.total_count ?? 0} likes</span>
                <span>💬 {post.comments?.summary?.total_count ?? 0} comments</span>
                <span>🕐 {new Date(post.created_time).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
