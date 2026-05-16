import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { google } from "googleapis";

// GET /api/google/ads — get Google Ads campaigns
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session || session.provider !== "google") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

  if (!devToken || !customerId) {
    return Response.json({
      campaigns: [],
      note: "Google Ads not configured. Set GOOGLE_ADS_DEVELOPER_TOKEN and GOOGLE_ADS_CUSTOMER_ID in .env.local",
    });
  }

  try {
    // Use Google Ads REST API (v17)
    const cleanCustomerId = customerId.replace(/-/g, "");
    const res = await fetch(
      `https://googleads.googleapis.com/v17/customers/${cleanCustomerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "developer-token": devToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            SELECT
              campaign.id,
              campaign.name,
              campaign.status,
              campaign.advertising_channel_type,
              metrics.impressions,
              metrics.clicks,
              metrics.cost_micros,
              metrics.conversions,
              metrics.ctr,
              metrics.average_cpc
            FROM campaign
            WHERE segments.date DURING LAST_30_DAYS
            ORDER BY metrics.impressions DESC
            LIMIT 25
          `,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: errText, campaigns: [] }, { status: 200 });
    }

    const data = await res.json();
    const campaigns = (data || []).flatMap((batch: any) =>
      (batch.results || []).map((r: any) => ({
        id: r.campaign?.id,
        name: r.campaign?.name,
        status: r.campaign?.status,
        type: r.campaign?.advertisingChannelType,
        impressions: r.metrics?.impressions || 0,
        clicks: r.metrics?.clicks || 0,
        costMicros: r.metrics?.costMicros || 0,
        conversions: r.metrics?.conversions || 0,
        ctr: r.metrics?.ctr || 0,
        avgCpc: r.metrics?.averageCpc || 0,
      }))
    );

    return Response.json({ campaigns });
  } catch (e: any) {
    return Response.json({ error: e.message, campaigns: [] }, { status: 200 });
  }
}
