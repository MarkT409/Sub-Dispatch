import type { WorkKind } from "@/lib/admin-types";

/** Stable board cell id — ignore work_kind suffix so re-detecting color doesn't orphan rows. */
export function boardCellKey(sheetsRowKey: string | null | undefined) {
  const key = String(sheetsRowKey || "").trim();
  if (!key) return "";
  const parts = key.split(":");
  if (parts.length < 2) return key;
  const maybeKind = parts[parts.length - 1]?.toLowerCase();
  if (
    maybeKind === "rough" ||
    maybeKind === "trim" ||
    maybeKind === "service" ||
    maybeKind === "unknown"
  ) {
    return parts.slice(0, -1).join(":");
  }
  return key;
}

/** Strip / Ser and / Meter for duplicate matching. */
export function boardAddressBase(address: string | null | undefined) {
  return String(address || "")
    .toLowerCase()
    .replace(/\s*\/\s*ser(vice)?\b/gi, "")
    .replace(/\s*\/\s*meter\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function addressHasSer(address: string | null | undefined) {
  return /\/\s*ser(vice)?\b/i.test(String(address || ""));
}

export function addressHasMeter(address: string | null | undefined) {
  return /\/\s*meter\b/i.test(String(address || ""));
}

type DedupeJob = {
  id?: string;
  site_address?: string | null;
  title?: string | null;
  assigned_to?: string | null;
  work_kind?: WorkKind | string | null;
  work_date?: string | null;
  crew_lead?: string | null;
  sheets_row_key?: string | null;
  status?: string | null;
  source?: string | null;
};

/**
 * Prefer a single board card per cell:
 * - google_sheets over manual (seed/sync twins)
 * - if any variant has / Ser, keep that (as rough)
 * - / Meter is always trim (green)
 * - never keep a separate "service" sibling
 */
export function preferBoardJob<T extends DedupeJob>(a: T, b: T): T {
  const aSrc = String(a.source || "");
  const bSrc = String(b.source || "");
  if (aSrc === "google_sheets" && bSrc === "manual") return a;
  if (bSrc === "google_sheets" && aSrc === "manual") return b;

  const aAddr = a.site_address || a.title || "";
  const bAddr = b.site_address || b.title || "";
  const aSer = addressHasSer(aAddr);
  const bSer = addressHasSer(bAddr);
  if (aSer !== bSer) return aSer ? a : b;

  const aMeter = addressHasMeter(aAddr);
  const bMeter = addressHasMeter(bAddr);
  const aKind = String(a.work_kind || "");
  const bKind = String(b.work_kind || "");

  if (aMeter || bMeter) {
    if (aKind === "trim" && bKind !== "trim") return a;
    if (bKind === "trim" && aKind !== "trim") return b;
    if (aMeter !== bMeter) return aMeter ? a : b;
  }

  if (aKind === "service" && bKind !== "service") return b;
  if (bKind === "service" && aKind !== "service") return a;

  // Prefer trim over mis-tagged rough when kinds disagree
  if (aKind === "trim" && bKind === "rough") return a;
  if (bKind === "trim" && aKind === "rough") return b;

  const aAssigned = Boolean(a.assigned_to?.trim());
  const bAssigned = Boolean(b.assigned_to?.trim());
  if (aAssigned !== bAssigned) return aAssigned ? a : b;

  const aActive = a.status !== "cancelled";
  const bActive = b.status !== "cancelled";
  if (aActive !== bActive) return aActive ? a : b;

  // Prefer a sheets_row_key (real board cell) over a blank one
  const aKey = Boolean(boardCellKey(a.sheets_row_key));
  const bKey = Boolean(boardCellKey(b.sheets_row_key));
  if (aKey !== bKey) return aKey ? a : b;

  return a;
}

/**
 * One board slot = crew + work_date + address (ignoring /Ser /Meter and source).
 * Do NOT key only on sheets_row_key — manual seed twins lack that key and would
 * otherwise sit beside the Sheets row forever.
 */
export function boardDedupeGroupKey(job: DedupeJob) {
  const base = boardAddressBase(job.site_address || job.title);
  return `addr:${String(job.crew_lead || "").toLowerCase()}|${job.work_date || ""}|${base}`;
}

/** @deprecated use boardDedupeGroupKey — kept for sync cell lookups */
function groupKey(job: DedupeJob) {
  return boardDedupeGroupKey(job);
}

/** One job per board cell / address. Winner keeps / Ser when present. */
export function dedupeBoardJobs<T extends DedupeJob>(jobs: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const job of jobs) {
    const key = groupKey(job);
    const list = groups.get(key) ?? [];
    list.push(job);
    groups.set(key, list);
  }

  const out: T[] = [];
  for (const list of groups.values()) {
    let winner = list[0]!;
    for (let i = 1; i < list.length; i++) {
      winner = preferBoardJob(winner, list[i]!);
    }
    if (winner.work_kind === "service") {
      const addr = winner.site_address || winner.title || "";
      winner = {
        ...winner,
        work_kind: "rough",
        site_address: addressHasSer(addr)
          ? addr
          : addr
            ? `${addr} / Ser`
            : addr,
      };
    }
    // / Meter is always trim (green on the board)
    const winnerAddr = winner.site_address || winner.title || "";
    if (addressHasMeter(winnerAddr) && winner.work_kind !== "trim") {
      winner = { ...winner, work_kind: "trim" };
    }
    out.push(winner);
  }
  return out;
}

/** Ids to cancel when collapsing duplicates (everything except the winner). */
export function duplicateJobIdsToCancel<T extends DedupeJob & { id: string }>(
  jobs: T[],
): string[] {
  const groups = new Map<string, T[]>();
  for (const job of jobs) {
    const key = groupKey(job);
    const list = groups.get(key) ?? [];
    list.push(job);
    groups.set(key, list);
  }

  const cancel: string[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    let winner = list[0]!;
    for (let i = 1; i < list.length; i++) {
      winner = preferBoardJob(winner, list[i]!);
    }
    for (const job of list) {
      if (job.id !== winner.id) cancel.push(job.id);
    }
  }
  return cancel;
}
