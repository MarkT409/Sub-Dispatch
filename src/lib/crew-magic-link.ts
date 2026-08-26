import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isTwilioConfigured } from "@/lib/crew-phone-auth";
import { sendBrandedEmail } from "@/lib/email/send";
import { magicLinkEmail } from "@/lib/email/templates";

export type MagicChannel = "phone" | "email";

function secret() {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "dev";
}

function hashToken(raw: string) {
  return createHash("sha256").update(`${raw}:${secret()}`).digest("hex");
}

function safeEqualHash(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function siteBaseUrl() {
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function magicLinkUrl(rawToken: string) {
  return `${siteBaseUrl()}/crew/auth/magic?token=${encodeURIComponent(rawToken)}`;
}

export async function createCrewMagicLink(
  supabase: SupabaseClient,
  channel: MagicChannel,
  destination: string,
): Promise<{ token: string; url: string; expiresAt: Date }> {
  const dest = destination.trim();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

  await supabase
    .from("crew_login_links")
    .delete()
    .eq("channel", channel)
    .eq("destination", dest)
    .is("used_at", null);

  const { error } = await supabase.from("crew_login_links").insert({
    channel,
    destination: dest,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw new Error(error.message);
  return { token, url: magicLinkUrl(token), expiresAt };
}

export async function verifyCrewMagicLink(
  supabase: SupabaseClient,
  rawToken: string,
): Promise<
  | { ok: true; channel: MagicChannel; destination: string }
  | { ok: false; error: string }
> {
  const token = String(rawToken || "").trim();
  if (!token || token.length < 20) {
    return { ok: false, error: "Invalid sign-in link." };
  }

  const expected = hashToken(token);
  const { data: rows } = await supabase
    .from("crew_login_links")
    .select("id, channel, destination, token_hash, attempts, expires_at, used_at")
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(40);

  const row = (rows ?? []).find((r) => safeEqualHash(expected, r.token_hash));
  if (!row) return { ok: false, error: "Sign-in link not found or already used." };

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase.from("crew_login_links").delete().eq("id", row.id);
    return { ok: false, error: "Sign-in link expired. Request a new one." };
  }

  if ((row.attempts ?? 0) >= 8) {
    await supabase.from("crew_login_links").delete().eq("id", row.id);
    return { ok: false, error: "Too many attempts. Request a new link." };
  }

  const { error: useErr } = await supabase
    .from("crew_login_links")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("used_at", null);

  if (useErr) {
    return { ok: false, error: "Could not use sign-in link." };
  }

  return {
    ok: true,
    channel: row.channel as MagicChannel,
    destination: row.destination,
  };
}

export async function sendMagicLinkSms(phoneE164: string, url: string) {
  if (!isTwilioConfigured()) {
    return { sent: false as const, reason: "twilio_not_configured" as const };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;
  const body = `Crew Dispatch sign-in link (expires in 20 min):\n${url}`;

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
    console.error("Twilio magic SMS failed:", text);
    throw new Error("Failed to send text message");
  }

  return { sent: true as const };
}

export async function sendMagicLinkEmail(
  to: string,
  url: string,
  locale: string | null | undefined = "en",
) {
  return sendBrandedEmail(to, magicLinkEmail(url, locale));
}

export function allowMagicLinkDevReveal() {
  return (
    process.env.EMAIL_OTP_DEV === "1" ||
    process.env.CREW_PHONE_OTP_DEV === "1" ||
    process.env.NODE_ENV === "development"
  );
}
