import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";
import { JobBoard } from "@/components/board/JobBoard";
import CrewJobsList from "@/components/crew/CrewJobsList";
import CrewPreviousJobs from "@/components/crew/CrewPreviousJobs";
import { EnableCrewNotificationsButton } from "@/components/crew/EnableCrewNotificationsButton";
import { CrewMessagesBubble } from "@/components/crew/CrewMessagesBubble";
import { LanguagePicker } from "@/components/crew/LanguagePicker";
import {
  assigneeMatchesPerson,
  crewSeesBoardJob,
  namesMatch,
} from "@/lib/assignee-match";
import { fetchBoardData } from "@/lib/board";
import { todayIsoChicago } from "@/lib/sheets/job-board-parse";
import { fetchSubTeams } from "@/lib/sub-teams-data";
import { phoneDigits } from "@/lib/crew-phone-auth";
import { isCrewLocale } from "@/lib/i18n/crew-messages";
import { t } from "@/lib/i18n/crew-t";

type PageProps = {
  searchParams: Promise<{ weekStart?: string }>;
};

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

export default async function CrewDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await auth();

  // Admins / supervisors / super admins use the company board — not personal crew jobs
  if (session?.user?.isAdmin) {
    redirect("/admin");
  }

  if (!session?.user?.crewMemberId) {
    redirect("/crew/login");
  }

  const supabase = createServiceClient();
  const today = todayIsoChicago();
  const memberId = session.user.crewMemberId;

  const { data: crewMember } = await supabase
    .from("crew_members")
    .select("id, name, email, phone, locale")
    .eq("id", memberId)
    .single();

  const memberName =
    crewMember?.name || session.user.crewMemberName || session.user.name || "";

  if (!crewMember || !isCrewLocale(crewMember.locale)) {
    return <LanguagePicker memberName={memberName} />;
  }

  const locale = crewMember.locale;
  const memberPhoneDigits = crewMember?.phone
    ? phoneDigits(crewMember.phone)
    : "";

  const [{ teams }, board] = await Promise.all([
    fetchSubTeams(supabase),
    fetchBoardData(supabase, params.weekStart),
  ]);

  const myTeams = teams.filter((team) =>
    team.workers.some(
      (w) =>
        namesMatch(w.name, memberName) ||
        (memberPhoneDigits.length === 10 &&
          w.phone &&
          phoneDigits(w.phone) === memberPhoneDigits),
    ),
  );
  const teamNames = myTeams.map((t) => t.name);
  const teammateNames = myTeams.flatMap((t) =>
    t.workers.map((w) => w.name).filter(Boolean),
  );

  const seeOpts = {
    memberName,
    teamNames,
    teammateNames,
    includeTeamJobs: true as const,
  };

  const myBoardJobs = board.jobs.filter((j) =>
    crewSeesBoardJob(j.assigned_to, seeOpts),
  );
  const crewNamesWithJobs = new Set(
    myBoardJobs
      .map((j) => j.crew_lead?.trim().toLowerCase())
      .filter(Boolean) as string[],
  );
  const myCrews = board.crews.filter((c) =>
    crewNamesWithJobs.has(c.name.trim().toLowerCase()),
  );

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

  // Broader job pull for personal Current/Previous (not limited to this week)
  const { data: allJobs, error: jobsErr } = await supabase
    .from("jobs")
    .select(
      "id, title, client, site_address, work_date, work_kind, notes, assigned_to, status",
    )
    .neq("status", "cancelled")
    .not("assigned_to", "is", null)
    .order("work_date", { ascending: false })
    .limit(400);

  if (jobsErr) {
    console.error("crew jobs fetch failed:", jobsErr.message);
  }

  const myListJobs = (allJobs ?? []).filter(
    (j) => j.work_date && crewSeesBoardJob(j.assigned_to, seeOpts),
  );

  const assignmentByJobId = new Map<string, AssignmentRow>();
  for (const row of (rawAssignments ?? []) as AssignmentRow[]) {
    const job = unwrapJob(row.jobs);
    if (!job?.id) continue;
    assignmentByJobId.set(job.id, { ...row, jobs: job });
  }

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

  for (const job of myListJobs) {
    const existing = assignmentByJobId.get(job.id);
    const personallyMine = assigneeMatchesPerson(job.assigned_to, memberName);
    const hasAssignment = Boolean(existing);
    byJobId.set(job.id, {
      id: existing?.id ?? `job:${job.id}`,
      status:
        hasAssignment || personallyMine
          ? (existing?.status ?? "pending")
          : "scheduled",
      role: existing?.role ?? "crew",
      assigned_at: existing?.assigned_at ?? `${job.work_date}T12:00:00.000Z`,
      responded_at: existing?.responded_at ?? null,
      jobs: job as JobRow,
    });
  }

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
    .sort((a, b) => b.jobs.work_date!.localeCompare(a.jobs.work_date!));

  const pendingCurrent = current.filter((a) => a.status === "pending");

  // Keep pending/accepted/declined so crew can accept or decline (incl. board-only jobs)
  const currentWithActions = current;

  const teamLabel =
    teamNames.length > 0 ? teamNames.join(", ") : null;

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="border-b border-border-default bg-bg-raised">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link href="/crew" className="shrink-0">
              <BrandMark className="text-lg sm:text-xl" />
            </Link>
            <div className="min-w-0 border-l border-border-subtle pl-3 sm:pl-4">
              <h1 className="font-display text-base font-bold tracking-tight text-text-primary sm:text-lg">
                {t(locale, "mySchedule")}
              </h1>
              <p className="truncate text-xs text-text-muted sm:text-sm">
                {memberName || "Crew member"}
                {teamLabel ? ` · ${teamLabel}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <CrewMessagesBubble locale={locale} />
            <Link
              href="/crew/settings"
              className="min-h-9 inline-flex items-center px-1 text-sm text-text-muted hover:text-text-primary"
            >
              {t(locale, "settings")}
            </Link>
            <EnableCrewNotificationsButton locale={locale} />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/crew/login" });
              }}
            >
              <button
                type="submit"
                className="min-h-9 inline-flex items-center px-1 text-sm text-text-muted hover:text-text-primary"
              >
                {t(locale, "signOut")}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="w-full space-y-8 px-3 py-6 sm:space-y-10 sm:px-6 sm:py-8">
        <section className="w-full">
          <div className="mb-3 sm:mb-4">
            <h2 className="font-display text-lg font-bold tracking-tight text-text-primary sm:text-xl">
              {t(locale, "jobBoard")}
            </h2>
            <p className="text-xs text-text-muted sm:text-sm">
              {teamLabel
                ? t(locale, "jobBoardHintTeam", { team: teamLabel })
                : t(locale, "jobBoardHintYou")}
            </p>
          </div>

          <JobBoard
            weekStart={board.weekStart}
            weekLabel={board.weekLabel}
            days={board.days}
            crews={myCrews}
            jobs={myBoardJobs}
            canWrite={false}
            locale={locale}
          />
          {myBoardJobs.length === 0 && (
            <p className="mt-3 text-center text-sm text-text-muted md:hidden">
              {t(locale, "noJobsThisWeekHint", {
                who: teamLabel
                  ? `${memberName || "you"} / ${teamLabel}`
                  : memberName || "you",
              })}
            </p>
          )}
        </section>

        <section className="w-full">
          <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold tracking-tight text-text-primary sm:text-xl">
                {t(locale, "current")}
              </h2>
              <p className="text-xs text-text-muted sm:text-sm">
                {t(locale, "currentHint")}
              </p>
            </div>
            {pendingCurrent.length > 0 && (
              <span className="shrink-0 rounded-full bg-lime-400/20 px-2.5 py-1 text-xs font-semibold text-lime-800 dark:text-lime-300">
                {pendingCurrent.length} {t(locale, "pending")}
              </span>
            )}
          </div>

          {currentWithActions.length > 0 ? (
            <CrewJobsList
              assignments={currentWithActions}
              showActions
              variant="rows"
              locale={locale}
            />
          ) : (
            <div className="rounded-xl border border-border-default bg-bg-raised px-5 py-10 text-center">
              <p className="text-text-muted">{t(locale, "noCurrentJobs")}</p>
            </div>
          )}
        </section>

        <section className="w-full">
          <div className="mb-3 sm:mb-4">
            <h2 className="font-display text-lg font-bold tracking-tight text-text-primary sm:text-xl">
              {t(locale, "previous")}
            </h2>
            <p className="text-xs text-text-muted sm:text-sm">
              {t(locale, "previousHint")}
            </p>
          </div>

          <CrewPreviousJobs assignments={previous} locale={locale} />
        </section>
      </main>

      <footer className="pb-8">
        <PoweredBy />
      </footer>
    </div>
  );
}
