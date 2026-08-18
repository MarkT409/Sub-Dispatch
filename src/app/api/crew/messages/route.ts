import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient, hasServiceRoleEnv } from "@/lib/supabase/service";
import { assigneeMatchesPerson } from "@/lib/assignee-match";
import { todayIsoChicago } from "@/lib/sheets/job-board-parse";

export type CrewMessageItem = {
  id: string;
  assignmentId: string | null;
  jobId: string;
  title: string;
  site_address: string | null;
  work_date: string | null;
  work_kind: string | null;
  assigned_to: string | null;
  status: "pending";
};

type JobBits = {
  id: string;
  title: string;
  site_address: string | null;
  work_date: string | null;
  work_kind: string | null;
  assigned_to: string | null;
  status: string | null;
};

function unwrapJob(jobs: JobBits | JobBits[] | null): JobBits | null {
  if (!jobs) return null;
  return Array.isArray(jobs) ? (jobs[0] ?? null) : jobs;
}

export async function GET() {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const session = await auth();
  const crewMemberId = session?.user?.crewMemberId;
  if (!crewMemberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = todayIsoChicago();

  const { data: member } = await supabase
    .from("crew_members")
    .select("id, name")
    .eq("id", crewMemberId)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: allAssignments }, { data: boardJobs }] = await Promise.all([
    supabase
      .from("job_assignments")
      .select(
        `
        id,
        status,
        job_id,
        jobs (
          id,
          title,
          site_address,
          work_date,
          work_kind,
          assigned_to,
          status
        )
      `,
      )
      .eq("crew_member_id", crewMemberId)
      .neq("status", "cancelled"),
    supabase
      .from("jobs")
      .select(
        "id, title, site_address, work_date, work_kind, assigned_to, status",
      )
      .neq("status", "cancelled")
      .not("assigned_to", "is", null)
      .gte("work_date", today)
      .limit(200),
  ]);

  const assignmentByJobId = new Map<
    string,
    { id: string; status: string }
  >();
  for (const row of allAssignments ?? []) {
    assignmentByJobId.set(row.job_id, { id: row.id, status: row.status });
  }

  const byJobId = new Map<string, CrewMessageItem>();

  for (const row of allAssignments ?? []) {
    if (row.status !== "pending") continue;
    const job = unwrapJob(row.jobs as JobBits | JobBits[] | null);
    if (!job?.id || job.status === "cancelled") continue;
    if (job.work_date && job.work_date < today) continue;

    byJobId.set(job.id, {
      id: row.id,
      assignmentId: row.id,
      jobId: job.id,
      title: job.title,
      site_address: job.site_address,
      work_date: job.work_date,
      work_kind: job.work_kind,
      assigned_to: job.assigned_to,
      status: "pending",
    });
  }

  for (const job of boardJobs ?? []) {
    if (byJobId.has(job.id)) continue;
    if (!assigneeMatchesPerson(job.assigned_to, member.name)) continue;

    const existing = assignmentByJobId.get(job.id);
    if (existing && existing.status !== "pending") continue;

    byJobId.set(job.id, {
      id: existing?.id ?? `job:${job.id}`,
      assignmentId: existing?.id ?? null,
      jobId: job.id,
      title: job.title,
      site_address: job.site_address,
      work_date: job.work_date,
      work_kind: job.work_kind,
      assigned_to: job.assigned_to,
      status: "pending",
    });
  }

  const messages = [...byJobId.values()].sort((a, b) =>
    (a.work_date ?? "").localeCompare(b.work_date ?? ""),
  );

  return NextResponse.json({
    count: messages.length,
    messages,
  });
}
