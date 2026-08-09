import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { emptyToNull, parseAmount } from "@/lib/admin-format";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.email !== undefined) patch.email = emptyToNull(body.email);
  if (body.phone !== undefined) patch.phone = emptyToNull(body.phone);
  if (body.default_rate !== undefined) patch.default_rate = parseAmount(body.default_rate);
  if (body.active !== undefined) patch.active = Boolean(body.active);
  if (body.notes !== undefined) patch.notes = emptyToNull(body.notes);

  const { data, error } = await supabase
    .from("crew_members")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const { error } = await supabase.from("crew_members").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
