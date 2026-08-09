import { NextResponse } from "next/server";
import {
  adminAllowlistConfigured,
  hasSupabaseEnv,
  isAdminEmail,
} from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  if (!adminAllowlistConfigured()) {
    return NextResponse.json(
      { error: "Admin allowlist is not configured." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  if (!isAdminEmail(email)) {
    return NextResponse.json(
      { error: "That email is not on the admin allowlist." },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const message = error.message.toLowerCase();
    const needsSetup =
      message.includes("invalid login") ||
      message.includes("invalid credentials") ||
      message.includes("email not confirmed");

    return NextResponse.json(
      {
        error: needsSetup
          ? "No password set for this account yet (or wrong password)."
          : error.message,
        needsSetup,
      },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}
