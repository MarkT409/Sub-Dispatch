import { CrewManager } from "@/components/admin/CrewManager";
import { getAdminDataClient } from "@/lib/supabase/admin-data";
import { seedSubTeamsIfEmpty } from "@/lib/sub-teams-data";

export default async function AdminCrewPage() {
  const supabase = await getAdminDataClient();
  const result = await seedSubTeamsIfEmpty(supabase);

  const seedError =
    result.error && result.teams.length === 0
      ? result.error.includes("does not exist") ||
        result.error.includes("schema cache")
        ? "Run migrations 006_sub_teams.sql and 007_sub_worker_contacts.sql in Supabase, then refresh this page."
        : result.error
      : result.error?.includes("phone") ||
          result.error?.includes("is_lead") ||
          result.error?.includes("schema cache")
        ? "Run migration 007_sub_worker_contacts.sql in Supabase, then refresh this page to sync lead contacts."
        : result.error;

  return (
    <CrewManager initialTeams={result.teams} seedError={seedError} />
  );
}
