import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/admin-auth";
import {
  isMissingBoardCrewColumn,
  USER_SELECT_BASIC,
  USER_SELECT_WITH_CREW,
} from "@/lib/app-users-write";
import { requireSuperAdmin } from "@/lib/supabase/require-admin";
import { nameGetsBoardWrite } from "@/lib/supervisors";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireSuperAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;
  const body = await request.json();
  const patch: Record<string, unknown> = {};

  if (body.role === "super_admin" || body.role === "admin") {
    patch.role = body.role;
  }
  if (typeof body.board_write === "boolean") {
    patch.board_write = body.board_write;
  }
  if (typeof body.active === "boolean") {
    patch.active = body.active;
  }
  if (body.name !== undefined) {
    patch.name = body.name ? String(body.name).trim() : null;
  }
  if (body.phone !== undefined) {
    const phone = String(body.phone ?? "").trim();
    patch.phone = phone || null;
  }
  if (body.email !== undefined) {
    const emailRaw = normalizeEmail(String(body.email || ""));
    if (emailRaw && !emailRaw.includes("@")) {
      return NextResponse.json(
        { error: "Enter a valid email or leave it blank" },
        { status: 400 },
      );
    }
    patch.email = emailRaw.includes("@") ? emailRaw : null;
  }
  if (body.board_crew_id !== undefined) {
    patch.board_crew_id = body.board_crew_id || null;
  }

  if (patch.role === "super_admin") {
    patch.board_write = true;
  }

  const { data: current } = await auth.supabase
    .from("app_users")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  const effectiveName =
    patch.name !== undefined
      ? (patch.name as string | null)
      : (current?.name ?? null);

  // Force write for named staff unless super admin explicitly set read-only
  if (nameGetsBoardWrite(effectiveName) && body.board_write !== false) {
    patch.board_write = true;
  }

  async function write(includeBoardCrewId: boolean) {
    const next = { ...patch };
    if (!includeBoardCrewId) {
      delete next.board_crew_id;
    }
    const select = includeBoardCrewId
      ? USER_SELECT_WITH_CREW
      : USER_SELECT_BASIC;
    return auth.supabase
      .from("app_users")
      .update(next)
      .eq("id", id)
      .select(select)
      .single();
  }

  let { data, error } = await write(true);
  if (error && isMissingBoardCrewColumn(error.message)) {
    ({ data, error } = await write(false));
  }

  if (error) {
    const msg =
      error.message.includes("duplicate") || error.code === "23505"
        ? "That email is already in use."
        : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireSuperAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;

  const { error } = await auth.supabase
    .from("app_users")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
