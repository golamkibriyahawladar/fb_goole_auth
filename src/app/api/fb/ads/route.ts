import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// GET /api/fb/ads — fetch ad account campaigns & metrics
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.provider !== "facebook") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Get ad accounts
    const acctRes = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency,account_status&access_token=${session.accessToken}`
    );
    const acctData = await acctRes.json();

    if (acctData.error) return Response.json({ error: acctData.error.message }, { status: 400 });
    if (!acctData.data || acctData.data.length === 0) {
      return Response.json({ accounts: [], campaigns: [], insights: {} });
    }

    const accountId = acctData.data[0].id;

    // Step 2: Get campaigns with insights
    const campRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=id,name,status,objective,start_time,stop_time,insights{impressions,clicks,spend,reach,cpc,cpm}&access_token=${session.accessToken}`
    );
    const campData = await campRes.json();

    return Response.json({
      accounts: acctData.data,
      campaigns: campData.data || [],
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
