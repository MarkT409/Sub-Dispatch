import type { WorkKind } from "@/lib/admin-types";

export type ParsedBoardJob = {
  sheets_row_key: string;
  sheets_week: string;
  title: string;
  site_address: string;
  work_date: string;
  crew_lead: string;
  assigned_to: string | null;
  work_kind: WorkKind;
  notes: string | null;
  cell_ref: string;
  raw: string;
};

export type CellColorMap = Record<string, string>; // A1 ref → #rrggbb

const SKIP_SHEETS = new Set([
  "instructions & script",
  "transfer log",
  "sheet2",
  "sheet3",
]);

const SKIP_CELL =
  /^(nada(\s+para\s+mi)?|n\/a|none|-|—|–)$/i;

const NOISE_CELL =
  /(did not work|sitting\*\*\*|punch for|contact\s*#|rough teams|trim teams|service subs)/i;

/** Apps Script rough blues / trim greens (plus known off-shades). */
const ROUGH_COLORS = new Set(["#b3ceff", "#d6e4ff", "#c9daf8"]);
const TRIM_COLORS = new Set(["#b3ecd0", "#d6f5e3"]);

const DAY_HEADERS: Record<string, number> = {
  mon: 0,
  monday: 0,
  tue: 1,
  tues: 1,
  tuesday: 1,
  wed: 2,
  wednesday: 2,
  thu: 3,
  thur: 3,
  thurs: 3,
  thursday: 3,
  fri: 4,
  friday: 4,
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Add days to an ISO date (UTC noon to avoid DST edge issues). */
export function addDaysIso(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Monday of the current calendar week in America/Chicago (for Mon–Fri board tabs). */
export function getCurrentWeekMondayIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const weekdayIndex: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = weekdayIndex[weekday] ?? 1;
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  return addDaysIso(toIsoDate(year, month, day), -daysFromMonday);
}

/**
 * Billing / dashboard week starts Saturday and ends the following Friday
 * (Sat work bills next Thu, paid the Friday after).
 */
export function getCurrentBillingWeekStartIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sat";
  const weekdayIndex: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = weekdayIndex[weekday] ?? 6;
  // Days since Saturday: Sat=0, Sun=1, … Fri=6
  const daysFromSaturday = (dow + 1) % 7;
  return addDaysIso(toIsoDate(year, month, day), -daysFromSaturday);
}

export function getCurrentBillingWeekEndIso(now = new Date()) {
  return addDaysIso(getCurrentBillingWeekStartIso(now), 6);
}

export function getCurrentBillingWeekRange(now = new Date()) {
  const start = getCurrentBillingWeekStartIso(now);
  return { start, end: addDaysIso(start, 6) };
}

function parseMdToken(token: string): { month: number; day: number } | null {
  const cleaned = token.replace(/\s+/g, "");
  if (!/^\d{2,4}$/.test(cleaned)) return null;

  if (cleaned.length === 4) {
    const month = Number(cleaned.slice(0, 2));
    const day = Number(cleaned.slice(2));
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day };
    return null;
  }

  if (cleaned.length === 3) {
    const month = Number(cleaned[0]);
    const day = Number(cleaned.slice(1));
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day };
    return null;
  }

  const month = Number(cleaned[0]);
  const day = Number(cleaned[1]);
  if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day };
  return null;
}

function resolveYearForMonth(month: number, yearHint?: number) {
  const year = yearHint ?? new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;
  if (month === 12 && nowMonth <= 2) return year - 1;
  return year;
}

/**
 * Parse week tab names:
 * - "8/3 - 8/7", "08/03 - 08/07"
 * - "810 - 814", "83 - 87", "0629 - 0702", "525-529"
 */
