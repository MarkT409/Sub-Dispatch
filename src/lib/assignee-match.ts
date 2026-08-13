import { normalizeContactName } from "@/lib/crew-lead-contacts";

export function stripAssigneeNoise(raw: string) {
  return raw
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function namesMatch(a: string, b: string) {
  const na = normalizeContactName(a);
  const nb = normalizeContactName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const a0 = na.split(" ")[0];
  const b0 = nb.split(" ")[0];
  if (a0 === b0 && (na.split(" ").length === 1 || nb.split(" ").length === 1)) {
    return true;
  }
  return na.includes(nb) || nb.includes(na);
}

/** True when a board assignee string refers to this person (not merely their team). */
export function assigneeMatchesPerson(
  assignedTo: string | null | undefined,
  personName: string,
): boolean {
  if (!assignedTo?.trim() || !personName.trim()) return false;
  const assignee = stripAssigneeNoise(assignedTo);
  if (!assignee) return false;
  return namesMatch(assignee, personName);
}

/**
 * True when assignee is the team itself (e.g. "Lantana"), not a person on it.
 */
export function assigneeIsTeamName(
  assignedTo: string,
  teamName: string,
): boolean {
  return (
    normalizeContactName(stripAssigneeNoise(assignedTo)) ===
    normalizeContactName(teamName)
  );
}

export function findWorkerByAssignee<T extends { name: string }>(
  workers: T[],
  assignedTo: string,
): T | undefined {
  const cleaned = stripAssigneeNoise(assignedTo);
  const candidates = [cleaned, assignedTo.trim()].filter(Boolean);

  for (const c of candidates) {
    const exact = workers.find(
      (w) => normalizeContactName(w.name) === normalizeContactName(c),
    );
    if (exact) return exact;
  }

  return workers.find((w) => namesMatch(w.name, cleaned));
}
