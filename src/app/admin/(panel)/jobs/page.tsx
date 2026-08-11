import { JobsManager } from "@/components/admin/JobsManager";
import { isVisibleLantanaJob, type Job } from "@/lib/admin-types";
import { getAdminDataClient } from "@/lib/supabase/admin-data";

export default async function AdminJobsPage() {
  const supabase = await getAdminDataClient();
  
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .order("work_date", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  const { data: crewMembers } = await supabase
    .from("crew_members")
    .select("id, name, email, active")
    .order("name");

  const filteredJobs = ((jobs as Job[]) ?? []).filter(isVisibleLantanaJob);

  return <JobsManager initialJobs={filteredJobs} crewMembers={crewMembers ?? []} />;
}
