import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";
import CrewJobsList from "@/components/crew/CrewJobsList";
import { EnableCrewNotificationsButton } from "@/components/crew/EnableCrewNotificationsButton";
import { assigneeMatchesPerson } from "@/lib/assignee-match";

function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type JobRow = {
  id: string;
  title: string;
  client: string | null;
  site_address: string | null;
  work_date: string | null;
  work_kind: string | null;
  notes: string | null;
  assigned_to: string | null;
  status?: string | null;
};

type AssignmentRow = {
  id: string;
  status: string;
  role: string;
  assigned_at: string;
  responded_at: string | null;
  job_id: string;
  jobs: JobRow | JobRow[] | null;
};

function unwrapJob(jobs: AssignmentRow["jobs"]): JobRow | null {
  if (!jobs) return null;
  return Array.isArray(jobs) ? (jobs[0] ?? null) : jobs;
}

export default async function CrewDashboardPage() {
  const session = await auth();

  // Admins / supervisors / super admins use the company board — not personal crew jobs
  if (session?.user?.isAdmin) {
    redirect("/admin");
  }

  if (!session?.user?.crewMemberId) {
    redirect("/crew/login");
  }

  const supabase = createServiceClient();
  const today = todayLocalISO();
  const memberId = session.user.crewMemberId;

  const { data: crewMember } = await supabase
    .from("crew_members")
    .select("id, name, email")
    .eq("id", memberId)
    .single();

  const memberName =
    crewMember?.name || session.user.crewMemberName || session.user.name || "";

  // Person's assignments (may include older team-wide dispatches)
  const { data: rawAssignments, error: assignErr } = await supabase
    .from("job_assignments")
    .select(
      `
      id,
      status,
      role,
      assigned_at,
      responded_at,
      job_id,
      jobs (
        id,
        title,
        client,
        site_address,
        work_date,
        work_kind,
        notes,
        assigned_to,
        status
      )
    `,
    )
    .eq("crew_member_id", memberId)
    .neq("status", "cancelled")
    .order("assigned_at", { ascending: false });

  if (assignErr) {
    console.error("crew assignments fetch failed:", assignErr.message);
  }

  // Also pull jobs assigned to this person on the board (source of truth)
  const { data: boardJobs, error: jobsErr } = await supabase
    .from("jobs")
    .select(
      "id, title, client, site_address, work_date, work_kind, notes, assigned_to, status",
    )
    .neq("status", "cancelled")
    .not("assigned_to", "is", null)
    .order("work_date", { ascending: false })
    .limit(200);

  if (jobsErr) {
    console.error("crew jobs fetch failed:", jobsErr.message);
  }

  const myBoardJobs = (boardJobs ?? []).filter(
    (j) =>
      j.work_date &&
      assigneeMatchesPerson(j.assigned_to, memberName),
  );

  const assignmentByJobId = new Map<string, AssignmentRow>();
  for (const row of (rawAssignments ?? []) as AssignmentRow[]) {
    const job = unwrapJob(row.jobs);
    if (!job?.id) continue;
    // Only keep assignment if this job is actually theirs (not a teammate's)
    if (!assigneeMatchesPerson(job.assigned_to, memberName)) continue;
    assignmentByJobId.set(job.id, { ...row, jobs: job });
  }

  // Merge: every job assigned to them on the board, with assignment status if any
  const byJobId = new Map<
    string,
    {
      id: string;
      status: string;
      role: string;
      assigned_at: string;
      responded_at: string | null;
      jobs: JobRow;
    }
  >();

  for (const job of myBoardJobs) {
    const existing = assignmentByJobId.get(job.id);
    byJobId.set(job.id, {
      id: existing?.id ?? `job:${job.id}`,
      status: existing?.status ?? "pending",
      role: existing?.role ?? "crew",
      assigned_at: existing?.assigned_at ?? `${job.work_date}T12:00:00.000Z`,
      responded_at: existing?.responded_at ?? null,
      jobs: job as JobRow,
    });
  }

  // Include assignment-backed jobs that matched (in case board query missed)
  for (const [jobId, row] of assignmentByJobId) {
    if (byJobId.has(jobId)) continue;
    const job = unwrapJob(row.jobs);
    if (!job?.work_date) continue;
    byJobId.set(jobId, {
      id: row.id,
      status: row.status,
      role: row.role,
      assigned_at: row.assigned_at,
      responded_at: row.responded_at,
      jobs: job,
    });
  }

  const normalized = [...byJobId.values()];

  const current = normalized
    .filter((a) => a.jobs.work_date! >= today)
    .sort((a, b) => a.jobs.work_date!.localeCompare(b.jobs.work_date!));

  const previous = normalized
    .filter((a) => a.jobs.work_date! < today)
    .sort((a, b) => b.jobs.work_date!.localeCompare(a.jobs.work_date!))
    .slice(0, 40);

  const pendingCurrent = current.filter(
    (a) => a.status === "pending" && !a.id.startsWith("job:"),
  );

  // Only show Accept/Decline when a real assignment row exists
  const currentWithActions = current.map((a) => ({
    ...a,
    // CrewJobsList uses showActions + pending; hide actions for synthetic rows
    status: a.id.startsWith("job:") ? "scheduled" : a.status,
  }));

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark className="text-lg" />
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-text-primary">
                My jobs
              </h1>
              <p className="text-sm text-text-muted">
                {memberName || "Crew member"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/crew/settings"
              className="text-sm text-text-muted hover:text-text-primary"
            >
              Settings
            </Link>
            <EnableCrewNotificationsButton />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/crew/login" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-text-muted hover:text-text-primary"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-10 px-4 py-8 sm:px-6">
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight text-text-primary">
                Current
              </h2>
              <p className="text-sm text-text-muted">
                Jobs assigned to you — today and upcoming
              </p>
            </div>
            {pendingCurrent.length > 0 && (
              <span className="rounded-full bg-lime-400/20 px-2.5 py-1 text-xs font-semibold text-lime-800 dark:text-lime-300">
                {pendingCurrent.length} pending
              </span>
            )}
          </div>

          {currentWithActions.length > 0 ? (
            <CrewJobsList assignments={currentWithActions} showActions />
          ) : (
            <div className="rounded-xl border border-border-default bg-bg-raised px-5 py-10 text-center">
              <p className="text-text-muted">No current jobs assigned to you.</p>
            </div>
          )}
        </section>

        <section>
          <div className="mb-4">
            <h2 className="font-display text-xl font-bold tracking-tight text-text-primary">
              Previous
            </h2>
            <p className="text-sm text-text-muted">Your recent past jobs</p>
          </div>

          {previous.length > 0 ? (
            <CrewJobsList assignments={previous} />
          ) : (
            <div className="rounded-xl border border-border-default bg-bg-raised px-5 py-10 text-center">
              <p className="text-text-muted">No previous jobs yet.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="pb-8">
        <PoweredBy />
      </footer>
    </div>
  );
}
