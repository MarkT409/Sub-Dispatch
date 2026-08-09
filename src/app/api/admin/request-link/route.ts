import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  adminAllowlistConfigured,
  hasSupabaseEnv,
  isAdminEmail,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: "Supabase is not configured. Add env vars to .env.local and restart the dev server." },
      { status: 503 },
    );
  }

  if (!adminAllowlistConfigured()) {
    return NextResponse.json(
      {
        error:
          "No admin allowlist configured. Set ADMIN_EMAILS or ADMIN_EMAIL_DOMAIN in .env.local and restart.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (!isAdminEmail(email)) {
    return NextResponse.json(
      {
        error:
          "That email is not on the admin allowlist. Use an address listed in ADMIN_EMAILS (or on ADMIN_EMAIL_DOMAIN), then restart the server.",
      },
      { status: 403 },
    );
  }

  const origin = new URL(request.url).origin;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || origin;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/admin`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
