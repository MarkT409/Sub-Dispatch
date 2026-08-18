import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/supabase/require-admin";

export type AdminMessageItem = {
  id: string;
  assignmentId: string;
  jobId: string;
  title: string;
  site_address: string | null;
  work_date: string | null;
  work_kind: string | null;
  assigned_to: string | null;
  crew_name: string | null;
  crew_lead: string | null;
  status: "accepted" | "declined";
  responded_at: string | null;
};

type JobBits = {
  id: string;
  title: string;
  site_address: string | null;
  work_date: string | null;
  work_kind: string | null;
  assigned_to: string | null;
  crew_lead: string | null;
  status: string | null;
};

type CrewBits = {
  id: string;
  name: string | null;
};

function unwrap<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function GET() {
  const { supabase, errorResponse } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("job_assignments")
    .select(
      `
      id,
      status,
      responded_at,
      job_id,
      jobs (
        id,
        title,
        site_address,
        work_date,
        work_kind,
        assigned_to,
        crew_lead,
        status
      ),
      crew_members (
        id,
        name
      )
    `,
    )
    .in("status", ["accepted", "declined"])
    .order("responded_at", { ascending: false, nullsFirst: false })
    .limit(300);

  if (error) {
    console.error("admin messages:", error.message);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }

  const accepted: AdminMessageItem[] = [];
  const declined: AdminMessageItem[] = [];

  for (const row of data ?? []) {
    if (row.status !== "accepted" && row.status !== "declined") continue;
    const job = unwrap(row.jobs as JobBits | JobBits[] | null);
    if (!job?.id || job.status === "cancelled") continue;
    const crew = unwrap(row.crew_members as CrewBits | CrewBits[] | null);

    const item: AdminMessageItem = {
      id: row.id,
      assignmentId: row.id,
      jobId: job.id,
      title: job.title,
      site_address: job.site_address,
      work_date: job.work_date,
      work_kind: job.work_kind,
      assigned_to: job.assigned_to,
      crew_name: crew?.name ?? null,
      crew_lead: job.crew_lead,
      status: row.status,
      responded_at: row.responded_at,
    };

    if (row.status === "accepted") accepted.push(item);
    else declined.push(item);
  }

  return NextResponse.json({
    acceptedCount: accepted.length,
    declinedCount: declined.length,
    accepted,
    declined,
  });
}
