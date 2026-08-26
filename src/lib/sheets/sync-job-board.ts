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
import {
  buildCrewLookupFromBoard,
  parseTransferLogRows,
} from "@/lib/sheets/transfer-log";
import { notifyNewBoardJobs } from "@/lib/push/send";
import {
  boardCellKey,
  duplicateJobIdsToCancel,
  preferBoardJob,
} from "@/lib/board-dedupe";
import { isUncoloredBoardCrew } from "@/lib/board-typing";

export type SyncJobBoardResult = {
  ok: true;
  sheetsSynced: string[];
  upserted: number;
  cancelled: number;
  parsed: number;
  fromTransferLog?: number;
  notified?: number;
};

function statusForWorkDate(workDate: string) {
  const today = todayIsoChicago();
  if (workDate === today) return "in_progress";
  return "scheduled";
}

function toRowFields(job: ParsedBoardJob) {
  const hasSer = /\/\s*ser(vice)?\b/i.test(job.site_address);
  const freeform = isUncoloredBoardCrew(job.crew_lead);
  let work_kind = job.work_kind;
  let site_address = job.site_address;
  // Never store a separate "service" job — colored crews: rough + / Ser
  if (work_kind === "service") {
    if (freeform) {
      work_kind = "unknown";
    } else {
      work_kind = "rough";
      if (!hasSer && site_address) site_address = `${site_address} / Ser`;
    }
  }
  // / Meter is always trim (green) — except GMA freeform service rows
  if (/\/\s*meter\b/i.test(site_address || "") && !freeform) {
    work_kind = "trim";
  }
  // GMA random service stays uncolored unless sheets/r-t marked rough or trim
  if (freeform && work_kind !== "rough" && work_kind !== "trim") {
    work_kind = "unknown";
  }
  const sheets_row_key = job.sheets_row_key.replace(
    /:service$/i,
    freeform ? ":unknown" : ":rough",
  );
  return {
    title: site_address || job.title,
    site_address,
    client: job.crew_lead,
    job_type: "outgoing" as const,
    start_date: job.work_date,
    work_date: job.work_date,
    crew_lead: job.crew_lead,
    assigned_to: job.assigned_to,
    work_kind,
    notes: job.notes,
    sheets_row_key,
    sheets_week: job.sheets_week,
    source: "google_sheets" as const,
  };
}

/** One parsed job per board cell — keep / Ser when present. */
function dedupeParsedJobs(jobs: ParsedBoardJob[]): ParsedBoardJob[] {
  const byCell = new Map<string, ParsedBoardJob>();
  for (const job of jobs) {
    const cell = boardCellKey(job.sheets_row_key) || job.sheets_row_key;
    const prev = byCell.get(cell);
    if (!prev) {
      byCell.set(cell, job);
      continue;
    }
    const winner = preferBoardJob(
      {
        site_address: prev.site_address,
        assigned_to: prev.assigned_to,
        work_kind: prev.work_kind,
        sheets_row_key: prev.sheets_row_key,
      },
      {
        site_address: job.site_address,
        assigned_to: job.assigned_to,
        work_kind: job.work_kind,
        sheets_row_key: job.sheets_row_key,
      },
    );
    byCell.set(cell, winner.sheets_row_key === job.sheets_row_key ? job : prev);
  }
  return [...byCell.values()].map((job) => {
    if (job.work_kind !== "service") return job;
    if (isUncoloredBoardCrew(job.crew_lead)) {
      return {
        ...job,
        work_kind: "unknown" as const,
        sheets_row_key: job.sheets_row_key.replace(/:service$/i, ":unknown"),
      };
    }
    const addr = job.site_address;
    return {
      ...job,
      work_kind: "rough" as const,
      site_address: /\/\s*ser/i.test(addr) ? addr : `${addr} / Ser`,
      title: /\/\s*ser/i.test(addr) ? addr : `${addr} / Ser`,
      sheets_row_key: job.sheets_row_key.replace(/:service$/i, ":rough"),
    };
  });
}

