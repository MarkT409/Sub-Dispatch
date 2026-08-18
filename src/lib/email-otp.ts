import { createHash, randomInt, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail, isAdminEmail } from "@/lib/admin-auth";
import { sendBrandedEmail } from "@/lib/email/send";
import { otpEmail } from "@/lib/email/templates";

function hashOtp(email: string, code: string) {
  return createHash("sha256")
    .update(
      `${email}:${code}:${process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "dev"}`,
    )
    .digest("hex");
}

function safeEqualHash(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function isValidEmail(raw: string) {
  const email = normalizeEmail(raw);
  return email.includes("@") && email.includes(".");
}

export async function createEmailOtp(
  supabase: SupabaseClient,
  emailRaw: string,
): Promise<{ code: string; email: string; expiresAt: Date }> {
  const email = normalizeEmail(emailRaw);
  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await supabase.from("email_login_otps").delete().eq("email", email);

  const { error } = await supabase.from("email_login_otps").insert({
    email,
    code_hash: hashOtp(email, code),
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw new Error(error.message);
  return { code, email, expiresAt };
}

export async function verifyEmailOtp(
  supabase: SupabaseClient,
  emailRaw: string,
  code: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const email = normalizeEmail(emailRaw);
  const { data: rows } = await supabase
    .from("email_login_otps")
    .select("id, code_hash, attempts, expires_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  const row = rows?.[0];
  if (!row) return { ok: false, error: "No code found. Request a new one." };

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase.from("email_login_otps").delete().eq("email", email);
    return { ok: false, error: "Code expired. Request a new one." };
  }

  if ((row.attempts ?? 0) >= 5) {
    await supabase.from("email_login_otps").delete().eq("email", email);
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  const expected = hashOtp(email, code.trim());
  if (!safeEqualHash(expected, row.code_hash)) {
    await supabase
      .from("email_login_otps")
      .update({ attempts: (row.attempts ?? 0) + 1 })
      .eq("id", row.id);
    return { ok: false, error: "Incorrect code." };
  }

  await supabase.from("email_login_otps").delete().eq("email", email);
  return { ok: true, email };
}

export function isEmailSendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function allowEmailOtpDevCode() {
  return (
    process.env.EMAIL_OTP_DEV === "1" ||
    process.env.CREW_PHONE_OTP_DEV === "1" ||
    process.env.NODE_ENV === "development"
  );
}

export async function sendOtpEmail(
  to: string,
  code: string,
  locale: unknown = "en",
) {
  return sendBrandedEmail(to, otpEmail(code, locale));
}

/** Active app_users row with this email, or env allowlist bootstrap. */
export async function findAdminByEmail(
  supabase: SupabaseClient,
  emailRaw: string,
): Promise<{
  email: string;
  name: string | null;
  appUserId: string | null;
} | null> {
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) return null;

  const { data } = await supabase
    .from("app_users")
    .select("id, email, name, active")
    .eq("email", email)
    .eq("active", true)
    .maybeSingle();

  if (data) {
    return {
      email: data.email!,
      name: data.name,
      appUserId: data.id,
    };
  }

  if (!isAdminEmail(email)) return null;

  return { email, name: null, appUserId: null };
}

export async function findCrewByEmail(
  supabase: SupabaseClient,
  emailRaw: string,
): Promise<{
  email: string;
  name: string;
  crewMemberId: string | null;
  subWorkerId?: string;
  locale?: string | null;
} | null> {
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) return null;

  const { data: member } = await supabase
    .from("crew_members")
    .select("id, name, email, active, locale")
    .ilike("email", email)
    .eq("active", true)
    .maybeSingle();

  if (member) {
    return {
      email: normalizeEmail(member.email),
      name: member.name,
      crewMemberId: member.id,
      locale: member.locale ?? null,
    };
  }

  const { data: worker } = await supabase
    .from("sub_workers")
    .select("id, name, email, active")
    .ilike("email", email)
    .eq("active", true)
    .maybeSingle();

  if (worker?.email) {
    const { data: byName } = await supabase
      .from("crew_members")
      .select("id, locale")
      .ilike("name", worker.name.trim())
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    return {
      email: normalizeEmail(worker.email),
      name: worker.name,
      crewMemberId: byName?.id ?? null,
      subWorkerId: worker.id,
      locale: byName?.locale ?? null,
    };
  }

  return null;
}

export async function ensureCrewMemberForEmail(
  supabase: SupabaseClient,
  match: {
    email: string;
    name: string;
    crewMemberId: string | null;
  },
): Promise<{ id: string; name: string } | null> {
  if (match.crewMemberId) {
    await supabase
      .from("crew_members")
      .update({ email: match.email })
      .eq("id", match.crewMemberId);
    return { id: match.crewMemberId, name: match.name };
  }

  const { data: byEmail } = await supabase
    .from("crew_members")
    .select("id, name")
    .ilike("email", match.email)
    .eq("active", true)
    .maybeSingle();

  if (byEmail) {
    return { id: byEmail.id, name: byEmail.name };
  }

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
      .update({ email: match.email })
      .eq("id", byName.id);
    return { id: byName.id, name: byName.name };
  }

  const { data: created, error } = await supabase
    .from("crew_members")
    .insert({
      name: match.name.trim(),
      email: match.email,
      active: true,
    })
    .select("id, name")
    .single();

  if (error || !created) {
    console.error("ensureCrewMemberForEmail failed:", error?.message);
    return null;
  }

  return created;
}

export async function upsertEmailCrewUser(
  supabase: SupabaseClient,
  crewMember: { id: string; name: string },
  email: string,
) {
  const { data: existing } = await supabase
    .from("crew_users")
    .select("id, crew_member_id")
    .eq("provider", "email")
    .eq("provider_account_id", email)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("crew_users")
      .update({
        crew_member_id: crewMember.id,
        email,
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
      provider: "email",
      provider_account_id: email,
      email,
      name: crewMember.name,
      last_login_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Could not create email login");
  }

  return {
    crewUserId: created.id,
    crewMemberId: crewMember.id,
    crewMemberName: crewMember.name,
  };
}
