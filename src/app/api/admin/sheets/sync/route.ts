import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createServiceClient, hasServiceRoleEnv } from "@/lib/supabase/service";
import { syncJobBoard } from "@/lib/sheets/sync-job-board";
import { syncInvoices } from "@/lib/sheets/sync-invoices";

function isCronAuthorized(request: NextRequest) {
  const secret = process.env.SHEETS_SYNC_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  const cron = isCronAuthorized(request);
  let supabase = null;

  if (cron) {
    if (!hasServiceRoleEnv()) {
      return NextResponse.json({ error: "Service role is not configured." }, { status: 503 });
    }
    supabase = createServiceClient();
  } else {
    const admin = await requireAdmin();
    if (admin.errorResponse || !admin.supabase) return admin.errorResponse!;
    supabase = admin.supabase;
  }

  const weeksParam = request.nextUrl.searchParams.get("weeks");
  const weeks = weeksParam === "all" ? "all" : "current";
  const source = request.nextUrl.searchParams.get("source") ?? "all";

  try {
    const result: Record<string, unknown> = { ok: true };

    if (source === "all" || source === "board") {
      result.board = await syncJobBoard(supabase, { weeks });
    }
    if (source === "all" || source === "invoices") {
      result.invoices = await syncInvoices(supabase);
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
