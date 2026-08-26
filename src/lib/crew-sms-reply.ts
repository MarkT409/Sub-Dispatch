import type { SupabaseClient } from "@supabase/supabase-js";
import { phoneDigits, toE164 } from "@/lib/crew-phone-auth";
import { isCrewLocale } from "@/lib/i18n/crew-messages";
import { t, type CrewLocale } from "@/lib/i18n/crew-t";
import { siteBaseUrl } from "@/lib/crew-magic-link";
import { notifyAdminsOfCrewResponse } from "@/lib/notifications/crew-notifications";

export type SmsReplyIntent =
  | { kind: "accept" }
  | { kind: "decline" }
  | { kind: "help" }
  | { kind: "stop" }
  | { kind: "start" }
  | { kind: "unknown" };

/** Normalize inbound SMS into accept / decline / compliance intents. */
export function parseSmsReplyIntent(rawBody: string): SmsReplyIntent {
  const text = rawBody
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[!.?]+$/g, "")
    .trim();

  if (!text) return { kind: "unknown" };

  if (
    text === "stop" ||
    text === "unsubscribe" ||
    text === "cancel" ||
    text === "end" ||
    text === "quit" ||
    text === "parar" ||
    text === "cancelar"
  ) {
    return { kind: "stop" };
  }
  if (text === "start" || text === "unstop" || text === "comenzar") {
    return { kind: "start" };
  }
  if (text === "help" || text === "info" || text === "ayuda") {
    return { kind: "help" };
  }

  // Accept: YES / Y / SI / S / ACEPTO / ACEPTAR / OK
  if (
    text === "yes" ||
    text === "y" ||
    text === "si" ||
    text === "s" ||
    text === "ok" ||
    text === "okay" ||
    text === "acepto" ||
    text === "aceptar" ||
    text === "accept"
  ) {
    return { kind: "accept" };
  }
  // Decline: NO / N / RECHAZAR / DECLINE
  if (
    text === "no" ||
    text === "n" ||
    text === "rechazo" ||
    text === "rechazar" ||
    text === "decline" ||
    text === "declinar"
  ) {
    return { kind: "decline" };
  }

  return { kind: "unknown" };
}

async function findCrewMemberByPhone(
  supabase: SupabaseClient,
  fromPhone: string,
) {
  const digits = phoneDigits(fromPhone);
  if (digits.length !== 10) return null;

  const { data: members } = await supabase
    .from("crew_members")
    .select("id, name, phone, locale, active")
    .eq("active", true)
    .not("phone", "is", null);

  const byMember = (members ?? []).find(
    (m) => m.phone && phoneDigits(m.phone) === digits,
  );
  if (byMember) return byMember;

  const { data: users } = await supabase
    .from("crew_users")
    .select("crew_member_id, phone")
    .not("phone", "is", null)
    .not("crew_member_id", "is", null);

  const userHit = (users ?? []).find(
    (u) => u.phone && phoneDigits(u.phone) === digits && u.crew_member_id,
  );
  if (userHit?.crew_member_id) {
    const { data: member } = await supabase
      .from("crew_members")
      .select("id, name, phone, locale, active")
      .eq("id", userHit.crew_member_id)
      .eq("active", true)
      .maybeSingle();
    if (member) return member;
  }

  return null;
}

async function latestPendingAssignment(
  supabase: SupabaseClient,
  crewMemberId: string,
) {
  const { data } = await supabase
    .from("job_assignments")
    .select(
      "id, job_id, status, notified_at, assigned_at, jobs(id, title, site_address, work_date, work_kind, assigned_to, status)",
    )
    .eq("crew_member_id", crewMemberId)
    .eq("status", "pending")
    .order("notified_at", { ascending: false, nullsFirst: false })
    .order("assigned_at", { ascending: false })
    .limit(10);

  type JobBits = {
    id: string;
    title: string | null;
    site_address: string | null;
    work_date: string | null;
    work_kind: string | null;
    assigned_to: string | null;
    status?: string | null;
  };

  const rows = data ?? [];
  for (const row of rows) {
    const jobRaw = row.jobs as JobBits | JobBits[] | null;
    const job = Array.isArray(jobRaw) ? jobRaw[0] : jobRaw;
    if (!job || job.status === "cancelled") continue;
    return { assignment: row, job };
  }
  return null;
}

function twimlMessage(body: string) {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

/**
 * Handle an inbound Twilio SMS and return TwiML XML.
 */
export async function handleInboundCrewSms(
  supabase: SupabaseClient,
  options: { from: string; body: string },
): Promise<string> {
  const intent = parseSmsReplyIntent(options.body);
  const e164 = toE164(options.from);
  const member = await findCrewMemberByPhone(supabase, options.from);
  const locale: CrewLocale =
    member && isCrewLocale(member.locale) ? member.locale : "en";
  const scheduleUrl = `${siteBaseUrl()}/crew`;

  if (intent.kind === "help") {
    return twimlMessage(t(locale, "smsHelp", { url: scheduleUrl }));
  }

  if (intent.kind === "stop") {
    if (e164) {
      const { error } = await supabase.from("sms_opt_outs").upsert(
        {
          phone_e164: e164,
          opted_out_at: new Date().toISOString(),
          source: "sms_reply",
        },
        { onConflict: "phone_e164" },
      );
      if (error) console.warn("sms_opt_outs upsert:", error.message);
    }
    return twimlMessage(t(locale, "smsStopConfirm"));
  }

  if (intent.kind === "start") {
    if (e164) {
      const { error } = await supabase
        .from("sms_opt_outs")
        .delete()
        .eq("phone_e164", e164);
      if (error) console.warn("sms_opt_outs delete:", error.message);
    }
    return twimlMessage(t(locale, "smsStartConfirm"));
  }

  if (!member) {
    return twimlMessage(t(locale, "smsUnknownReply"));
  }

  if (intent.kind === "unknown") {
    return twimlMessage(t(locale, "smsUnknownReply"));
  }

  const pending = await latestPendingAssignment(supabase, member.id);
  if (!pending) {
    return twimlMessage(t(locale, "smsNoPendingJob", { url: scheduleUrl }));
  }

  const status = intent.kind === "accept" ? "accepted" : "declined";
  const { error } = await supabase
    .from("job_assignments")
    .update({
      status,
      responded_at: new Date().toISOString(),
    })
    .eq("id", pending.assignment.id)
    .eq("crew_member_id", member.id);

  if (error) {
    console.error("sms reply update failed:", error.message);
    return twimlMessage(t(locale, "respondFailed"));
  }

  const where =
    pending.job.site_address || pending.job.title || t(locale, "colJob");

  void notifyAdminsOfCrewResponse(supabase, {
    job: {
      id: pending.job.id,
      title: pending.job.title || where,
      site_address: pending.job.site_address ?? null,
      work_date: pending.job.work_date ?? null,
      work_kind: pending.job.work_kind ?? null,
      assigned_to: pending.job.assigned_to ?? null,
    },
    crewName: member.name,
    status,
  });

  return twimlMessage(
    t(
      locale,
      status === "accepted" ? "smsAcceptedConfirm" : "smsDeclinedConfirm",
      { where },
    ),
  );
}
