import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const { id: team_id } = await params;
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "Worker name is required." },
      { status: 400 },
    );
  }

  const phoneRaw = body?.phone != null ? String(body.phone).trim() : "";
  const phone = phoneRaw || null;
  const is_lead = Boolean(body?.is_lead);

  const { data: existing } = await supabase
    .from("sub_workers")
    .select("sort_order")
    .eq("team_id", team_id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sort_order = ((existing?.[0]?.sort_order as number) ?? 0) + 1;

  const { data, error } = await supabase
    .from("sub_workers")
    .insert({ team_id, name, phone, is_lead, sort_order })
    .select("id, team_id, name, phone, email, is_lead, sort_order, active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ worker: data }, { status: 201 });
}
