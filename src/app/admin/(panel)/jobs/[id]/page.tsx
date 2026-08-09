import Link from "next/link";
import { notFound } from "next/navigation";
import { JobEditForm } from "@/components/admin/JobEditForm";
import type { Job } from "@/lib/admin-types";
import { getAdminDataClient } from "@/lib/supabase/admin-data";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminJobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getAdminDataClient();
  const { data, error } = await supabase.from("jobs").select("*").eq("id", id).single();

  if (error || !data) notFound();

  const job = data as Job;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/jobs" className="text-sm text-text-muted hover:text-amber-600">
          ← Jobs
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">{job.title}</h1>
        <p className="mt-1 text-text-muted">
          {job.source === "google_sheets"
            ? `From Sheets${job.sheets_week ? ` · ${job.sheets_week}` : ""}`
            : "Edit job details"}
        </p>
      </div>
      <JobEditForm job={job} />
    </div>
  );
}
