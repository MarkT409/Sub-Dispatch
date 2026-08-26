import type { WorkKind } from "@/lib/admin-types";
import {
  addDaysIso,
  parseWeekTabMonday,
  type ParsedBoardJob,
} from "@/lib/sheets/job-board-parse";

const COL_LETTER = ["A", "B", "C", "D", "E", "F", "G"];

function isCrewLeadLabel(value: string) {
  const text = value.trim();
  if (!text || text.length > 24) return false;
  if (/^crew$/i.test(text)) return false;
  if (/^(mon|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday)$/i.test(text)) {
    return false;
  }
  return /^[A-Za-z][A-Za-z0-9 .'-]{1,20}$/.test(text);
}

/**
 * Transfer Log columns (Apps Script appendRow):
 * A Transferred At | B Job ID | C Invoice Tab | D Job Type | E Address | F Worker | G Board Tab
 *
 * Job ID: `${boardName}_R${row}_C${col}_${cellVal}` where col 2=Mon … 6=Fri.
 */
export function parseTransferLogRows(
  rows: string[][],
  crewByBoardRow: Map<string, string>,
): ParsedBoardJob[] {
  const jobs: ParsedBoardJob[] = [];
  const start = rows[0]?.[0]?.toLowerCase().includes("transferred") ? 1 : 0;

  for (let i = start; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const jobId = String(row[1] ?? "").trim();
    const jobType = String(row[3] ?? "").trim().toLowerCase();
    const address = String(row[4] ?? "").trim();
    const worker = String(row[5] ?? "").trim() || null;
    const boardTab = String(row[6] ?? "").trim();

    if (!jobId || !address || !boardTab) continue;

    let work_kind: WorkKind = "unknown";
    if (jobType === "rough") work_kind = "rough";
    else if (jobType === "trim") work_kind = "trim";
    else if (jobType === "service") work_kind = "service";

    const idMatch = jobId.match(/^(.*)_R(\d+)_C(\d+)_([\s\S]*)$/);
    if (!idMatch) continue;

    const sheetTitle = (idMatch[1].trim() || boardTab).trim();
    const rowNum = Number(idMatch[2]);
    const colNum = Number(idMatch[3]); // 2=Mon … 6=Fri
    if (!rowNum || colNum < 2 || colNum > 6) continue;

    const monday =
      parseWeekTabMonday(sheetTitle) ?? parseWeekTabMonday(boardTab);
    if (!monday) continue;

    const dayOffset = colNum - 2;
    const work_date = addDaysIso(monday, dayOffset);
    const cell_ref = `${COL_LETTER[colNum - 1] ?? "B"}${rowNum}`;
    const crew_lead = (
      crewByBoardRow.get(`${sheetTitle}::${rowNum}`) ||
      crewByBoardRow.get(`${boardTab}::${rowNum}`) ||
      ""
    ).toUpperCase();
    if (!crew_lead) continue;

    const hasService =
      /\/\s*ser(vice)?\b/i.test(jobId) || /\+L\b/i.test(jobId);
    let site_address = address;
    if (hasService && !/\/\s*ser(vice)?\b/i.test(site_address)) {
      site_address = `${site_address} / Ser`;
    }

    jobs.push({
      sheets_row_key: `${sheetTitle}:${cell_ref}:${work_kind === "service" ? "rough" : work_kind}`,
      sheets_week: sheetTitle,
      title: site_address,
      site_address,
      work_date,
      crew_lead,
      assigned_to: worker,
      work_kind: work_kind === "service" ? "rough" : work_kind,
      notes: null,
      cell_ref,
      raw: jobId,
    });
  }

  return jobs;
}

/** Build supervisor lookup: boardTitle::rowNumber → crew name (col A, carried down). */
export function buildCrewLookupFromBoard(
  sheetTitle: string,
  values: string[][],
): Map<string, string> {
  const map = new Map<string, string>();
  let current = "";
  values.forEach((row, idx) => {
    const rowNum = idx + 1;
    const cell = String(row[0] ?? "").trim();
    if (cell && isCrewLeadLabel(cell)) {
      current = cell.toUpperCase();
    }
    if (current) {
      map.set(`${sheetTitle}::${rowNum}`, current);
    }
  });
  return map;
}
