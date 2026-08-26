import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { WebSocket } from "ws";
import { sendCrewAssignmentNotifications } from "../src/lib/notifications/crew-notifications";

// Node 20: supabase realtime expects a WebSocket implementation
(globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

async function main() {
  loadEnv();
  process.env.NEXTAUTH_URL = "https://crew-dispatch.com";
  process.env.NEXT_PUBLIC_SITE_URL = "https://crew-dispatch.com";
  process.env.CREW_PHONE_OTP_DEV = "0";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: members, error: mErr } = await supabase
    .from("crew_members")
    .select("id, name, phone, email, active")
    .eq("active", true)
    .order("name");
  if (mErr) throw mErr;

  const mark = (members || []).find(
    (m) =>
      /mark/i.test(m.name || "") ||
      (m.email || "").toLowerCase().includes("trevino") ||
      (m.email || "").toLowerCase().includes("mark.trevino"),
  );

  console.log(
    "MEMBERS_WITH_PHONE",
    (members || [])
      .filter((m) => m.phone)
      .map((m) => ({ name: m.name, phone: m.phone, email: m.email })),
  );

  if (!mark) {
    console.log("NO_MARK_FOUND");
    process.exit(1);
  }
  console.log("TARGET", {
    id: mark.id,
    name: mark.name,
    phone: mark.phone,
    email: mark.email,
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const workDate = tomorrow.toISOString().slice(0, 10);

  const { data: job, error: jErr } = await supabase
    .from("jobs")
    .insert({
      title: "SMS test job — Crew Dispatch",
      client: "Internal test",
      job_type: "incoming",
      status: "scheduled",
      work_kind: "service",
      site_address: "123 Test Lane, Austin TX",
      work_date: workDate,
      notes: "Automated SMS/email notification test",
      source: "manual",
      assigned_to: mark.name,
    })
    .select("*")
    .single();
  if (jErr) throw jErr;
  console.log("JOB", job.id);

  const { error: aErr } = await supabase.from("job_assignments").insert({
    job_id: job.id,
    crew_member_id: mark.id,
    status: "pending",
    role: "crew",
    assigned_at: new Date().toISOString(),
  });
  if (aErr) throw aErr;

  await sendCrewAssignmentNotifications(supabase, job.id, [mark.id]);
  console.log("NOTIFY_DONE");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