export function parseWeekTabMonday(sheetTitle: string, yearHint?: number): string | null {
  const title = sheetTitle.trim();
  if (/^weekly board$/i.test(title)) {
    return getCurrentWeekMondayIso();
  }

  const slash = title.match(
    /^(\d{1,2})\s*\/\s*(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*\/\s*(\d{1,2})$/,
  );
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const year = resolveYearForMonth(month, yearHint);
    return toIsoDate(year, month, day);
  }

  const compact = title.match(/^(\d{2,4})\s*[-–—]\s*(\d{2,4})$/);
  if (!compact) return null;

  const start = parseMdToken(compact[1]);
  if (!start) return null;

  const year = resolveYearForMonth(start.month, yearHint);
  return toIsoDate(year, start.month, start.day);
}

export function isJobBoardSheet(title: string) {
  const lower = title.trim().toLowerCase();
  if (SKIP_SHEETS.has(lower)) return false;
  if (/^weekly board$/i.test(title.trim())) return true;
  return Boolean(parseWeekTabMonday(title));
}

export function workKindFromBackground(hex: string | null | undefined): WorkKind | null {
  if (!hex) return null;
  const h = hex.toLowerCase();
  if (ROUGH_COLORS.has(h)) return "rough";
  if (TRIM_COLORS.has(h)) return "trim";

  // Fuzzy: blue-forward → rough, green-forward → trim
  const m = h.match(/^#([0-9a-f]{6})$/);
  if (!m) return null;
  const r = Number.parseInt(m[1].slice(0, 2), 16);
  const g = Number.parseInt(m[1].slice(2, 4), 16);
  const b = Number.parseInt(m[1].slice(4, 6), 16);
  if (r > 240 && g > 240 && b > 240) return null;
  if (b > g + 20 && b > r + 20) return "rough";
  if (g > b + 20 && g > r) return "trim";
  return null;
}

export function parseJobCellText(
  raw: string,
  backgroundHex?: string | null,
): {
  address: string;
  assigned_to: string | null;
  work_kind: WorkKind;
  notes: string | null;
} | null {
  let text = raw.replace(/\s+/g, " ").trim();
  if (!text || SKIP_CELL.test(text) || NOISE_CELL.test(text)) return null;

  let work_kind: WorkKind = workKindFromBackground(backgroundHex) ?? "unknown";

  // Apps Script prefixes: rs / r / tm / t
  const prefix = text.match(/^(rs|tm|r|t)\s+/i);
  if (prefix) {
    const p = prefix[1].toLowerCase();
    work_kind = p === "r" || p === "rs" ? "rough" : "trim";
    text = text.slice(prefix[0].length).trim();
  }

  const lower = text.toLowerCase();
  if (lower.includes("/ meter") || lower.includes("/meter")) work_kind = "trim";
  else if (lower.includes("/ ser") || lower.includes("/ser")) work_kind = "rough";

  let addressPart = text;
  let assigned_to: string | null = null;
  const dashMatch = text.match(/^(.*?)(?:\s+[-–—]\s+)(.+)$/);
  if (dashMatch) {
    addressPart = dashMatch[1].trim();
    assigned_to = dashMatch[2].trim() || null;
  }

  if (assigned_to) {
    assigned_to = assigned_to.replace(/\s*\([^)]*\)\s*$/, "").trim() || assigned_to;
  }

  const noteBits: string[] = [];
  const flags = addressPart.match(/\/\s*(Ser|Meter|Service)[^\s-]*/gi);
  if (flags) noteBits.push(...flags.map((f) => f.trim()));
  const paren = text.match(/\(([^)]+)\)/g);
  if (paren) noteBits.push(...paren);

  const address = addressPart
    .replace(/\/\s*(Ser|Meter|Service)\b[^/]*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!address || SKIP_CELL.test(address)) return null;
  if (address.length < 3) return null;

  return {
    address,
    assigned_to,
    work_kind,
    notes: noteBits.length ? noteBits.join(" · ") : null,
  };
}

