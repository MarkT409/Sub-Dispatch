import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { emptyToNull, parseAmount } from "@/lib/admin-format";
import { JOB_STATUSES, JOB_TYPES, WORK_KINDS } from "@/lib/admin-types";
import { sendCrewAssignmentNotifications } from "@/lib/notifications/crew-notifications";

export async function GET() {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: data });
}

export async function POST(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.job_type || !body?.status) {
    return NextResponse.json({ error: "Title, type, and status are required." }, { status: 400 });
  }

  if (!JOB_TYPES.includes(body.job_type) || !JOB_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid job type or status." }, { status: 400 });
  }

  const workKind = emptyToNull(body.work_kind ?? null);
  if (
    workKind &&
    !(WORK_KINDS as readonly string[]).includes(workKind)
  ) {
    return NextResponse.json({ error: "Invalid work kind." }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      title: String(body.title).trim(),
      client: emptyToNull(body.client ?? null),
      job_type: body.job_type,
      status: body.status,
      work_kind: workKind,
      site_address: emptyToNull(body.site_address ?? null),
      work_date: emptyToNull(body.work_date ?? null),
      start_date: emptyToNull(body.start_date ?? null),
      end_date: emptyToNull(body.end_date ?? null),
      quoted_amount: parseAmount(body.quoted_amount ?? null),
      notes: emptyToNull(body.notes ?? null),
      source: "manual",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Handle crew assignments
  const crewAssignments = body.crew_assignments || [];
  if (Array.isArray(crewAssignments) && crewAssignments.length > 0) {
    const assignments = crewAssignments.map((crewMemberId: string) => ({
      job_id: job.id,
      crew_member_id: crewMemberId,
      status: "pending",
      role: "crew",
      assigned_at: new Date().toISOString(),
    }));

    const { error: assignmentError } = await supabase
      .from("job_assignments")
      .insert(assignments);

    if (assignmentError) {
      console.error("Failed to create assignments:", assignmentError);
    } else {
      // Send notifications to assigned crew members
      await sendCrewAssignmentNotifications(supabase, job.id, crewAssignments);
    }
  }

  return NextResponse.json({ job }, { status: 201 });
}
