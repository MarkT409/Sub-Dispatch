/**
 * Board left-column rows that count as company supervisors.
 * GMA and BOTAS are subcontractor-style rows, not supervisors.
 */
export const NON_SUPERVISOR_BOARD_CREWS = new Set(["GMA", "BOTAS"]);

export function isBoardSupervisorName(name: string) {
  return !NON_SUPERVISOR_BOARD_CREWS.has(name.trim().toUpperCase());
}

/** Staff who should always have scheduler read + write when present in app_users. */
export const BOARD_WRITE_STAFF_NAMES = ["Dustin", "Jacob"] as const;

export function nameGetsBoardWrite(name: string | null | undefined) {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return BOARD_WRITE_STAFF_NAMES.some(
    (s) => n === s.toLowerCase() || n.startsWith(`${s.toLowerCase()} `),
  );
}
