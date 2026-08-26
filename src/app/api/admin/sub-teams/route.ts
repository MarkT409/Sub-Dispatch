import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { seedSubTeamsIfEmpty } from "@/lib/sub-teams-data";

export async function GET() {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const result = await seedSubTeamsIfEmpty(supabase);
  if (result.error && result.teams.length === 0) {
    return NextResponse.json(
      {
        error:
          result.error.includes("does not exist") ||
          result.error.includes("schema cache")
            ? "Run migration 006_sub_teams.sql in Supabase, then refresh."
            : result.error,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    teams: result.teams,
    seeded: result.seeded,
  });
}

export async function POST(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase) return errorResponse!;

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Team name is required." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("sub_teams")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const sort_order = ((existing?.[0]?.sort_order as number) ?? 0) + 1;

  const { data, error } = await supabase
    .from("sub_teams")
    .insert({ name, sort_order })
    .select("id, name, sort_order, active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { team: { ...data, workers: [] } },
    { status: 201 },
  );
}
