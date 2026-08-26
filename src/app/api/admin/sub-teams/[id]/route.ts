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
  if (body?.active !== undefined) patch.active = Boolean(body.active);
  if (body?.sort_order !== undefined) patch.sort_order = Number(body.sort_order);

  const { data, error } = await supabase
    .from("sub_teams")
    .update(patch)
    .eq("id", id)
    .select("id, name, sort_order, active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ team: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const { id } = await params;
  const { error } = await supabase.from("sub_teams").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
