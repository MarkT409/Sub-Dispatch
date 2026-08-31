import { NextRequest, NextResponse } from "next/server";
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

  let { data, error } = await supabase
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
    .is("admin_dismissed_at", null)
    .order("responded_at", { ascending: false, nullsFirst: false })
    .limit(300);

  // Migration 016 not applied yet — still show messages
  if (error?.message?.includes("admin_dismissed_at")) {
    const fallback = await supabase
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
    data = fallback.data;
    error = fallback.error;
  }

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

/**
 * Soft-delete (dismiss) crew response notifications from the admin bubble.
 * Body: { ids?: string[] } | { all?: true } | { olderThanDays?: number }
 */
export async function DELETE(request: NextRequest) {
  const { supabase, errorResponse } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();

  let query = supabase
    .from("job_assignments")
    .update({ admin_dismissed_at: now })
    .in("status", ["accepted", "declined"])
    .is("admin_dismissed_at", null);

  if (Array.isArray(body?.ids) && body.ids.length > 0) {
    const ids = body.ids.map((id: unknown) => String(id)).filter(Boolean);
    query = query.in("id", ids);
  } else if (typeof body?.olderThanDays === "number" && body.olderThanDays > 0) {
    const cutoff = new Date(
      Date.now() - body.olderThanDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    query = query.lt("responded_at", cutoff);
  } else if (body?.all === true) {
    // clear everything visible
  } else {
    return NextResponse.json(
      { error: "Provide ids, all: true, or olderThanDays." },
      { status: 400 },
    );
  }

  const { data, error } = await query.select("id");
  if (error) {
    console.error("admin messages dismiss:", error.message);
    return NextResponse.json(
      {
        error:
          error.message.includes("admin_dismissed_at")
            ? "Run migration 016_assignment_admin_dismissed.sql in Supabase first."
            : "Could not clear notifications",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, dismissed: data?.length ?? 0 });
}
