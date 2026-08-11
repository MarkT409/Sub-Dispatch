import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getVapidPublicKey, hasVapidEnv } from "@/lib/push/send";

type SubscribeBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  userAgent?: string;
};

export async function GET() {
  if (!hasVapidEnv()) {
    return NextResponse.json(
      { configured: false, publicKey: null },
      { status: 200 },
    );
  }
  return NextResponse.json({
    configured: true,
    publicKey: getVapidPublicKey(),
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin.errorResponse || !admin.supabase || !admin.user?.email) {
    return admin.errorResponse!;
  }

  if (!hasVapidEnv()) {
    return NextResponse.json(
      { error: "Push notifications are not configured on this server." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as SubscribeBody | null;
  const endpoint = body?.endpoint?.trim();
  const p256dh = body?.keys?.p256dh?.trim();
  const auth = body?.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "endpoint and keys.p256dh / keys.auth are required" },
      { status: 400 },
    );
  }

  const { error } = await admin.supabase.from("push_subscriptions").upsert(
    {
      admin_email: admin.user.email.toLowerCase(),
      endpoint,
      p256dh,
      auth,
      user_agent: body?.userAgent?.slice(0, 500) ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin.errorResponse || !admin.supabase) {
    return admin.errorResponse!;
  }

  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  const endpoint = body?.endpoint?.trim();
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  const { error } = await admin.supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
