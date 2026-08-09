import type { WorkKind } from "@/lib/admin-types";
import { parseWeekTabMonday } from "@/lib/sheets/job-board-parse";

export type ParsedInvoiceRow = {
  invoice_row_key: string;
  invoice_week: string;
  job_label: string;
  work_kind: WorkKind;
  plan_name: string | null;
  plan_sqft: string | null;
  builder: string | null;
  address: string;
  address_key: string;
  gross: number | null;
  payout: number | null;
  profit: number | null;
  /** Best-effort Monday of the invoice week band */
  week_monday: string | null;
  work_date: string | null;
  sheet_row: number;
};

const JOB_TYPES = new Set(["rough", "trim", "service"]);

const WEEK_HEADER =
  /^(\d{1,2})\s*\/\s*(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*\/?\s*(\d{1,2})?$/;

export function normalizeAddressKey(address: string) {
  return address
    .toLowerCase()
    .replace(/\s*\/\s*(ser|meter|service)\b.*$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const text = String(raw).replace(/[$,]/g, "").trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function cell(row: string[] | undefined, index: number) {
  return String(row?.[index] ?? "").trim();
}

function isWeekHeaderRow(jobCol: string, addressCol: string) {
  if (jobCol && JOB_TYPES.has(jobCol.toLowerCase())) return false;
  return WEEK_HEADER.test(addressCol) || /^\d{1,2}\s*\/\s*\d{1,2}\s*[-–—]/.test(addressCol);
}

function weekMondayFromHeader(header: string): string | null {
  // Reuse compact parser by normalizing "7/6 - 7/10" → already slash form
  const normalized = header.replace(/\s+/g, " ").trim();
  return parseWeekTabMonday(normalized);
}

function workKindFromLabel(label: string): WorkKind {
  const lower = label.toLowerCase();
  if (lower === "rough") return "rough";
  if (lower === "trim") return "trim";
  if (lower === "service") return "service";
  return "unknown";
}

/**
 * Parse Lantana InvoiceTemplate grid (rows from getSheetValues A11:I…).
 * Row 11 in sheet = index 0 if range starts at A11; pass absolute sheet row via startRow.
 */
/**
 * Parse local DRAW tab pulled from parent Draw
 * (headers: date | SUBCONTRACTOR | ADDRESS | TYPE | PRICE).
 */
export function parseDrawSheet(
  rows: string[][],
  options: { startSheetRow?: number } = {},
): ParsedInvoiceRow[] {
  const startSheetRow = options.startSheetRow ?? 1;
  if (!rows.length) return [];

  const header = rows[0] ?? [];
  const col = {
    date: findHeaderIndex(header, ["date", "friday", "week", "draw date", "f"]),
    address: findHeaderIndex(header, ["address", "job address", "site"]),
    type: findHeaderIndex(header, ["type", "job", "work", "phase"]),
    price: findHeaderIndex(header, ["price", "gross", "amount", "pay"]),
  };

  // Fallback to known layout A=date B=sub C=address D=type E=price
  if (col.address < 0) col.address = 2;
  if (col.type < 0) col.type = 3;
  if (col.price < 0) col.price = 4;
  if (col.date < 0) col.date = 0;

  const results: ParsedInvoiceRow[] = [];

  rows.forEach((row, index) => {
    if (index === 0) return;
    const sheetRow = startSheetRow + index;
    const address = cell(row, col.address);
    const typeLabel = cell(row, col.type);
    const dateRaw = cell(row, col.date);
    if (!address || !typeLabel) return;

    const work_kind = workKindFromLabel(typeLabel);
    if (work_kind === "unknown") return;

    const address_key = normalizeAddressKey(address);
    if (!address_key) return;

    const gross = parseNumber(row[col.price]);
    const work_date = parseSheetDate(dateRaw);
    const invoice_week = work_date || dateRaw || "draw";
    const invoice_row_key = `draw:${invoice_week}:${address_key}:${work_kind}`;

    results.push({
      invoice_row_key,
      invoice_week,
      job_label: typeLabel,
      work_kind,
      plan_name: null,
      plan_sqft: null,
      builder: null,
      address,
      address_key,
      gross,
      payout: null,
      profit: null,
      week_monday: work_date,
      work_date,
      sheet_row: sheetRow,
    });
  });

  return results;
}

function findHeaderIndex(header: string[], names: string[]) {
  const normalized = header.map((h) => String(h || "").trim().toLowerCase());
  for (const name of names) {
    const exact = normalized.indexOf(name);
    if (exact >= 0) return exact;
  }
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (!h) continue;
    for (const name of names) {
      // Avoid short tokens like "f" matching inside "subcontractor"
      if (name.length < 3) continue;
      if (h.includes(name)) return i;
    }
  }
  return -1;
}

/** Accepts m/d/yyyy, yyyy-mm-dd, or Sheets serial-ish display strings. */
function parseSheetDate(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    let year = Number(us[3]);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return null;
  const d = new Date(parsed);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function parseInvoiceTemplate(
  rows: string[][],
  options: { startSheetRow?: number } = {},
): ParsedInvoiceRow[] {
  const startSheetRow = options.startSheetRow ?? 11;
  const results: ParsedInvoiceRow[] = [];
  let currentWeek = "";
  let weekMonday: string | null = null;

  rows.forEach((row, index) => {
    const sheetRow = startSheetRow + index;
    const jobCol = cell(row, 0);
    const plan = cell(row, 1) || null;
    const sqftRaw = cell(row, 2);
    const builder = cell(row, 3) || null;
    const addressOrWeek = cell(row, 4);
    const gross = parseNumber(row[5]);
    const payout = parseNumber(row[6]);
    const profit = parseNumber(row[7]);

    if (!addressOrWeek && !jobCol) return;

    if (isWeekHeaderRow(jobCol, addressOrWeek)) {
      currentWeek = addressOrWeek;
      weekMonday = weekMondayFromHeader(addressOrWeek);
      return;
    }

    const kindLabel = jobCol.toLowerCase();
    if (!JOB_TYPES.has(kindLabel)) return;
    if (!addressOrWeek) return;

    // Skip pure notes / section junk
    if (/^notes$/i.test(addressOrWeek)) return;

    const work_kind = workKindFromLabel(jobCol);
    const address = addressOrWeek;
    const address_key = normalizeAddressKey(address);
    if (!address_key) return;

    const week = currentWeek || "unknown";
    const invoice_row_key = `${week}:${address_key}:${work_kind}:${sheetRow}`;

    let work_date: string | null = weekMonday;
    // Service rows often same day as paired rough; keep week monday as date anchor
    if (!work_date && weekMonday) work_date = weekMonday;

    const plan_sqft =
      sqftRaw && Number.isFinite(Number(sqftRaw))
        ? String(Math.round(Number(sqftRaw)))
        : sqftRaw || null;

    results.push({
      invoice_row_key,
      invoice_week: week,
      job_label: jobCol,
      work_kind,
      plan_name: plan,
      plan_sqft,
      builder,
      address,
      address_key,
      gross,
      payout,
      profit,
      week_monday: weekMonday,
      work_date,
      sheet_row: sheetRow,
    });
  });

  return results;
}

export function hasInvoiceEnv() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GOOGLE_INVOICE_SPREADSHEET_ID,
  );
}

export function getInvoiceSpreadsheetId() {
  const id = process.env.GOOGLE_INVOICE_SPREADSHEET_ID?.trim();
  if (!id) throw new Error("GOOGLE_INVOICE_SPREADSHEET_ID is not set");
  return id;
}
