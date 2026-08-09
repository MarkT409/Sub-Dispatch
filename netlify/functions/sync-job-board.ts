import type { Config, Handler } from "@netlify/functions";

/**
 * Scheduled sync backup (hourly).
 * Live updates: Google Sheets Apps Script webhook — see docs/sheets-live-sync.gs
 *
 * Required Netlify env:
 * - SHEETS_SYNC_SECRET
 * - NEXT_PUBLIC_SITE_URL
 * - Google + Supabase vars used by sync
 */
export const handler: Handler = async () => {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL;
  const secret = process.env.SHEETS_SYNC_SECRET;

  if (!site || !secret) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "NEXT_PUBLIC_SITE_URL and SHEETS_SYNC_SECRET are required on Netlify",
      }),
    };
  }

  const response = await fetch(`${site.replace(/\/$/, "")}/api/admin/sheets/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });

  const body = await response.text();
  return {
    statusCode: response.status,
    body,
  };
};

export const config: Config = {
  // Hourly backup — live updates come from the Sheets Apps Script webhook
  schedule: "0 * * * *",
};
