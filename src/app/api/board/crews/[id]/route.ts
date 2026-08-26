import { NextRequest, NextResponse } from "next/server";
import { requireBoardWriter } from "@/lib/supabase/require-admin";

type Params = { params: Promise<{ id: string }> };

const MIN_SLOTS = 1;
const MAX_SLOTS = 20;

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireBoardWriter();
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;
  const body = await request.json();
  const raw = Number(body.row_slots);

  if (!Number.isFinite(raw) || !Number.isInteger(raw)) {
    return NextResponse.json(
      { error: "row_slots must be an integer" },
      { status: 400 },
    );
  }

  const row_slots = Math.min(MAX_SLOTS, Math.max(MIN_SLOTS, raw));

  const { data, error } = await auth.supabase
    .from("board_crews")
    .update({ row_slots })
    .eq("id", id)
    .select("id, name, sort_order, row_slots")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ crew: data });
}
