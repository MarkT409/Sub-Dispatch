import { createHash, randomInt, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Last 10 digits for US numbers (strips leading 1). */
export function phoneDigits(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return d.slice(1);
  return d;
}

/** +1XXXXXXXXXX for valid US numbers, else null. */
export function toE164(raw: string): string | null {
  const d = phoneDigits(raw);
  if (d.length !== 10) return null;
  return `+1${d}`;
}

export function formatPhoneDisplay(raw: string): string {
  const d = phoneDigits(raw);
  if (d.length !== 10) return raw.trim();
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function hashOtp(phoneE164: string, code: string) {
  return createHash("sha256")
    .update(`${phoneE164}:${code}:${process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "dev"}`)
    .digest("hex");
}

function safeEqualHash(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export type PhoneRosterMatch = {
  name: string;
  phone: string;
  email: string | null;
  source: "sub_worker" | "crew_member";
  subWorkerId?: string;
  crewMemberId?: string;
};

/**
 * Find a person on the Crew tab (sub_workers) or crew_members roster by phone.
 */
export async function findRosterByPhone(
  supabase: SupabaseClient,
  rawPhone: string,
): Promise<PhoneRosterMatch | null> {
  const digits = phoneDigits(rawPhone);
  if (digits.length !== 10) return null;

  const { data: workers } = await supabase
    .from("sub_workers")
    .select("id, name, phone, email, active")
    .eq("active", true)
    .not("phone", "is", null);

  const worker = (workers ?? []).find(
    (w) => w.phone && phoneDigits(w.phone) === digits,
  );
  if (worker) {
    return {
      name: worker.name,
      phone: worker.phone!,
      email: worker.email ?? null,
      source: "sub_worker",
      subWorkerId: worker.id,
    };
  }

  const { data: members } = await supabase
    .from("crew_members")
    .select("id, name, phone, email, active")
    .eq("active", true)
    .not("phone", "is", null);

  const member = (members ?? []).find(
    (m) => m.phone && phoneDigits(m.phone) === digits,
  );
  if (member) {
    return {
      name: member.name,
      phone: member.phone!,
      email: member.email ?? null,
      source: "crew_member",
      crewMemberId: member.id,
    };
  }

  return null;
}

/**
 * Ensure a crew_members row exists for this phone login (sync from sub_workers).
 */
export async function ensureCrewMemberForPhone(
  supabase: SupabaseClient,
  match: PhoneRosterMatch,
): Promise<{ id: string; name: string } | null> {
  const displayPhone = formatPhoneDisplay(match.phone);
  const e164 = toE164(match.phone);

  if (match.crewMemberId) {
    await supabase
      .from("crew_members")
      .update({
        phone: displayPhone,
        ...(match.email ? { email: match.email } : {}),
      })
      .eq("id", match.crewMemberId);
    return { id: match.crewMemberId, name: match.name };
  }

  // Prefer existing member with same phone digits
  const { data: byPhone } = await supabase
    .from("crew_members")
    .select("id, name, phone")
    .eq("active", true)
    .not("phone", "is", null);

  const phoneHit = (byPhone ?? []).find(
    (m) => m.phone && phoneDigits(m.phone) === phoneDigits(match.phone),
  );
  if (phoneHit) {
    await supabase
      .from("crew_members")
      .update({
        phone: displayPhone,
        name: match.name,
        ...(match.email ? { email: match.email } : {}),
      })
      .eq("id", phoneHit.id);
    return { id: phoneHit.id, name: match.name };
  }

  // Same name from dispatch (Leo, etc.)
  const { data: byName } = await supabase
    .from("crew_members")
    .select("id, name")
    .ilike("name", match.name.trim())
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (byName) {
    await supabase
      .from("crew_members")
      .update({
        phone: displayPhone,
        ...(match.email ? { email: match.email } : {}),
      })
      .eq("id", byName.id);
    return { id: byName.id, name: byName.name };
  }

  const { data: created, error } = await supabase
    .from("crew_members")
    .insert({
      name: match.name.trim(),
      phone: displayPhone,
      email: match.email,
      active: true,
    })
    .select("id, name")
    .single();

  if (error || !created) {
    console.error("ensureCrewMemberForPhone failed:", error?.message);
    return null;
  }

  // Keep a stable phone-shaped account id even if e164 unused here
  void e164;
  return created;
}

export async function createPhoneOtp(
  supabase: SupabaseClient,
  phoneE164: string,
): Promise<{ code: string; expiresAt: Date }> {
  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Replace any prior codes for this phone
  await supabase.from("crew_login_otps").delete().eq("phone_e164", phoneE164);

  const { error } = await supabase.from("crew_login_otps").insert({
    phone_e164: phoneE164,
    code_hash: hashOtp(phoneE164, code),
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw new Error(error.message);
  return { code, expiresAt };
}

export async function verifyPhoneOtp(
  supabase: SupabaseClient,
  phoneE164: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: rows } = await supabase
    .from("crew_login_otps")
    .select("id, code_hash, attempts, expires_at")
    .eq("phone_e164", phoneE164)
    .order("created_at", { ascending: false })
    .limit(1);

  const row = rows?.[0];
  if (!row) return { ok: false, error: "No code found. Request a new one." };

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase.from("crew_login_otps").delete().eq("phone_e164", phoneE164);
    return { ok: false, error: "Code expired. Request a new one." };
  }

  if ((row.attempts ?? 0) >= 5) {
    await supabase.from("crew_login_otps").delete().eq("phone_e164", phoneE164);
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  const expected = hashOtp(phoneE164, code.trim());
  if (!safeEqualHash(expected, row.code_hash)) {
    await supabase
      .from("crew_login_otps")
      .update({ attempts: (row.attempts ?? 0) + 1 })
      .eq("id", row.id);
    return { ok: false, error: "Incorrect code." };
  }

  await supabase.from("crew_login_otps").delete().eq("phone_e164", phoneE164);
  return { ok: true };
}

export function isTwilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM_NUMBER?.trim(),
  );
}

export async function sendOtpSms(phoneE164: string, code: string) {
  if (!isTwilioConfigured()) {
    return { sent: false as const, reason: "twilio_not_configured" as const };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;
  const body = `Crew Dispatch code: ${code}. Expires in 10 minutes.`;

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({
    To: phoneE164,
    From: from,
    Body: body,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Twilio SMS failed:", text);
    throw new Error("Failed to send text message");
  }

  return { sent: true as const };
}

/**
 * Upsert crew_users row for phone provider and return ids for the JWT.
 */
export async function upsertPhoneCrewUser(
  supabase: SupabaseClient,
  crewMember: { id: string; name: string },
  phoneE164: string,
  email: string | null,
) {
  const { data: existing } = await supabase
    .from("crew_users")
    .select("id, crew_member_id")
    .eq("provider", "phone")
    .eq("provider_account_id", phoneE164)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("crew_users")
      .update({
        crew_member_id: crewMember.id,
        phone: phoneE164,
        email: email,
        name: crewMember.name,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return {
      crewUserId: existing.id,
      crewMemberId: crewMember.id,
      crewMemberName: crewMember.name,
    };
  }

  const { data: created, error } = await supabase
    .from("crew_users")
    .insert({
      crew_member_id: crewMember.id,
      provider: "phone",
      provider_account_id: phoneE164,
      phone: phoneE164,
      email: email,
      name: crewMember.name,
      last_login_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Could not create phone login");
  }

  return {
    crewUserId: created.id,
    crewMemberId: crewMember.id,
    crewMemberName: crewMember.name,
  };
}
