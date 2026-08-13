import { NextRequest, NextResponse } from "next/server";
import { requireBoardWriter } from "@/lib/supabase/require-admin";

export async function POST(request: NextRequest) {
  const auth = await requireBoardWriter();
  if (auth.errorResponse) return auth.errorResponse;

  const body = await request.json();
  const title = String(body.title || body.site_address || "").trim();
  const site_address = String(body.site_address || body.title || "").trim();
  const work_date = String(body.work_date || "").trim();
  const crew_lead = String(body.crew_lead || "").trim();
  const assigned_to = body.assigned_to ? String(body.assigned_to).trim() : null;
  const work_kind = body.work_kind || "unknown";
  const notes = body.notes ? String(body.notes).trim() : null;

  if (!title || !work_date || !crew_lead) {
    return NextResponse.json(
      { error: "title/site_address, work_date, and crew_lead are required" },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("jobs")
    .insert({
      title,
      site_address,
      client: crew_lead,
      job_type: "outgoing",
      status: "scheduled",
      start_date: work_date,
      work_date,
      crew_lead,
      assigned_to,
      work_kind,
      notes,
      source: "manual",
    })
    .select(
      "id, title, site_address, work_date, crew_lead, assigned_to, work_kind, notes, status, source",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ job: data }, { status: 201 });
}
