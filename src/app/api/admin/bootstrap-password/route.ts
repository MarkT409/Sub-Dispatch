import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  adminAllowlistConfigured,
  hasSupabaseEnv,
  isAdminEmail,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  if (!adminAllowlistConfigured()) {
    return NextResponse.json({ error: "Admin allowlist is not configured." }, { status: 503 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;

  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is required to set up passwords." },
      { status: 503 },
    );
  }

  if (!bootstrapSecret) {
    return NextResponse.json(
      {
        error:
          "Add ADMIN_BOOTSTRAP_SECRET to .env.local (any long random string), restart the server, and try again.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    secret?: string;
  } | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const secret = body?.secret ?? "";

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Email and a password of at least 8 characters are required." },
      { status: 400 },
    );
  }

  if (!isAdminEmail(email)) {
    return NextResponse.json(
      { error: "That email is not on the admin allowlist." },
      { status: 403 },
    );
  }

  if (secret !== bootstrapSecret) {
    return NextResponse.json({ error: "Bootstrap secret is incorrect." }, { status: 403 });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 502 });
  }

  const existing = listed.users.find((user) => user.email?.toLowerCase() === email);

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
  } else {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: true });
}
