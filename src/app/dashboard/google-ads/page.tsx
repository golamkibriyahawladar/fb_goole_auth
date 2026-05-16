"use client";

import { useState, useEffect } from "react";

interface Campaign {
  id: string; name: string; status: string; type: string;
  impressions: number; clicks: number; costMicros: number;
  conversions: number; ctr: number; avgCpc: number;
}

function fmtMoney(micros: number) { return "$" + (micros / 1_000_000).toFixed(2); }
function fmtPct(n: number) { return (n * 100).toFixed(2) + "%"; }
function fmtNum(n: number) { return Number(n).toLocaleString(); }

const STATUS_COLORS: Record<string, string> = { ENABLED: "badge-green", PAUSED: "badge-orange", REMOVED: "badge-red" };

export default function GoogleAdsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/google/ads").then(r => r.json()).then(d => {
      if (d.error) setError(d.error);
      if (d.note) setNote(d.note);
      setCampaigns(d.campaigns || []);
      setLoading(false);
    });
  }, []);

  const totalSpend = campaigns.reduce((a, c) => a + c.costMicros, 0);
  const totalImpressions = campaigns.reduce((a, c) => a + c.impressions, 0);
  const totalClicks = campaigns.reduce((a, c) => a + c.clicks, 0);
  const totalConversions = campaigns.reduce((a, c) => a + c.conversions, 0);

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading Google Ads...</span></div>;

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800 }}>📈 Google Ads</h1>
        <p style={{ color: "var(--text-muted)", fontSize: ".85rem", marginTop: ".2rem" }}>Campaign performance — last 30 days</p>
      </div>

      {note && (
        <div style={{ background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.2)", borderRadius: 10, padding: "1rem", marginBottom: "1rem", fontSize: ".85rem", color: "#93c5fd" }}>
          ℹ️ {note}
          <div style={{ marginTop: ".75rem", fontSize: ".8rem" }}>
            <strong>To enable:</strong> Add <code style={{ background: "rgba(255,255,255,.08)", padding: ".1rem .3rem", borderRadius: 4 }}>GOOGLE_ADS_DEVELOPER_TOKEN</code> and <code style={{ background: "rgba(255,255,255,.08)", padding: ".1rem .3rem", borderRadius: 4 }}>GOOGLE_ADS_CUSTOMER_ID</code> to your .env.local
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 10, padding: "1rem", marginBottom: "1rem", fontSize: ".85rem", color: "#fca5a5" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Spend</div>
          <div className="stat-value" style={{ color: "#f87171" }}>{fmtMoney(totalSpend)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Impressions</div>
          <div className="stat-value">{fmtNum(totalImpressions)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Clicks</div>
          <div className="stat-value" style={{ color: "#60a5fa" }}>{fmtNum(totalClicks)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Conversions</div>
          <div className="stat-value" style={{ color: "#86efac" }}>{fmtNum(totalConversions)}</div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Campaigns ({campaigns.length})</span>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <span className="badge badge-blue">Google Ads API v17</span>
          </div>
        </div>
        {campaigns.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <div className="empty-state-icon">📈</div>
            <p>No campaigns found</p>
            <p style={{ fontSize: ".8rem" }}>Configure your credentials or check your Google Ads account has active campaigns.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                  <th>Spend</th>
                  <th>Avg CPC</th>
                  <th>Conversions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: ".85rem" }}>{c.name}</div>
                      <div style={{ fontSize: ".7rem", color: "var(--text-muted)" }}>ID: {c.id}</div>
                    </td>
                    <td><span className={`badge ${STATUS_COLORS[c.status] || "badge-blue"}`}>{c.status}</span></td>
                    <td style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>{c.type?.replace(/_/g, " ")}</td>
                    <td>{fmtNum(c.impressions)}</td>
                    <td>{fmtNum(c.clicks)}</td>
                    <td>{fmtPct(c.ctr)}</td>
                    <td style={{ fontWeight: 700, color: "#f87171" }}>{fmtMoney(c.costMicros)}</td>
                    <td>{fmtMoney(c.avgCpc)}</td>
                    <td style={{ color: "#86efac" }}>{fmtNum(c.conversions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
