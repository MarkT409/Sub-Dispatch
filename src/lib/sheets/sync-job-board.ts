import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getJobBoardSpreadsheetId,
  getSheetGridWithColors,
  getSheetValues,
  hasGoogleSheetsEnv,
  listSpreadsheetSheets,
} from "@/lib/sheets/google-client";
import {
  getCurrentWeekMondayIso,
  isJobBoardSheet,
  parseJobBoardGrid,
  parseWeekTabMonday,
  todayIsoChicago,
  type ParsedBoardJob,
} from "@/lib/sheets/job-board-parse";
import { isLantanaJob } from "@/lib/sheets/worker-map";

export type SyncJobBoardResult = {
  ok: true;
  sheetsSynced: string[];
  upserted: number;
  cancelled: number;
  parsed: number;
};

function statusForWorkDate(workDate: string) {
  const today = todayIsoChicago();
  if (workDate === today) return "in_progress";
  return "scheduled";
}

function toRowFields(job: ParsedBoardJob) {
  return {
    title: job.title,
    site_address: job.site_address,
    client: job.crew_lead,
    job_type: "outgoing" as const,
    start_date: job.work_date,
    work_date: job.work_date,
    crew_lead: job.crew_lead,
    assigned_to: job.assigned_to,
    work_kind: job.work_kind,
    notes: job.notes,
    sheets_row_key: job.sheets_row_key,
    sheets_week: job.sheets_week,
    source: "google_sheets" as const,
  };
}

async function enrichFromTransferLog(
  spreadsheetId: string,
  jobs: ParsedBoardJob[],
): Promise<ParsedBoardJob[]> {
  if (jobs.length === 0) return jobs;

  try {
    const values = await getSheetValues(spreadsheetId, "Transfer Log", "B1:F2000");
    const byAddress = new Map<string, "rough" | "trim">();

    for (const row of values) {
      const kind = (row[2] ?? "").trim().toLowerCase();
      const address = (row[3] ?? "").trim().toLowerCase();
      if (!address) continue;
      if (kind === "rough" || kind === "trim") {
        byAddress.set(address, kind);
        const base = address.replace(/\s*\/\s*(ser|meter).*$/i, "").trim();
        if (base) byAddress.set(base, kind);
      }
    }

    return jobs.map((job) => {
      if (job.work_kind !== "unknown") return job;
      const kind = byAddress.get(job.site_address.toLowerCase());
      if (kind) return { ...job, work_kind: kind };
      return job;
    });
  } catch {
    return jobs;
  }
}

function pickCurrentWeekSheets(sheets: { title: string }[]) {
  const monday = getCurrentWeekMondayIso();
  const titles = new Set<string>();

  for (const sheet of sheets) {
    if (/^weekly board$/i.test(sheet.title.trim())) {
      titles.add(sheet.title);
    }
  }

  for (const sheet of sheets) {
    if (!isJobBoardSheet(sheet.title)) continue;
    if (/^weekly board$/i.test(sheet.title.trim())) continue;
    const sheetMonday = parseWeekTabMonday(sheet.title);
    if (sheetMonday === monday) titles.add(sheet.title);
  }

  if (titles.size === 0) {
    const dated = sheets
      .filter((s) => isJobBoardSheet(s.title) && !/^weekly board$/i.test(s.title.trim()))
      .map((s) => s.title);
    if (dated.length) titles.add(dated[dated.length - 1]);
  }

  return [...titles];
}

