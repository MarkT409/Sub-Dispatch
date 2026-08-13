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
};

/**
 * Prefer a single rough(+Ser) card:
 * - if any variant has / Ser, keep that (as rough)
 * - otherwise keep plain rough
 * - never keep a separate "service" sibling
 */
export function preferBoardJob<T extends DedupeJob>(a: T, b: T): T {
  const aAddr = a.site_address || a.title || "";
  const bAddr = b.site_address || b.title || "";
  const aSer = addressHasSer(aAddr);
  const bSer = addressHasSer(bAddr);
  if (aSer !== bSer) return aSer ? a : b;

  const aKind = String(a.work_kind || "");
  const bKind = String(b.work_kind || "");
  if (aKind === "service" && bKind !== "service") return b;
  if (bKind === "service" && aKind !== "service") return a;

  const aAssigned = Boolean(a.assigned_to?.trim());
  const bAssigned = Boolean(b.assigned_to?.trim());
  if (aAssigned !== bAssigned) return aAssigned ? a : b;

  const aActive = a.status !== "cancelled";
  const bActive = b.status !== "cancelled";
  if (aActive !== bActive) return aActive ? a : b;

  return a;
}

function groupKey(job: DedupeJob) {
  const cell = boardCellKey(job.sheets_row_key);
  if (cell) return `cell:${cell}`;
  const base = boardAddressBase(job.site_address || job.title);
  return `addr:${String(job.crew_lead || "").toLowerCase()}|${job.work_date || ""}|${base}`;
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
