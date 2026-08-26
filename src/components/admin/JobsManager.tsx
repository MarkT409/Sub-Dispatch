"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { SyncSheetsButton } from "@/components/admin/SyncSheetsButton";
import { formatCurrency, formatDate, formatWorkKind } from "@/lib/admin-format";
import { JOB_STATUSES, JOB_TYPES, WORK_KINDS, type Job } from "@/lib/admin-types";

type CrewMember = {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
};

export function JobsManager({ 
  initialJobs,
  crewMembers = [],
}: { 
  initialJobs: Job[];
  crewMembers?: CrewMember[];
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          client: formData.get("client"),
          job_type: formData.get("job_type"),
          status: formData.get("status"),
          work_kind: formData.get("work_kind"),
          site_address: formData.get("site_address"),
          work_date: formData.get("work_date"),
          start_date: formData.get("start_date"),
          end_date: formData.get("end_date"),
          quoted_amount: formData.get("quoted_amount"),
          notes: formData.get("notes"),
          crew_assignments: formData.getAll("crew_assignments[]"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error ?? "Could not create job");
        return;
      }
      setJobs((prev) => [result.job, ...prev]);
      form.reset();
      setOpen(false);
      toast.success("Job created and crew notified");
      router.refresh();
    } catch {
      toast.error("Could not create job");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this job?")) return;
    const response = await fetch(`/api/admin/jobs/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete job");
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
    toast.success("Job deleted");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="mt-1 text-text-muted">
            Field work from the Google Sheets board, plus manually added jobs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SyncSheetsButton source="invoices" />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-navy-950 hover:bg-amber-400"
          >
            {open ? "Close form" : "New job"}
          </button>
        </div>
      </div>

      {open && (
        <form
          onSubmit={handleCreate}
          className="grid gap-4 rounded-xl border border-border-default bg-bg-raised p-6 md:grid-cols-2"
        >
          <Field label="Title" name="title" required />
          <Field label="Client / builder" name="client" />
          <Select
            label="Type"
            name="job_type"
            options={JOB_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <Select
            label="Status"
            name="status"
            options={JOB_STATUSES.map((s) => ({
              value: s,
              label: s.replace("_", " "),
            }))}
          />
          <Select
            label="Work kind"
            name="work_kind"
            options={[
              { value: "", label: "— Select —" },
              ...WORK_KINDS.map((k) => ({ value: k, label: k.charAt(0).toUpperCase() + k.slice(1) }))
            ]}
          />
          <Field label="Work date" name="work_date" type="date" required />
          <Field label="Site address" name="site_address" className="md:col-span-2" />
          <Field label="Start date" name="start_date" type="date" />
          <Field label="End date" name="end_date" type="date" />
          <Field label="Quoted amount" name="quoted_amount" type="number" step="0.01" />
          
          {crewMembers.length > 0 && (
            <div className="md:col-span-2">
              <label className="block text-sm text-text-muted mb-2">Assign crew members</label>
              <div className="grid gap-2 md:grid-cols-2">
                {crewMembers.filter(c => c.active).map(crew => (
                  <label key={crew.id} className="flex items-center gap-2 p-2 rounded border border-border-default hover:bg-bg-input cursor-pointer">
                    <input
                      type="checkbox"
                      name="crew_assignments[]"
                      value={crew.id}
                      className="rounded"
                    />
                    <span className="text-sm">{crew.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm text-text-muted">Notes</label>
            <textarea
              name="notes"
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-navy-950 disabled:opacity-70"
            >
              {saving ? "Saving…" : "Create job & assign crew"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-border-default bg-bg-raised">
        {jobs.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-text-muted sm:px-5">
            No jobs yet. Sync from Sheets to pull the weekly board.
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {jobs.map((job) => {
              const gross =
                job.invoice_gross != null || job.quoted_amount != null
                  ? formatCurrency(job.invoice_gross ?? job.quoted_amount)
                  : "—";
              const kind =
                formatWorkKind(job.work_kind) ??
                formatWorkKind(job.job_type) ??
                job.job_type;
              return (
                <li key={job.id} className="px-4 py-3.5 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/jobs/${job.id}`}
                        className="font-medium text-text-primary hover:text-amber-600 dark:hover:text-amber-400"
                      >
                        {job.title}
                      </Link>
                      <p className="mt-1 text-xs text-text-muted">
                        {formatDate(job.work_date ?? job.start_date)}
                        <span className="mx-1.5 text-border-default">·</span>
                        {job.assigned_to ?? job.crew_lead ?? "Unassigned"}
                        <span className="mx-1.5 text-border-default">·</span>
                        {kind}
                        {job.source === "google_sheets" ? (
                          <>
                            <span className="mx-1.5 text-border-default">·</span>
                            Sheets
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-sm font-semibold">{gross}</p>
                      <p className="mt-0.5 text-[11px] capitalize text-text-muted">
                        {job.status.replace("_", " ")}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDelete(job.id)}
                        className="mt-1.5 text-xs text-red-600 hover:underline dark:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  step,
  className = "",
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
  className?: string;
  defaultValue?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm text-text-muted">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        step={step}
        defaultValue={defaultValue}
        className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm"
      />
    </div>
  );
}

function Select({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-text-muted">{label}</label>
      <select
        name={name}
        required
        defaultValue={defaultValue ?? options[0]?.value}
        className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm capitalize"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export { Field, Select };