function colLetter(indexZeroBased: number) {
  let n = indexZeroBased;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function isCrewLeadLabel(value: string) {
  const text = value.trim();
  if (!text || text.length > 24) return false;
  if (/^crew$/i.test(text)) return false;
  if (DAY_HEADERS[text.toLowerCase()] !== undefined) return false;
  return /^[A-Za-z][A-Za-z0-9 .'-]{1,20}$/.test(text);
}

type BoardLayout = {
  headerRowIndex: number;
  crewCol: number;
  /** column index → day offset 0=Mon … 4=Fri */
  dayCols: Map<number, number>;
};

/**
 * Detect CREW + MON–FRI from the header row.
 * Supports A=CREW / B–F=days (older tabs) and B=CREW / C–G=days (Apps Script layout).
 */
export function detectBoardLayout(rows: string[][]): BoardLayout {
  const fallback: BoardLayout = {
    headerRowIndex: 0,
    crewCol: 0,
    dayCols: new Map([
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 3],
      [5, 4],
    ]),
  };

  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r] ?? [];
    let crewCol = -1;
    const dayCols = new Map<number, number>();

    row.forEach((cell, c) => {
      const text = String(cell ?? "")
        .trim()
        .toLowerCase();
      if (!text) return;
      if (text === "crew") crewCol = c;
      const day = DAY_HEADERS[text];
      if (day !== undefined) dayCols.set(c, day);
    });

    if (dayCols.size >= 3) {
      if (crewCol < 0) {
        // Prefer column immediately left of Monday
        const monCol = [...dayCols.entries()].find(([, off]) => off === 0)?.[0];
        crewCol = monCol != null && monCol > 0 ? monCol - 1 : 0;
      }
      return { headerRowIndex: r, crewCol, dayCols };
    }
  }

  // Apps Script default: days C–G (indexes 2–6), crew in A or B
  return {
    headerRowIndex: 0,
    crewCol: 0,
    dayCols: new Map([
      [2, 0],
      [3, 1],
      [4, 2],
      [5, 3],
      [6, 4],
    ]),
  };
}

export function parseJobBoardGrid(
  sheetTitle: string,
  rows: string[][],
  mondayIso?: string | null,
  colors?: CellColorMap,
): ParsedBoardJob[] {
  const monday = mondayIso ?? parseWeekTabMonday(sheetTitle);
  if (!monday) return [];

  const layout = detectBoardLayout(rows);
  const jobs: ParsedBoardJob[] = [];
  let crewLead = "";

  rows.forEach((row, rowIndex) => {
    if (rowIndex <= layout.headerRowIndex) return;
    const rowNumber = rowIndex + 1;

    const crewCell = (row[layout.crewCol] ?? "").trim();
    if (crewCell && isCrewLeadLabel(crewCell)) {
      crewLead = crewCell.toUpperCase();
    }
    // Also check column A if crew is in B (name sometimes still in A)
    if (!crewLead || layout.crewCol > 0) {
      const colA = (row[0] ?? "").trim();
      if (colA && isCrewLeadLabel(colA)) crewLead = colA.toUpperCase();
    }
    if (!crewLead) return;

    for (const [colIndex, dayOffset] of layout.dayCols.entries()) {
      const raw = (row[colIndex] ?? "").trim();
      if (!raw) continue;

      const cell_ref = `${colLetter(colIndex)}${rowNumber}`;
      const bg = colors?.[cell_ref] ?? null;
      const parsed = parseJobCellText(raw, bg);
      if (!parsed) continue;

      const work_date = addDaysIso(monday, dayOffset);
      const sheets_week = sheetTitle.trim();
      const sheets_row_key = `${sheets_week}:${cell_ref}`;

      jobs.push({
        sheets_row_key,
        sheets_week,
        title: parsed.address,
        site_address: parsed.address,
        work_date,
        crew_lead: crewLead,
        assigned_to: parsed.assigned_to,
        work_kind: parsed.work_kind,
        notes: parsed.notes,
        cell_ref,
        raw,
      });
    }
  });

  return jobs;
}

export function todayIsoChicago(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return toIsoDate(year, month, day);
}
