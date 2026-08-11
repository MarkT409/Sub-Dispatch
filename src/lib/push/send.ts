import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatWorkKind } from "@/lib/admin-format";

export type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type NewBoardJobNotify = {
  id: string;
  title: string;
  site_address: string | null;
  work_kind: string | null;
  assigned_to: string | null;
};

export function hasVapidEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      (process.env.VAPID_SUBJECT || process.env.NEXT_PUBLIC_SITE_URL),
  );
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT ||
    `mailto:noreply@lantanaelectric.com`;

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
}

export async function notifyNewBoardJobs(
  supabase: SupabaseClient,
  jobs: NewBoardJobNotify[],
) {
  if (!jobs.length || !hasVapidEnv()) return { sent: 0, removed: 0 };

  configureWebPush();

  const { data: rows, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) {
    console.error("push_subscriptions load failed", error.message);
    return { sent: 0, removed: 0 };
  }

  const subscriptions = (rows ?? []) as PushSubscriptionRow[];
  if (!subscriptions.length) return { sent: 0, removed: 0 };

  let sent = 0;
  const deadIds: string[] = [];

  for (const job of jobs) {
    const kind = formatWorkKind(job.work_kind) ?? "Job";
    const address = job.site_address || job.title;
    const who = job.assigned_to || "Unassigned";
    const payload = JSON.stringify({
      title: "New Lantana job",
      body: `${kind} · ${address} · ${who}`,
      url: `/admin/jobs/${job.id}`,
    });

    for (const sub of subscriptions) {
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
        const status =
          err && typeof err === "object" && "statusCode" in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        if (status === 404 || status === 410) {
          deadIds.push(sub.id);
        } else {
          console.error("web-push send failed", status || err);
        }
      }
    }
  }

  const uniqueDead = [...new Set(deadIds)];
  if (uniqueDead.length) {
    await supabase.from("push_subscriptions").delete().in("id", uniqueDead);
  }

  return { sent, removed: uniqueDead.length };
}
