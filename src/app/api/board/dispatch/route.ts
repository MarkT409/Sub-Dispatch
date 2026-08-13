import { NextRequest, NextResponse } from "next/server";
import { requireBoardWriter } from "@/lib/supabase/require-admin";
import { dispatchBoardJobs } from "@/lib/board-dispatch";

export async function POST(request: NextRequest) {
  const auth = await requireBoardWriter();
  if (auth.errorResponse) return auth.errorResponse;

  const body = await request.json().catch(() => null);
  const days = Array.isArray(body?.days)
    ? body.days.map((d: unknown) => String(d))
    : [];

  if (days.length === 0) {
    return NextResponse.json(
      { error: "Select at least one day to dispatch." },
      { status: 400 },
    );
  }

  try {
    const result = await dispatchBoardJobs(auth.supabase, { days });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
