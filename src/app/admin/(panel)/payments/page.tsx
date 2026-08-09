import { PaymentsManager } from "@/components/admin/PaymentsManager";
import type { CrewMember, Job, PaymentIn, PaymentOut } from "@/lib/admin-types";
import { getAdminDataClient } from "@/lib/supabase/admin-data";

export default async function AdminPaymentsPage() {
  const supabase = await getAdminDataClient();

  const [{ data: jobs }, { data: crew }, { data: paymentsIn }, { data: paymentsOut }] =
    await Promise.all([
      supabase.from("jobs").select("*").order("title"),
      supabase.from("crew_members").select("*").order("name"),
      supabase.from("payments_in").select("*, jobs(title)").order("received_at", { ascending: false }),
      supabase
        .from("payments_out")
        .select("*, jobs(title), crew_members(name)")
        .order("paid_at", { ascending: false }),
    ]);

  return (
    <PaymentsManager
      jobs={(jobs as Job[]) ?? []}
      crew={(crew as CrewMember[]) ?? []}
      initialIn={(paymentsIn as (PaymentIn & { jobs?: { title: string } | null })[]) ?? []}
      initialOut={
        (paymentsOut as (PaymentOut & {
          jobs?: { title: string } | null;
          crew_members?: { name: string } | null;
        })[]) ?? []
      }
    />
  );
}
