import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const patch: Record<string, unknown> = {};

  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    patch.name = name;
  }
  if (body?.phone !== undefined) {
    const phone = String(body.phone ?? "").trim();
    patch.phone = phone || null;
  }
  if (body?.email !== undefined) {
    const email = String(body.email ?? "").trim();
    patch.email = email || null;
  }
  if (body?.is_lead !== undefined) patch.is_lead = Boolean(body.is_lead);
  if (body?.active !== undefined) patch.active = Boolean(body.active);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sub_workers")
    .update(patch)
    .eq("id", id)
    .select("id, team_id, name, phone, email, is_lead, sort_order, active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ worker: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const { id } = await params;
  const { error } = await supabase.from("sub_workers").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
