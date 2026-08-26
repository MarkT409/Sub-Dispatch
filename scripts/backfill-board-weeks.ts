/**
 * One-shot: backfill all board weeks from weekly tabs + Transfer Log.
 * Uses Google creds from parent Lantana/.env.local and Supabase from this app.
 */
import { config } from "dotenv";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

config({ path: "/Users/marktrevino/IES Code/Lantana/.env.local" });
config({ path: ".env.local", override: false });

const parent = readFileSync(
  "/Users/marktrevino/IES Code/Lantana/.env.local",
  "utf8",
);
function grab(name: string) {
  const m = parent.match(new RegExp(`^${name}=(.*)$`, "m"));
  if (!m) return;
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  process.env[name] = v.replace(/\\n/g, "\n");
}
grab("GOOGLE_SERVICE_ACCOUNT_EMAIL");
grab("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
grab("GOOGLE_JOB_BOARD_SPREADSHEET_ID");

async function main() {
  // Polyfill WebSocket for supabase-js on Node 20
  const { default: WS } = await import("ws");
  (globalThis as unknown as { WebSocket: typeof WS }).WebSocket = WS;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key.includes("your-service")) {
    throw new Error("Supabase service role missing in .env.local");
  }

  const { syncJobBoard } = await import("../src/lib/sheets/sync-job-board");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Starting weeks=all backfill (boards + Transfer Log)…");
  const result = await syncJobBoard(supabase, { weeks: "all" });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
