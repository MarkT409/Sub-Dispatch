import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveInvoiceTab } from "@/lib/sheets/worker-map";
import { sendCrewAssignmentNotifications } from "@/lib/notifications/crew-notifications";
import { fetchSubTeams } from "@/lib/sub-teams-data";
import {
  assigneeIsTeamName,
  findWorkerByAssignee,
  stripAssigneeNoise,
} from "@/lib/assignee-match";

export type DispatchResult = {
  ok: true;
  jobsConsidered: number;
  jobsDispatched: number;
  assignmentsCreated: number;
  teamsNotified: string[];
  skipped: { jobId: string; reason: string }[];
};

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

async function ensureCrewMember(
  supabase: SupabaseClient,
  name: string,
  cache: Map<string, string>,
) {
  const key = normalizeName(name);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;

  const { data: existing } = await supabase
    .from("crew_members")
    .select("id, name")
    .ilike("name", name.trim())
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    cache.set(key, existing.id);
    cache.set(normalizeName(existing.name), existing.id);
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("crew_members")
    .insert({ name: name.trim(), active: true })
    .select("id, name")
    .single();

  if (error || !created) {
    console.error("ensureCrewMember failed:", error?.message);
    return null;
  }

  cache.set(key, created.id);
  return created.id;
}

/**
 * Dispatch board jobs for selected work dates (and optional sub assignees):
 * assigned_to → match that person on the Crew-tab team (Leo → Leo only).
 * If the assignee is just the team name, notify that team's leads.
 * If no leads / no team, fall back to the assignee string.
 */
export async function dispatchBoardJobs(
  supabase: SupabaseClient,
  options: { days: string[]; assignees?: string[] },
): Promise<DispatchResult> {
  const days = [...new Set(options.days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))];
  if (days.length === 0) {
    return {
      ok: true,
      jobsConsidered: 0,
      jobsDispatched: 0,
      assignmentsCreated: 0,
      teamsNotified: [],
      skipped: [],
    };
  }

  const assigneeFilter = (options.assignees ?? [])
    .map((n) => normalizeName(n))
    .filter(Boolean);
  const assigneeSet =
    assigneeFilter.length > 0 ? new Set(assigneeFilter) : null;

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(
      "id, title, site_address, work_date, crew_lead, assigned_to, work_kind, status",
    )
    .in("work_date", days)
    .neq("status", "cancelled");

  if (error) throw new Error(error.message);

  const scopedJobs = (jobs ?? []).filter((job) => {
    const assignee = (job.assigned_to || "").trim();
    if (!assignee) return false;
    if (!assigneeSet) return true;
    return assigneeSet.has(normalizeName(assignee));
  });

  const { teams } = await fetchSubTeams(supabase);
  const teamByName = new Map(
    teams.map((t) => [normalizeName(t.name), t] as const),
  );

  const memberCache = new Map<string, string>();
  const { data: allMembers } = await supabase
    .from("crew_members")
    .select("id, name")
    .eq("active", true);
  for (const m of allMembers ?? []) {
    memberCache.set(normalizeName(m.name), m.id);
  }

  const skipped: { jobId: string; reason: string }[] = [];
  const teamsNotified = new Set<string>();
  let jobsDispatched = 0;
  let assignmentsCreated = 0;

  for (const job of scopedJobs) {
    const assignee = (job.assigned_to || "").trim();
    if (!assignee) {
      skipped.push({ jobId: job.id, reason: "No assignee on job" });
      continue;
    }

    const teamName =
      resolveInvoiceTab(assignee) ||
      resolveInvoiceTab(assignee.split(/\s+/)[0] || "") ||
      null;

    const team = teamName ? teamByName.get(normalizeName(teamName)) : null;

    const workerNames = new Set<string>();

    if (team) {
      teamsNotified.add(team.name);

      const matched = findWorkerByAssignee(team.workers, assignee);
      const assigneeIsTeam = assigneeIsTeamName(assignee, team.name);

      if (matched && !assigneeIsTeam) {
        // Person-specific: only that worker (e.g. Leo, not all Lantana leads)
        workerNames.add(matched.name);
      } else if (assigneeIsTeam) {
        const leads = team.workers.filter((w) => w.is_lead);
        if (leads.length > 0) {
          for (const w of leads) workerNames.add(w.name);
        } else {
          workerNames.add(stripAssigneeNoise(assignee) || assignee);
        }
      } else {
        // Team known but no worker match — still notify the typed assignee only
        workerNames.add(stripAssigneeNoise(assignee) || assignee);
      }
    } else {
      teamsNotified.add(assignee);
      workerNames.add(stripAssigneeNoise(assignee) || assignee);
    }

    const crewMemberIds: string[] = [];
    for (const name of workerNames) {
      const id = await ensureCrewMember(supabase, name, memberCache);
      if (id && !crewMemberIds.includes(id)) crewMemberIds.push(id);
    }

    if (crewMemberIds.length === 0) {
      skipped.push({
        jobId: job.id,
        reason: `Could not resolve crew members for “${assignee}”`,
      });
      continue;
    }

    const rows = crewMemberIds.map((crew_member_id) => ({
      job_id: job.id,
      crew_member_id,
      status: "pending" as const,
      role: "crew" as const,
      assigned_at: new Date().toISOString(),
    }));

    const { data: upserted, error: upErr } = await supabase
      .from("job_assignments")
      .upsert(rows, { onConflict: "job_id,crew_member_id" })
      .select("id");

    if (upErr) {
      skipped.push({ jobId: job.id, reason: upErr.message });
      continue;
    }

    assignmentsCreated += upserted?.length ?? rows.length;
    jobsDispatched += 1;

    await sendCrewAssignmentNotifications(supabase, job.id, crewMemberIds);
  }

  return {
    ok: true,
    jobsConsidered: scopedJobs.length,
    jobsDispatched,
    assignmentsCreated,
    teamsNotified: [...teamsNotified].sort((a, b) => a.localeCompare(b)),
    skipped,
  };
}
