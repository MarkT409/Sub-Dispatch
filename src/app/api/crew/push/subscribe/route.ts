import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient, hasServiceRoleEnv } from "@/lib/supabase/service";
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
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { error: "Service role is not configured" },
      { status: 503 },
    );
  }
  if (!hasVapidEnv()) {
    return NextResponse.json(
      { error: "Push notifications are not configured on this server." },
      { status: 503 },
    );
  }

  const session = await auth();
  let crewUserId = session?.user?.crewUserId as string | undefined;
  if (!session?.user?.crewMemberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!crewUserId) {
    const { data: cu } = await supabase
      .from("crew_users")
      .select("id")
      .eq("crew_member_id", session.user.crewMemberId)
      .limit(1)
      .maybeSingle();
    crewUserId = cu?.id;
  }
  if (!crewUserId) {
    return NextResponse.json(
      { error: "No crew user profile found for this account." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as SubscribeBody | null;
  const endpoint = body?.endpoint?.trim();
  const p256dh = body?.keys?.p256dh?.trim();
  const authKey = body?.keys?.auth?.trim();

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json(
      { error: "endpoint and keys.p256dh / keys.auth are required" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("crew_push_subscriptions").upsert(
    {
      crew_user_id: crewUserId,
      endpoint,
      p256dh,
      auth: authKey,
      user_agent: body?.userAgent?.slice(0, 500) ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase
    .from("crew_users")
    .update({ push_notifications_enabled: true })
    .eq("id", crewUserId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { error: "Service role is not configured" },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.crewMemberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    endpoint?: string;
  } | null;
  const endpoint = body?.endpoint?.trim();
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("crew_push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
