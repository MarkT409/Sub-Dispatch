import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient, hasServiceRoleEnv } from "@/lib/supabase/service";
import { formatPhoneDisplay, phoneDigits } from "@/lib/crew-phone-auth";
import { normalizeContactName } from "@/lib/crew-lead-contacts";

export async function GET() {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const session = await auth();
  const crewMemberId = session?.user?.crewMemberId;
  if (!crewMemberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: member, error } = await supabase
    .from("crew_members")
    .select("id, name, email, phone")
    .eq("id", crewMemberId)
    .single();

  if (error || !member) {
    return NextResponse.json(
      { error: error?.message ?? "Profile not found" },
      { status: 404 },
    );
  }

  const { data: crewUser } = await supabase
    .from("crew_users")
    .select("push_notifications_enabled")
    .eq("crew_member_id", crewMemberId)
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    profile: {
      ...member,
      push_notifications_enabled: crewUser?.push_notifications_enabled ?? true,
    },
  });
}

export async function PATCH(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const session = await auth();
  const crewMemberId = session?.user?.crewMemberId;
  if (!crewMemberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const body = await request.json().catch(() => null);
  const memberPatch: Record<string, unknown> = {};

  if (body?.email !== undefined) {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (email && !email.includes("@")) {
      return NextResponse.json(
        { error: "Enter a valid email, or leave blank." },
        { status: 400 },
      );
    }
    memberPatch.email = email || null;
  }

  if (body?.phone !== undefined) {
    const raw = String(body.phone ?? "").trim();
    if (!raw) {
      memberPatch.phone = null;
    } else if (phoneDigits(raw).length !== 10) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit US phone number." },
        { status: 400 },
      );
    } else {
      memberPatch.phone = formatPhoneDisplay(raw);
    }
  }

  if (
    Object.keys(memberPatch).length === 0 &&
    body?.push_notifications_enabled === undefined
  ) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  if (Object.keys(memberPatch).length > 0) {
    const { error: memberErr } = await supabase
      .from("crew_members")
      .update(memberPatch)
      .eq("id", crewMemberId);

    if (memberErr) {
      return NextResponse.json({ error: memberErr.message }, { status: 500 });
    }
  }

  const { data: profile, error: fetchErr } = await supabase
    .from("crew_members")
    .select("id, name, email, phone")
    .eq("id", crewMemberId)
    .single();

  if (fetchErr || !profile) {
    return NextResponse.json(
      { error: fetchErr?.message ?? "Profile not found" },
      { status: 404 },
    );
  }

  if (memberPatch.phone !== undefined || memberPatch.email !== undefined) {
    const { data: workers } = await supabase
      .from("sub_workers")
      .select("id, name")
      .eq("active", true);

    const nameKey = normalizeContactName(profile.name);
    const match = (workers ?? []).find(
      (w) => normalizeContactName(w.name) === nameKey,
    );
    if (match) {
      const workerPatch: Record<string, unknown> = {};
      if (memberPatch.phone !== undefined) workerPatch.phone = profile.phone;
      if (memberPatch.email !== undefined) workerPatch.email = profile.email;
      if (Object.keys(workerPatch).length > 0) {
        await supabase.from("sub_workers").update(workerPatch).eq("id", match.id);
      }
    }
  }

  let pushEnabled = true;
  if (body?.push_notifications_enabled !== undefined) {
    pushEnabled = Boolean(body.push_notifications_enabled);
    await supabase
      .from("crew_users")
      .update({ push_notifications_enabled: pushEnabled })
      .eq("crew_member_id", crewMemberId);
  } else {
    const { data: cu } = await supabase
      .from("crew_users")
      .select("push_notifications_enabled")
      .eq("crew_member_id", crewMemberId)
      .limit(1)
      .maybeSingle();
    pushEnabled = cu?.push_notifications_enabled ?? true;
  }

  if (memberPatch.phone !== undefined && profile.phone) {
    const digits = phoneDigits(profile.phone);
    if (digits.length === 10) {
      await supabase
        .from("crew_users")
        .update({ phone: `+1${digits}` })
        .eq("crew_member_id", crewMemberId)
        .eq("provider", "phone");
    }
  }

  return NextResponse.json({
    profile: {
      ...profile,
      push_notifications_enabled: pushEnabled,
    },
  });
}
