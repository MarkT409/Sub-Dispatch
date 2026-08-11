import { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:noreply@lantanaelectric.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function sendCrewAssignmentNotifications(
  supabase: SupabaseClient,
  jobId: string,
  crewMemberIds: string[]
) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("VAPID keys not configured, skipping push notifications");
    return;
  }

  try {
    // Get job details
    const { data: job } = await supabase
      .from("jobs")
      .select("title, work_date, site_address, work_kind")
      .eq("id", jobId)
      .single();

    if (!job) return;

    // Format work date
    const workDate = job.work_date
      ? new Date(job.work_date).toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
      : "upcoming";

    // Get crew users and their push subscriptions
    const { data: crewUsers } = await supabase
      .from("crew_users")
      .select("*, crew_push_subscriptions(*)")
      .in("crew_member_id", crewMemberIds)
      .eq("push_notifications_enabled", true);

    if (!crewUsers || crewUsers.length === 0) return;

    const payload = JSON.stringify({
      title: "New Job Assignment",
      body: `${job.title} - ${workDate}`,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      url: "/crew",
      tag: `job-${jobId}`,
      data: {
        jobId,
        url: "/crew",
      },
    });

    // Send notifications to all subscribed devices
    const promises: Promise<void>[] = [];

    for (const crewUser of crewUsers) {
      if (!crewUser.crew_push_subscriptions) continue;

      for (const subscription of crewUser.crew_push_subscriptions) {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        promises.push(
          webpush
            .sendNotification(pushSubscription, payload)
            .then(() => {
              // Update notified_at timestamp
              return supabase
                .from("job_assignments")
                .update({ notified_at: new Date().toISOString() })
                .eq("job_id", jobId)
                .eq("crew_member_id", crewUser.crew_member_id);
            })
            .catch(async (error) => {
              console.error("Push notification error:", error);
              // If subscription is invalid, remove it
              if (error.statusCode === 410 || error.statusCode === 404) {
                await supabase
                  .from("crew_push_subscriptions")
                  .delete()
                  .eq("id", subscription.id);
              }
            })
            .then(() => {})
        );
      }
    }

    await Promise.all(promises);
  } catch (error) {
    console.error("Error sending crew notifications:", error);
  }
}