async function enrichFromTransferLog(
  spreadsheetId: string,
  jobs: ParsedBoardJob[],
): Promise<ParsedBoardJob[]> {
  if (jobs.length === 0) return jobs;

  try {
    const values = await getSheetValues(
      spreadsheetId,
      "Transfer Log",
      "A1:G5000",
    );
    const byAddress = new Map<string, "rough" | "trim">();

    const start = values[0]?.[0]?.toLowerCase().includes("transferred")
      ? 1
      : 0;
    for (let i = start; i < values.length; i++) {
      const row = values[i] ?? [];
      const kind = (row[3] ?? "").trim().toLowerCase();
      const address = (row[4] ?? "").trim().toLowerCase();
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
      .filter(
        (s) =>
          isJobBoardSheet(s.title) &&
          !/^weekly board$/i.test(s.title.trim()),
      )
      .map((s) => s.title);
    if (dated.length) titles.add(dated[dated.length - 1]);
  }

  return [...titles];
}

function mergeJobs(primary: ParsedBoardJob[], secondary: ParsedBoardJob[]) {
  const byKey = new Map<string, ParsedBoardJob>();
  for (const job of secondary) byKey.set(job.sheets_row_key, job);
  for (const job of primary) byKey.set(job.sheets_row_key, job);
  return [...byKey.values()];
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
  const crewLookup = new Map<string, string>();

  if (mode === "all") {
    // Fast path: Transfer Log is the historical source of truth.
    // Pull supervisor names from column A of each week tab (no color grid).
    console.info("[board sync] backfill mode: Transfer Log + crew columns");
    for (const title of sheetTitles) {
      try {
        console.info(`[board sync] crew column: ${title}`);
        const values = await getSheetValues(spreadsheetId, title, "A1:A80");
        for (const [k, v] of buildCrewLookupFromBoard(title, values)) {
          crewLookup.set(k, v);
        }
        sheetsSynced.push(title);
      } catch (err) {
        console.error(`[board sync] skip tab ${title}:`, err);
      }
    }

    const logRows = await getSheetValues(
      spreadsheetId,
      "Transfer Log",
      "A1:G5000",
    );
    const logJobs = parseTransferLogRows(logRows, crewLookup);
    allJobs = logJobs;
    console.info(
      `[board sync] Transfer Log → ${logJobs.length} jobs across ${sheetsSynced.length} weeks`,
    );
  } else {
    for (const title of sheetTitles) {
      console.info(`[board sync] parsing tab: ${title}`);
      const { values, colors } = await getSheetGridWithColors(
        spreadsheetId,
        title,
        "A1:G80",
      );
      allJobs = allJobs.concat(parseJobBoardGrid(title, values, null, colors));
      for (const [k, v] of buildCrewLookupFromBoard(title, values)) {
        crewLookup.set(k, v);
      }
      sheetsSynced.push(title);
    }

    try {
      console.info("[board sync] merging Transfer Log gaps…");
      const logRows = await getSheetValues(
        spreadsheetId,
        "Transfer Log",
        "A1:G5000",
      );
      const logJobs = parseTransferLogRows(logRows, crewLookup);
      allJobs = mergeJobs(allJobs, logJobs);
      console.info(`[board sync] Transfer Log rows available: ${logJobs.length}`);
    } catch (err) {
      console.error("Transfer Log parse failed:", err);
    }
  }

  const fromTransferLog = mode === "all" ? allJobs.length : undefined;

  allJobs = await enrichFromTransferLog(spreadsheetId, allJobs);

  allJobs = allJobs.filter(
    (job) =>
      job.work_kind === "rough" ||
      job.work_kind === "trim" ||
      job.work_kind === "service" ||
      job.work_kind === "unknown",
  );
  allJobs = dedupeParsedJobs(allJobs);

  let upserted = 0;
  const insertedJobs: {
    id: string;
    title: string;
    site_address: string | null;
    work_kind: string | null;
    assigned_to: string | null;
  }[] = [];

  if (allJobs.length > 0) {
    const weeks = [...new Set(allJobs.map((j) => j.sheets_week))];
    const existingRows: {
      id: string;
      sheets_row_key: string;
      status: string;
    }[] = [];

    for (const week of weeks) {
      const { data: existing, error: existingError } = await supabase
        .from("jobs")
        .select("id, sheets_row_key, status")
        .eq("source", "google_sheets")
        .eq("sheets_week", week);
      if (existingError) throw new Error(existingError.message);
      existingRows.push(...((existing ?? []) as typeof existingRows));
    }

    const byKey = new Map(
      existingRows.map((row) => [row.sheets_row_key, row]),
    );
    const byCell = new Map<string, (typeof existingRows)[number]>();
    for (const row of existingRows) {
      const cell = boardCellKey(row.sheets_row_key);
      if (cell && !byCell.has(cell)) byCell.set(cell, row);
    }

    const toInsert = [];
    const toUpdate = [];
    const usedIds = new Set<string>();

    for (const job of allJobs) {
      const fields = toRowFields(job);
      const prev =
        byKey.get(job.sheets_row_key) ||
        byCell.get(boardCellKey(job.sheets_row_key));
      if (!prev || usedIds.has(prev.id)) {
        toInsert.push({
          ...fields,
          status: statusForWorkDate(job.work_date),
        });
      } else {
        usedIds.add(prev.id);
        const nextStatus =
          prev.status === "cancelled"
            ? statusForWorkDate(job.work_date)
            : undefined;
        toUpdate.push({
          id: prev.id,
          ...fields,
          ...(nextStatus ? { status: nextStatus } : {}),
        });
      }
    }

    for (let i = 0; i < toInsert.length; i += 100) {
      const chunk = toInsert.slice(i, i + 100);
      const { data: created, error } = await supabase
        .from("jobs")
        .insert(chunk)
        .select("id, title, site_address, work_kind, assigned_to");
      if (error) throw new Error(error.message);
      if (created?.length) insertedJobs.push(...created);
      upserted += chunk.length;
    }

    for (let i = 0; i < toUpdate.length; i += 25) {
      const chunk = toUpdate.slice(i, i + 25);
      await Promise.all(
        chunk.map(async (row) => {
          const { id, ...rest } = row;
          const { error } = await supabase
            .from("jobs")
            .update(rest)
            .eq("id", id);
          if (error) throw new Error(error.message);
        }),
      );
      upserted += chunk.length;
    }
  }

  let cancelled = 0;
  // Collapse address twins (e.g. manual seed + Sheets) for weeks we just touched.
  // Do NOT cancel jobs merely missing from a sparse parse — that wiped crews before.
  const weeksToCollapse =
    mode === "all"
      ? [...new Set(allJobs.map((j) => j.sheets_week))]
      : sheetsSynced;
  for (const week of weeksToCollapse) {
    if (!week) continue;
    const { data: remaining, error: remainError } = await supabase
      .from("jobs")
      .select(
        "id, site_address, title, assigned_to, work_kind, work_date, crew_lead, sheets_row_key, status, source",
      )
      .eq("sheets_week", week)
      .neq("status", "cancelled");
    // Also include manual jobs in the same date range (seed twins have no sheets_week)
    const weekJobs = allJobs.filter((j) => j.sheets_week === week);
    const dates = [...new Set(weekJobs.map((j) => j.work_date).filter(Boolean))];
    let manuals: typeof remaining = [];
    if (dates.length) {
      const { data: manualRows, error: manualErr } = await supabase
        .from("jobs")
        .select(
          "id, site_address, title, assigned_to, work_kind, work_date, crew_lead, sheets_row_key, status, source",
        )
        .eq("source", "manual")
        .in("work_date", dates)
        .neq("status", "cancelled");
      if (manualErr) throw new Error(manualErr.message);
      manuals = manualRows ?? [];
    }
    if (remainError) throw new Error(remainError.message);

    const pool = [...(remaining ?? []), ...manuals];
    const seen = new Set<string>();
    const unique = pool.filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });

    const twinIds = duplicateJobIdsToCancel(unique);
    if (twinIds.length) {
      const { error: twinError } = await supabase
        .from("jobs")
        .update({ status: "cancelled" })
        .in("id", twinIds);
      if (twinError) throw new Error(twinError.message);
      cancelled += twinIds.length;
    }
  }

  let notified = 0;
  if (insertedJobs.length) {
    try {
      const result = await notifyNewBoardJobs(supabase, insertedJobs);
      notified = result.sent;
    } catch (err) {
      console.error("notifyNewBoardJobs failed", err);
    }
  }

  return {
    ok: true,
    sheetsSynced,
    upserted,
    cancelled,
    parsed: allJobs.length,
    fromTransferLog,
    notified,
  };
}
