import type { WorkKind } from "@/lib/admin-types";
import { addDaysIso, getCurrentWeekMondayIso } from "@/lib/sheets/job-board-parse";
import { dedupeBoardJobs } from "@/lib/board-dedupe";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BoardCrew = {
  id: string;
  name: string;
  sort_order: number;
  row_slots: number;
};

export type BoardJob = {
  id: string;
  title: string;
  site_address: string | null;
  work_date: string | null;
  crew_lead: string | null;
  assigned_to: string | null;
  work_kind: WorkKind | null;
  notes: string | null;
  status: string;
  source: string;
};

export function resolveWeekStart(weekStart?: string | null) {
  if (weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return weekStart;
  }
  return getCurrentWeekMondayIso();
}

export function weekDayDates(weekStart: string) {
  return [0, 1, 2, 3, 4].map((offset) => addDaysIso(weekStart, offset));
}

export function formatWeekLabel(weekStart: string) {
  const fri = addDaysIso(weekStart, 4);
  const fmt = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${Number(m)}/${Number(d)}`;
  };
  return `${fmt(weekStart)} - ${fmt(fri)}`;
}

export async function fetchBoardData(
  supabase: SupabaseClient,
  weekStartRaw?: string | null,
) {
  const weekStart = resolveWeekStart(weekStartRaw);
  const days = weekDayDates(weekStart);
  const weekEnd = days[4];

  const [{ data: crews, error: crewsError }, { data: jobs, error: jobsError }] =
    await Promise.all([
      supabase
        .from("board_crews")
        .select("id, name, sort_order, row_slots")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("jobs")
        .select(
          "id, title, site_address, work_date, crew_lead, assigned_to, work_kind, notes, status, source",
        )
        .neq("status", "cancelled")
        .gte("work_date", weekStart)
        .lte("work_date", weekEnd)
        .order("work_date", { ascending: true }),
    ]);

  if (crewsError) {
    console.error("board_crews fetch failed:", crewsError.message);
  }
  if (jobsError) {
    console.error("board jobs fetch failed:", jobsError.message);
  }

  return {
    weekStart,
    weekEnd,
    weekLabel: formatWeekLabel(weekStart),
    days,
    crews: (crews ?? []) as BoardCrew[],
    jobs: dedupeBoardJobs((jobs ?? []) as BoardJob[]),
  };
}

export function matchCrewName(crewLead: string | null | undefined, crewName: string) {
  if (!crewLead) return false;
  return crewLead.trim().toLowerCase() === crewName.trim().toLowerCase();
}
