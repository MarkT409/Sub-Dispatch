import type { Config, Handler } from "@netlify/functions";

/**
 * Scheduled sync (every 10 minutes).
 * Admin panel also auto-syncs quietly on visit.
 * Optional live updates: Google Sheets Apps Script webhook — see docs/sheets-live-sync.gs
 *
 * Required Netlify env:
 * - SHEETS_SYNC_SECRET
 * - NEXT_PUBLIC_SITE_URL
 * - Google + Supabase vars used by sync
 */
export const handler: Handler = async () => {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const netlifyUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "").replace(
    /\/$/,
    "",
  );
  const site =
    fromEnv && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(fromEnv)
      ? fromEnv
      : netlifyUrl || fromEnv;
  const secret = process.env.SHEETS_SYNC_SECRET;

  if (!site || !secret) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "NEXT_PUBLIC_SITE_URL (or Netlify URL) and SHEETS_SYNC_SECRET are required",
      }),
    };
  }

  const response = await fetch(`${site}/api/admin/sheets/sync?source=board`, {
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
  // Frequent backup — admin panel also auto-syncs quietly on visit
  schedule: "*/10 * * * *",
};
