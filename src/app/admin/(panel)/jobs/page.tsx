import { JobsManager } from "@/components/admin/JobsManager";
import { isVisibleLantanaJob, type Job } from "@/lib/admin-types";
import { getAdminDataClient } from "@/lib/supabase/admin-data";

export default async function AdminJobsPage() {
  const supabase = await getAdminDataClient();
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .order("work_date", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  const jobs = ((data as Job[]) ?? []).filter(isVisibleLantanaJob);

  return <JobsManager initialJobs={jobs} />;
}
