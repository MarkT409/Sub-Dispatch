import { NextRequest, NextResponse } from "next/server";
import { fetchBoardData } from "@/lib/board";
import { requireBoardViewer } from "@/lib/supabase/require-admin";

export async function GET(request: NextRequest) {
  const auth = await requireBoardViewer();
  if (auth.errorResponse) return auth.errorResponse;

  const weekStart = request.nextUrl.searchParams.get("weekStart");
  const data = await fetchBoardData(auth.supabase, weekStart);

  return NextResponse.json({
    ...data,
    canWrite: auth.canWrite,
  });
}
