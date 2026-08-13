import { NextRequest, NextResponse } from "next/server";
import { requireBoardWriter } from "@/lib/supabase/require-admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireBoardWriter();
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  for (const key of [
    "title",
    "site_address",
    "work_date",
    "crew_lead",
    "assigned_to",
    "work_kind",
    "notes",
    "status",
  ]) {
    if (body[key] !== undefined) {
      patch[key] = body[key] === "" ? null : body[key];
    }
  }

  if (patch.crew_lead) {
    patch.client = patch.crew_lead;
  }
  if (patch.work_date) {
    patch.start_date = patch.work_date;
  }
  if (patch.site_address && !patch.title) {
    patch.title = patch.site_address;
  }

  const { data, error } = await auth.supabase
    .from("jobs")
    .update(patch)
    .eq("id", id)
    .select(
      "id, title, site_address, work_date, crew_lead, assigned_to, work_kind, notes, status, source",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ job: data });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireBoardWriter();
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;

  const { error } = await auth.supabase
    .from("jobs")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
