import { JobBoard } from "@/components/board/JobBoard";
import { auth } from "@/lib/auth";
import { fetchBoardData } from "@/lib/board";
import { getAdminDataClient } from "@/lib/supabase/admin-data";
import {
  fetchAssigneeSuggestions,
  fetchSubTeams,
} from "@/lib/sub-teams-data";

type PageProps = {
  searchParams: Promise<{ weekStart?: string }>;
};

export default async function AdminSchedulerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await auth();
  const supabase = await getAdminDataClient();
  const [board, assigneeSuggestions, { teams }] = await Promise.all([
    fetchBoardData(supabase, params.weekStart),
    fetchAssigneeSuggestions(supabase),
    fetchSubTeams(supabase),
  ]);

  const canWrite = Boolean(
    session?.user?.isSuperAdmin || session?.user?.boardWrite,
  );

  const filterTeams = teams.map((t) => ({
    name: t.name,
    members: t.workers.map((w) => w.name),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          Scheduler
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Weekly job board · Mon–Fri
        </p>
      </div>

      <JobBoard
        weekStart={board.weekStart}
        weekLabel={board.weekLabel}
        days={board.days}
        crews={board.crews}
        jobs={board.jobs}
        canWrite={canWrite}
        enableFilters
        filterTeams={filterTeams}
        assigneeSuggestions={assigneeSuggestions}
      />

      <p className="text-xs text-text-muted">
        Type <code className="text-[10px]">r address – name</code> for rough
        (blue) or <code className="text-[10px]">t address – name</code> for
        trim (green). Select days and tap{" "}
        <span className="font-medium">Dispatch Crews</span> to push jobs to
        sub crews. Drag the bottom edge of a crew name to resize rows.
      </p>
    </div>
  );
}
