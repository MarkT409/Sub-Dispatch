import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/admin-auth";
import {
  isMissingBoardCrewColumn,
  USER_SELECT_BASIC,
  USER_SELECT_WITH_CREW,
} from "@/lib/app-users-write";
import { requireSuperAdmin } from "@/lib/supabase/require-admin";
import { nameGetsBoardWrite } from "@/lib/supervisors";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  let result = await auth.supabase
    .from("app_users")
    .select(USER_SELECT_WITH_CREW)
    .order("role", { ascending: true })
    .order("email", { ascending: true });

  if (result.error && isMissingBoardCrewColumn(result.error.message)) {
    result = await auth.supabase
      .from("app_users")
      .select(USER_SELECT_BASIC)
      .order("role", { ascending: true })
      .order("email", { ascending: true });
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ users: result.data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  const body = await request.json();
  const emailRaw = normalizeEmail(String(body.email || ""));
  const email = emailRaw.includes("@") ? emailRaw : null;
  const board_crew_id =
    typeof body.board_crew_id === "string" && body.board_crew_id
      ? body.board_crew_id
      : null;

  // Email optional only when linking a board supervisor row
  if (!email && !board_crew_id) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (emailRaw && !email) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const role = body.role === "super_admin" ? "super_admin" : "admin";
  const board_write = role === "super_admin" ? true : Boolean(body.board_write);
  const name = body.name ? String(body.name).trim() : null;
  const phoneRaw = body.phone != null ? String(body.phone).trim() : "";
  const phone = phoneRaw || null;

  const effectiveBoardWrite =
    role === "super_admin" || board_write || nameGetsBoardWrite(name);

  const baseRow: Record<string, unknown> = {
    email,
    name,
    phone,
    role,
    board_write: effectiveBoardWrite,
    active: true,
  };

  async function write(includeBoardCrewId: boolean) {
    const row = { ...baseRow };
    if (includeBoardCrewId && board_crew_id) {
      row.board_crew_id = board_crew_id;
    }
    const select = includeBoardCrewId
      ? USER_SELECT_WITH_CREW
      : USER_SELECT_BASIC;
    const query = email
      ? auth.supabase.from("app_users").upsert(row, { onConflict: "email" })
      : auth.supabase.from("app_users").insert(row);
    return query.select(select).single();
  }

  let { data, error } = await write(true);
  if (error && isMissingBoardCrewColumn(error.message)) {
    ({ data, error } = await write(false));
  }

  if (error) {
    const msg =
      error.message.includes("duplicate") || error.code === "23505"
        ? "That email or board link is already in use."
        : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ user: data }, { status: 201 });
}
