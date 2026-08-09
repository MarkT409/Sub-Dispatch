import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { emptyToNull, parseAmount } from "@/lib/admin-format";

export async function GET() {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const { data, error } = await supabase
    .from("crew_members")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ crew: data });
}

export async function POST(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("crew_members")
    .insert({
      name,
      email: emptyToNull(body?.email ?? null),
      phone: emptyToNull(body?.phone ?? null),
      default_rate: parseAmount(body?.default_rate ?? null),
      active: body?.active !== false,
      notes: emptyToNull(body?.notes ?? null),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member: data }, { status: 201 });
}