export async function syncJobBoard(
  supabase: SupabaseClient,
  options: { weeks?: "current" | "all" } = {},
): Promise<SyncJobBoardResult> {
  if (!hasGoogleSheetsEnv()) {
    throw new Error(
      "Google Sheets is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and GOOGLE_JOB_BOARD_SPREADSHEET_ID.",
    );
  }

  const spreadsheetId = getJobBoardSpreadsheetId();
  const sheets = await listSpreadsheetSheets(spreadsheetId);
  const mode = options.weeks ?? "current";

  const sheetTitles =
    mode === "all"
      ? sheets.filter((s) => isJobBoardSheet(s.title)).map((s) => s.title)
      : pickCurrentWeekSheets(sheets);

  let allJobs: ParsedBoardJob[] = [];
  const sheetsSynced: string[] = [];

  for (const title of sheetTitles) {
    const { values, colors } = await getSheetGridWithColors(spreadsheetId, title, "A1:G80");
    allJobs = allJobs.concat(parseJobBoardGrid(title, values, null, colors));
    sheetsSynced.push(title);
  }

  allJobs = await enrichFromTransferLog(spreadsheetId, allJobs);

  // Only Lantana Electric jobs (worker → invoice tab "Lantana").
  // Keep rough, trim, and service (Draw pays service as separate lines).
  allJobs = allJobs.filter(
    (job) =>
      isLantanaJob(job.assigned_to) &&
      (job.work_kind === "rough" ||
        job.work_kind === "trim" ||
        job.work_kind === "service"),
  );

  let upserted = 0;
  if (allJobs.length > 0) {
    const keys = allJobs.map((j) => j.sheets_row_key);
    const existingRows: { id: string; sheets_row_key: string; status: string }[] = [];

    for (let i = 0; i < keys.length; i += 200) {
      const slice = keys.slice(i, i + 200);
      const { data: existing, error: existingError } = await supabase
        .from("jobs")
        .select("id, sheets_row_key, status")
        .in("sheets_row_key", slice);
      if (existingError) throw new Error(existingError.message);
      existingRows.push(...((existing ?? []) as typeof existingRows));
    }

    const byKey = new Map(existingRows.map((row) => [row.sheets_row_key, row]));

    const toInsert = [];
    const toUpdate = [];

    for (const job of allJobs) {
      const fields = toRowFields(job);
      const prev = byKey.get(job.sheets_row_key);
      if (!prev) {
        toInsert.push({
          ...fields,
          status: statusForWorkDate(job.work_date),
        });
      } else {
        const nextStatus =
          prev.status === "cancelled" ? statusForWorkDate(job.work_date) : undefined;
        toUpdate.push({
          id: prev.id,
          ...fields,
          ...(nextStatus ? { status: nextStatus } : {}),
        });
      }
    }

    for (let i = 0; i < toInsert.length; i += 100) {
      const chunk = toInsert.slice(i, i + 100);
      const { error } = await supabase.from("jobs").insert(chunk);
      if (error) throw new Error(error.message);
      upserted += chunk.length;
    }

    for (let i = 0; i < toUpdate.length; i += 25) {
      const chunk = toUpdate.slice(i, i + 25);
      await Promise.all(
        chunk.map(async (row) => {
          const { id, ...rest } = row;
          const { error } = await supabase.from("jobs").update(rest).eq("id", id);
          if (error) throw new Error(error.message);
        }),
      );
      upserted += chunk.length;
    }
  }

  let cancelled = 0;
  for (const week of sheetsSynced) {
    const keys = allJobs.filter((j) => j.sheets_week === week).map((j) => j.sheets_row_key);
    const { data: existing, error: listError } = await supabase
      .from("jobs")
      .select("id, sheets_row_key, assigned_to")
      .eq("source", "google_sheets")
      .eq("sheets_week", week)
      .neq("status", "cancelled");

    if (listError) throw new Error(listError.message);

    const keySet = new Set(keys);
    const toCancel = (existing ?? []).filter(
      (row) =>
        (row.sheets_row_key && !keySet.has(row.sheets_row_key)) ||
        !isLantanaJob(row.assigned_to),
    );

    if (toCancel.length) {
      const { error: cancelError } = await supabase
        .from("jobs")
        .update({ status: "cancelled" })
        .in(
          "id",
          toCancel.map((r) => r.id),
        );
      if (cancelError) throw new Error(cancelError.message);
      cancelled += toCancel.length;
    }
  }

  // Also hide any leftover non-Lantana board jobs from older syncs (other weeks).
  const { data: foreignCrew, error: foreignError } = await supabase
    .from("jobs")
    .select("id, assigned_to")
    .eq("source", "google_sheets")
    .neq("status", "cancelled");
  if (foreignError) throw new Error(foreignError.message);

  const foreignIds = (foreignCrew ?? [])
    .filter((row) => !isLantanaJob(row.assigned_to))
    .map((row) => row.id);
  if (foreignIds.length) {
    for (let i = 0; i < foreignIds.length; i += 100) {
      const chunk = foreignIds.slice(i, i + 100);
      const { error } = await supabase
        .from("jobs")
        .update({ status: "cancelled" })
        .in("id", chunk);
      if (error) throw new Error(error.message);
    }
    cancelled += foreignIds.length;
  }

  return {
    ok: true,
    sheetsSynced,
    upserted,
    cancelled,
    parsed: allJobs.length,
  };
}
