import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/service";
import { Logo } from "@/components/Logo";
import { signOut } from "next-auth/react";
import Link from "next/link";
import CrewJobsList from "@/components/crew/CrewJobsList";

export default async function CrewDashboardPage() {
  const session = await auth();
  
  if (!session?.user?.crewMemberId) {
    redirect("/crew/login");
  }

  const supabase = createClient();

  // Get crew member info
  const { data: crewMember } = await supabase
    .from("crew_members")
    .select("*")
    .eq("id", session.user.crewMemberId)
    .single();

  // Get jobs assigned to this crew member
  // Focus on tomorrow's jobs (assignments are issued day before)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: assignments } = await supabase
    .from("job_assignments")
    .select(`
      *,
      jobs (
        *
      )
    `)
    .eq("crew_member_id", session.user.crewMemberId)
    .eq("jobs.work_date", tomorrowStr)
    .order("assigned_at", { ascending: false });

  // Also get today's jobs
  const todayStr = new Date().toISOString().split("T")[0];
  const { data: todayAssignments } = await supabase
    .from("job_assignments")
    .select(`
      *,
      jobs (
        *
      )
    `)
    .eq("crew_member_id", session.user.crewMemberId)
    .eq("jobs.work_date", todayStr)
    .order("assigned_at", { ascending: false });

  // Get upcoming jobs (after tomorrow)
  const { data: upcomingAssignments } = await supabase
    .from("job_assignments")
    .select(`
      *,
      jobs (
        *
      )
    `)
    .eq("crew_member_id", session.user.crewMemberId)
    .gt("jobs.work_date", tomorrowStr)
    .order("jobs.work_date", { ascending: true })
    .limit(10);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Crew Portal
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {crewMember?.name || session.user.name}
              </p>
            </div>
          </div>
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: "/crew/login" });
          }}>
            <button
              type="submit"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Today's Jobs */}
        {todayAssignments && todayAssignments.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Today&apos;s Jobs
            </h2>
            <CrewJobsList assignments={todayAssignments} />
          </section>
        )}

        {/* Tomorrow's Jobs (Primary) */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Tomorrow&apos;s Jobs
          </h2>
          {assignments && assignments.length > 0 ? (
            <CrewJobsList assignments={assignments} showActions />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No jobs assigned for tomorrow yet.
              </p>
            </div>
          )}
        </section>

        {/* Upcoming Jobs */}
        {upcomingAssignments && upcomingAssignments.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Upcoming Jobs
            </h2>
            <CrewJobsList assignments={upcomingAssignments} />
          </section>
        )}
      </main>
    </div>
  );
}
