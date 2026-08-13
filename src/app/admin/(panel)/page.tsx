import { JobBoard } from "@/components/board/JobBoard";
import { SyncSheetsButton } from "@/components/admin/SyncSheetsButton";
import { auth } from "@/lib/auth";
import { fetchBoardData } from "@/lib/board";
import { getAdminDataClient } from "@/lib/supabase/admin-data";
import { fetchAssigneeSuggestions } from "@/lib/sub-teams-data";

type PageProps = {
  searchParams: Promise<{ weekStart?: string }>;
};

export default async function AdminSchedulerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await auth();
  const supabase = await getAdminDataClient();
  const [board, assigneeSuggestions] = await Promise.all([
    fetchBoardData(supabase, params.weekStart),
    fetchAssigneeSuggestions(supabase),
  ]);

  const canWrite = Boolean(
    session?.user?.isSuperAdmin || session?.user?.boardWrite,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
            Scheduler
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Weekly job board · Mon–Fri
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SyncSheetsButton />
          <SyncSheetsButton weeks="all" label="Backfill board weeks" />
        </div>
      </div>

      <JobBoard
        weekStart={board.weekStart}
        weekLabel={board.weekLabel}
        days={board.days}
        crews={board.crews}
        jobs={board.jobs}
        canWrite={canWrite}
        showSync
        assigneeSuggestions={assigneeSuggestions}
      />

      <p className="text-xs text-text-muted">
        Type <code className="text-[10px]">r address – name</code> for rough
        (blue) or <code className="text-[10px]">t address – name</code> for
        trim (green). Select days and tap{" "}
        <span className="font-medium">Dispatch Crews?</span> to push jobs to
        sub crews. Drag the bottom edge of a crew name to resize rows.
      </p>
    </div>
  );
}
