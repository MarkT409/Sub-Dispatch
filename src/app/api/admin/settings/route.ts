import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { formatPhoneDisplay, phoneDigits } from "@/lib/crew-phone-auth";
import { normalizeEmail } from "@/lib/admin-auth";

export async function GET() {
  const { supabase, user, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase || !user) return errorResponse!;

  const email = normalizeEmail(user.email);
  const { data, error } = await supabase
    .from("app_users")
    .select("id, email, name, phone, role, board_write")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: data ?? {
      email,
      name: null,
      phone: null,
      role: null,
      board_write: false,
    },
  });
}

export async function PATCH(request: Request) {
  const { supabase, user, errorResponse } = await requireAdmin();
  if (errorResponse || !supabase || !user) return errorResponse!;

  const email = normalizeEmail(user.email);
  const body = await request.json().catch(() => null);
  const patch: Record<string, unknown> = {};

  if (body?.name !== undefined) {
    const name = String(body.name ?? "").trim();
    patch.name = name || null;
  }
  if (body?.phone !== undefined) {
    const raw = String(body.phone ?? "").trim();
    if (!raw) {
      patch.phone = null;
    } else if (phoneDigits(raw).length !== 10) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit US phone number." },
        { status: 400 },
      );
    } else {
      patch.phone = formatPhoneDisplay(raw);
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("app_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      {
        error:
          "No admin profile row yet. Sign in once with Google, or ask a super admin to add you under Users.",
      },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("app_users")
    .update(patch)
    .eq("id", existing.id)
    .select("id, email, name, phone, role, board_write")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
