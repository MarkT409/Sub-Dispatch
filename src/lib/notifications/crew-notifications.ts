import { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { isCrewLocale } from "@/lib/i18n/crew-messages";
import { formatDateLocale, t, type CrewLocale } from "@/lib/i18n/crew-t";
import { hasVapidEnv } from "@/lib/push/send";
import { isTwilioConfigured, toE164 } from "@/lib/crew-phone-auth";
import { siteBaseUrl } from "@/lib/crew-magic-link";
import { sendBrandedEmail } from "@/lib/email/send";
import { jobAlertEmail } from "@/lib/email/templates";
import { nameGetsBoardWrite } from "@/lib/supervisors";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:noreply@lantanaelectric.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

type JobNotifyBits = {
  id: string;
  title: string;
  site_address: string | null;
  work_date: string | null;
  work_kind: string | null;
};

function jobBody(job: JobNotifyBits, locale: CrewLocale) {
  const kindKey =
    job.work_kind === "rough" ||
    job.work_kind === "trim" ||
    job.work_kind === "service"
      ? job.work_kind
      : null;
  const kind = kindKey ? t(locale, kindKey) : t(locale, "colJob");
  const where = job.site_address || job.title || t(locale, "colJob");
  const when = formatDateLocale(job.work_date, locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  return `${kind} · ${where} · ${when}`;
}

async function sendJobAlertSms(phoneRaw: string, body: string) {
  if (!isTwilioConfigured()) return false;
  const to = toE164(phoneRaw);
  if (!to) return false;

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({
    To: to,
    From: from,
    Body: body.slice(0, 320),
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
    console.error("job alert SMS failed:", await res.text());
    return false;
  }
  return true;
}

async function sendJobAlertEmail(
  to: string,
  title: string,
  body: string,
  locale: CrewLocale,
) {
  try {
    const result = await sendBrandedEmail(
      to,
      jobAlertEmail({
        title,
        body,
        scheduleUrl: `${siteBaseUrl()}/crew`,
        locale,
      }),
    );
    return result.sent;
  } catch (err) {
    console.error("job alert email failed:", err);
    return false;
  }
}

/**
 * Notify assigned crew via web push (if enabled) plus SMS/email on their
 * roster phone/email contacts.
 */
export async function sendCrewAssignmentNotifications(
  supabase: SupabaseClient,
  jobId: string,
  crewMemberIds: string[],
) {
  if (!crewMemberIds.length) return;

  try {
    const { data: job } = await supabase
      .from("jobs")
      .select("id, title, work_date, site_address, work_kind")
      .eq("id", jobId)
      .single();

    if (!job) return;

    const { data: members } = await supabase
      .from("crew_members")
      .select("id, name, phone, email, locale")
      .in("id", crewMemberIds)
      .eq("active", true);

    const { data: crewUsers } = await supabase
      .from("crew_users")
      .select(
        "id, crew_member_id, phone, email, push_notifications_enabled, email_notifications_enabled, crew_push_subscriptions(*)",
      )
      .in("crew_member_id", crewMemberIds);

    type CrewUserNotify = {
      id: string;
      crew_member_id: string;
      phone: string | null;
      email: string | null;
      push_notifications_enabled: boolean | null;
      email_notifications_enabled: boolean | null;
      crew_push_subscriptions:
        | {
            id: string;
            endpoint: string;
            p256dh: string;
            auth: string;
          }[]
        | null;
    };

    const usersByMember = new Map<string, CrewUserNotify[]>();
    for (const u of (crewUsers ?? []) as CrewUserNotify[]) {
      const list = usersByMember.get(u.crew_member_id) ?? [];
      list.push(u);
      usersByMember.set(u.crew_member_id, list);
    }

    const notifiedMemberIds = new Set<string>();
    const promises: Promise<void>[] = [];

    for (const member of members ?? []) {
      const locale: CrewLocale = isCrewLocale(member.locale)
        ? member.locale
        : "en";
      const body = jobBody(job, locale);
      const title = t(locale, "pushNewJobTitle");
      const users = usersByMember.get(member.id) ?? [];

      // Web push
      if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        for (const crewUser of users) {
          if (!crewUser.push_notifications_enabled) continue;
          const subs = crewUser.crew_push_subscriptions;
          if (!Array.isArray(subs) || !subs.length) continue;

          const payload = JSON.stringify({
            title,
            body,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            url: "/crew",
            tag: `job-${jobId}`,
            data: { jobId, url: "/crew" },
          });

          for (const subscription of subs) {
            promises.push(
              webpush
                .sendNotification(
                  {
                    endpoint: subscription.endpoint,
                    keys: {
                      p256dh: subscription.p256dh,
                      auth: subscription.auth,
                    },
                  },
                  payload,
                )
                .then(() => {
                  notifiedMemberIds.add(member.id);
                })
                .catch(async (error) => {
                  console.error("Push notification error:", error);
                  if (error.statusCode === 410 || error.statusCode === 404) {
                    await supabase
                      .from("crew_push_subscriptions")
                      .delete()
                      .eq("id", subscription.id);
                  }
                })
                .then(() => {}),
            );
          }
        }
      }

      // SMS to roster / linked phone
      const phone =
        member.phone ||
        users.map((u) => u.phone).find((p) => Boolean(p)) ||
        null;
      if (phone) {
        promises.push(
          sendJobAlertSms(
            phone,
            `Sub-Dispatch: ${title}\n${body}\n${siteBaseUrl()}/crew`,
          ).then((ok) => {
            if (ok) notifiedMemberIds.add(member.id);
          }),
        );
      }

      // Email to roster / linked email (default on unless explicitly disabled)
      const emailPrefOff = users.some(
        (u) => u.email_notifications_enabled === false,
      );
      const email =
        member.email ||
        users.map((u) => u.email).find((e) => Boolean(e)) ||
        null;
      if (email && !emailPrefOff) {
        promises.push(
          sendJobAlertEmail(email, title, body, locale).then((ok) => {
            if (ok) notifiedMemberIds.add(member.id);
          }),
        );
      }
    }

    await Promise.all(promises);

    if (notifiedMemberIds.size) {
      await supabase
        .from("job_assignments")
        .update({ notified_at: new Date().toISOString() })
        .eq("job_id", jobId)
        .in("crew_member_id", [...notifiedMemberIds]);
    }
  } catch (error) {
    console.error("Error sending crew notifications:", error);
  }
}

/** Alert area managers (board-write / Dustin & Jacob) when crew accepts or declines. */
export async function notifyAdminsOfCrewResponse(
  supabase: SupabaseClient,
  options: {
    job: JobNotifyBits & { assigned_to?: string | null };
    crewName: string;
    status: "accepted" | "declined";
  },
) {
  if (!hasVapidEnv()) return { sent: 0 };

  try {
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    );

    const { data: managers, error: managersErr } = await supabase
      .from("app_users")
      .select("email, name, role, board_write, active")
      .eq("active", true);

    if (managersErr) {
      console.error("area managers load failed:", managersErr.message);
    }

    const managerEmails = new Set(
      (managers ?? [])
        .filter(
          (u) =>
            u.email &&
            (u.role === "super_admin" ||
              Boolean(u.board_write) ||
              nameGetsBoardWrite(u.name)),
        )
        .map((u) => String(u.email).toLowerCase()),
    );

    const { data: rows, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, admin_email");

    if (error || !rows?.length) {
      if (error) console.error("admin push load failed:", error.message);
      return { sent: 0 };
    }

    const targets = managerEmails.size
      ? rows.filter(
          (r) =>
            r.admin_email &&
            managerEmails.has(String(r.admin_email).toLowerCase()),
        )
      : rows;

    if (!targets.length) return { sent: 0 };

    const verb = options.status === "accepted" ? "accepted" : "declined";
    const where =
      options.job.site_address || options.job.title || "a job";
    const payload = JSON.stringify({
      title: `Crew ${verb} a job`,
      body: `${options.crewName} ${verb} · ${where}`,
      url: `/admin/jobs/${options.job.id}`,
      tag: `crew-response-${options.job.id}-${options.crewName}`,
      data: { url: `/admin/jobs/${options.job.id}` },
    });

    let sent = 0;
    const deadIds: string[] = [];

    for (const sub of targets) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        sent += 1;
      } catch (err) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          deadIds.push(sub.id);
        } else {
          console.error("admin response push failed", statusCode || err);
        }
      }
    }

    if (deadIds.length) {
      await supabase.from("push_subscriptions").delete().in("id", [
        ...new Set(deadIds),
      ]);
    }

    return { sent };
  } catch (error) {
    console.error("notifyAdminsOfCrewResponse failed:", error);
    return { sent: 0 };
  }
}
