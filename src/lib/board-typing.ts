import type { WorkKind } from "@/lib/admin-types";

export type ParsedBoardTyping = {
  work_kind: "rough" | "trim";
  /** Display text with r/t removed (address – assignee, +L kept). */
  display: string;
  address: string;
  assigned_to: string | null;
};

/**
 * Board typing shortcuts (Sheets-compatible):
 *   r 1980 Campus Dr – Juan      → rough (blue), "r" removed
 *   r 1930 Longspurs – Juan +L   → rough (blue), +L kept
 *   t 2400 Shady Grove – Colt    → trim (green), "t" removed
 *   (empty)                      → clear cell
 */
export function parseBoardTyping(
  raw: string,
  existingKind?: WorkKind | null,
): ParsedBoardTyping | "clear" | null {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) return "clear";

  let text = trimmed;
  let work_kind: "rough" | "trim" | null = null;

  const prefix = text.match(/^(rs|tm|r|t)\s+/i);
  if (prefix) {
    const p = prefix[1].toLowerCase();
    work_kind = p === "r" || p === "rs" ? "rough" : "trim";
    text = text.slice(prefix[0].length).trim();
  } else if (
    existingKind === "rough" ||
    existingKind === "trim" ||
    existingKind === "service"
  ) {
    work_kind = existingKind === "service" ? "rough" : existingKind;
  }

  if (!work_kind || !text) return null;

  let address = text;
  let assigned_to: string | null = null;
  const dashMatch = text.match(/^(.*?)(?:\s+[-–—]\s+)(.+)$/);
  if (dashMatch) {
    address = dashMatch[1].trim();
    assigned_to = dashMatch[2].trim() || null;
  }

  if (!address) return null;

  const display = assigned_to ? `${address} – ${assigned_to}` : address;

  return {
    work_kind,
    display,
    address,
    assigned_to,
  };
}

export function formatBoardCellDisplay(job: {
  site_address?: string | null;
  title?: string | null;
  assigned_to?: string | null;
}) {
  const address = (job.site_address || job.title || "").trim();
  if (!address) return "";
  // If address already contains the dash + assignee, don't double up
  if (job.assigned_to && !/\s[-–—]\s/.test(address)) {
    return `${address} – ${job.assigned_to}`;
  }
  return address;
}

export function boardKindColor(kind: string | null | undefined) {
  // Board is blue (rough) / green (trim) only — treat legacy "service" as blue
  if (kind === "rough" || kind === "service") {
    return "bg-[#b3ceff] text-gray-900";
  }
  if (kind === "trim") return "bg-[#b3ecd0] text-gray-900";
  return "bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100";
}
