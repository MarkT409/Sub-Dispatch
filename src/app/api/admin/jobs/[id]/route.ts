import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { emptyToNull, parseAmount } from "@/lib/admin-format";
import { JOB_STATUSES, JOB_TYPES } from "@/lib/admin-types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const { data, error } = await supabase.from("jobs").select("*").eq("id", id).single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json({ job: data });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.job_type && !JOB_TYPES.includes(body.job_type)) {
    return NextResponse.json({ error: "Invalid job type" }, { status: 400 });
  }
  if (body.status && !JOB_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.client !== undefined) patch.client = emptyToNull(body.client);
  if (body.job_type !== undefined) patch.job_type = body.job_type;
  if (body.status !== undefined) patch.status = body.status;
  if (body.site_address !== undefined) patch.site_address = emptyToNull(body.site_address);
  if (body.start_date !== undefined) patch.start_date = emptyToNull(body.start_date);
  if (body.end_date !== undefined) patch.end_date = emptyToNull(body.end_date);
  if (body.quoted_amount !== undefined) patch.quoted_amount = parseAmount(body.quoted_amount);
  if (body.notes !== undefined) patch.notes = emptyToNull(body.notes);

  const { data, error } = await supabase
    .from("jobs")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ job: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
