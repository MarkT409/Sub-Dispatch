import { CrewManager } from "@/components/admin/CrewManager";
import type { CrewMember } from "@/lib/admin-types";
import { getAdminDataClient } from "@/lib/supabase/admin-data";

export default async function AdminCrewPage() {
  const supabase = await getAdminDataClient();
  const { data } = await supabase.from("crew_members").select("*").order("name");

  return <CrewManager initialCrew={(data as CrewMember[]) ?? []} />;
}
