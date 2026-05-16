"use client";

import { useState, useEffect } from "react";

interface Campaign {
  id: string; name: string; status: string; type: string;
  impressions: string; clicks: string; costMicros: string;
  conversions: string; ctr: string; avgCpc: string;
}

const STATUS_COLORS: Record<string, string> = {
  ENABLED: "badge-green", PAUSED: "badge-orange", REMOVED: "badge-red",
  ACTIVE: "badge-green", INACTIVE: "badge-orange",
};

function fmtMoney(micros: string | number) {
  return "$" + (Number(micros) / 1_000_000).toFixed(2);
}
function fmtNum(n: string | number) {
  return Number(n).toLocaleString();
}
function fmtPct(n: string | number) {
  return (Number(n) * 100).toFixed(2) + "%";
}

export default function AdsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/fb/ads").then(r => r.json()).then(d => {
      if (d.error) setError(d.error);
      if (d.note) setNote(d.note);
      setCampaigns(d.campaigns || []);
      setAccounts(d.accounts || []);
      setLoading(false);
    });
  }, []);

  // Totals
  const totalSpend = campaigns.reduce((a, c) => a + Number(c.costMicros || 0), 0);
  const totalImpressions = campaigns.reduce((a, c) => a + Number(c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((a, c) => a + Number(c.clicks || 0), 0);
  const totalConversions = campaigns.reduce((a, c) => a + Number(c.conversions || 0), 0);

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading Ads...</span></div>;

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800 }}>📊 Facebook Ads</h1>
        <p style={{ color: "var(--text-muted)", fontSize: ".85rem", marginTop: ".2rem" }}>Campaign performance — last 30 days</p>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 10, padding: "1rem", marginBottom: "1rem", fontSize: ".85rem", color: "#fca5a5" }}>
          ⚠️ {error}
        </div>
      )}
      {note && (
        <div style={{ background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.2)", borderRadius: 10, padding: "1rem", marginBottom: "1rem", fontSize: ".85rem", color: "#93c5fd" }}>
          ℹ️ {note}
        </div>
      )}

      {/* Ad Account Info */}
      {accounts.length > 0 && (
        <div style={{ display: "flex", gap: ".75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {accounts.map(a => (
            <div key={a.id} style={{ background: "rgba(255,255,255,.04)", border: "1px solid var(--border)", borderRadius: 10, padding: ".6rem 1rem", fontSize: ".8rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Account: </span>
              <span style={{ fontWeight: 700 }}>{a.name}</span>
              <span style={{ marginLeft: ".75rem", color: "var(--text-muted)" }}>{a.currency}</span>
              <span className={`badge ${a.account_status === 1 ? "badge-green" : "badge-red"}`} style={{ marginLeft: ".5rem" }}>
                {a.account_status === 1 ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Spend</div>
          <div className="stat-value">{fmtMoney(totalSpend)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Impressions</div>
          <div className="stat-value">{fmtNum(totalImpressions)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Clicks</div>
          <div className="stat-value">{fmtNum(totalClicks)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Conversions</div>
          <div className="stat-value">{fmtNum(totalConversions)}</div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Campaigns ({campaigns.length})</span>
        </div>
        {campaigns.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}><div className="empty-state-icon">📊</div><p>No campaigns found</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
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
                      <div style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>{c.type}</div>
                    </td>
                    <td><span className={`badge ${STATUS_COLORS[c.status] || "badge-blue"}`}>{c.status}</span></td>
                    <td>{fmtNum(c.impressions)}</td>
                    <td>{fmtNum(c.clicks)}</td>
                    <td>{fmtPct(c.ctr)}</td>
                    <td style={{ fontWeight: 700 }}>{fmtMoney(c.costMicros)}</td>
                    <td>{fmtMoney(c.avgCpc)}</td>
                    <td>{fmtNum(c.conversions)}</td>
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
