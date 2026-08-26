import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import {
  hasGoogleSheetsEnv,
  listSpreadsheetSheets,
  getJobBoardSpreadsheetId,
} from "../src/lib/sheets/google-client";
import {
  isJobBoardSheet,
  getCurrentWeekMondayIso,
  addDaysIso,
} from "../src/lib/sheets/job-board-parse";
import { syncJobBoard } from "../src/lib/sheets/sync-job-board";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  let k = line.slice(0, i);
  let v = line.slice(i + 1);
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (!(k in process.env)) process.env[k] = v.replace(/\\n/g, "\n");
}

async function main() {
  console.log("sheets_env", hasGoogleSheetsEnv());
  const monday = getCurrentWeekMondayIso();
  const fri = addDaysIso(monday, 4);
  console.log("week", monday, "to", fri);

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: -1 } },
    },
  );

  const { data: crews, error: ce } = await sb
    .from("board_crews")
    .select("name, active, sort_order")
    .order("sort_order");
  console.log("board_crews_err", ce?.message || "");
  console.log(
    "board_crews",
    (crews || []).map((c) => `${c.name}${c.active ? "" : " (off)"}`).join(", "),
  );

  const { data: before } = await sb
    .from("jobs")
    .select("crew_lead, assigned_to, source, status, work_date")
    .neq("status", "cancelled")
    .gte("work_date", monday)
    .lte("work_date", fri)
    .limit(800);

  const countBy = (rows: { crew_lead: string | null }[] | null) => {
    const m = new Map<string, number>();
    for (const j of rows || []) {
      const k = (j.crew_lead || "(none)").trim() || "(none)";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  console.log("before_jobs", before?.length);
  console.log("before_by_lead", countBy(before));

  const id = getJobBoardSpreadsheetId();
  const sheets = await listSpreadsheetSheets(id);
  console.log(
    "board_tabs",
    sheets.filter((s) => isJobBoardSheet(s.title)).map((s) => s.title).slice(-12),
  );

  const result = await syncJobBoard(sb, { weeks: "current" });
  console.log("SYNC", JSON.stringify(result));

  const { data: after } = await sb
    .from("jobs")
    .select("crew_lead, assigned_to, source, status, work_date")
    .neq("status", "cancelled")
    .gte("work_date", monday)
    .lte("work_date", fri)
    .limit(800);

  console.log("after_jobs", after?.length);
  console.log("after_by_lead", countBy(after));
}

main().catch((e) => {
  console.error("ERR", e instanceof Error ? e.message : e);
  process.exit(1);
});
