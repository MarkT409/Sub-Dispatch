import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { emptyToNull, parseAmount } from "@/lib/admin-format";
import { JOB_STATUSES, JOB_TYPES } from "@/lib/admin-types";

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

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      title: String(body.title).trim(),
      client: emptyToNull(body.client ?? null),
      job_type: body.job_type,
      status: body.status,
      site_address: emptyToNull(body.site_address ?? null),
      start_date: emptyToNull(body.start_date ?? null),
      end_date: emptyToNull(body.end_date ?? null),
      quoted_amount: parseAmount(body.quoted_amount ?? null),
      notes: emptyToNull(body.notes ?? null),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ job: data }, { status: 201 });
}
