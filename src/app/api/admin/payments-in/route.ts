import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { emptyToNull, parseAmount } from "@/lib/admin-format";

export async function GET() {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const { data, error } = await supabase
    .from("payments_in")
    .select("*, jobs(title)")
    .order("received_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ payments: data });
}

export async function POST(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const body = await request.json().catch(() => null);
  const amount = parseAmount(body?.amount ?? null);
  if (amount === null || amount < 0) {
    return NextResponse.json({ error: "Valid amount is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("payments_in")
    .insert({
      amount,
      job_id: emptyToNull(body?.job_id ?? null),
      received_at: emptyToNull(body?.received_at ?? null) ?? new Date().toISOString().slice(0, 10),
      method: emptyToNull(body?.method ?? null),
      notes: emptyToNull(body?.notes ?? null),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ payment: data }, { status: 201 });
}
