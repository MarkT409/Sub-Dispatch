"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { SyncSheetsButton } from "@/components/admin/SyncSheetsButton";
import { formatCurrency, formatDate } from "@/lib/admin-format";
import { JOB_STATUSES, JOB_TYPES, type Job } from "@/lib/admin-types";

export function JobsManager({ initialJobs }: { initialJobs: Job[] }) {
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
          site_address: formData.get("site_address"),
          start_date: formData.get("start_date"),
          end_date: formData.get("end_date"),
          quoted_amount: formData.get("quoted_amount"),
          notes: formData.get("notes"),
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
      toast.success("Job created");
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
          <SyncSheetsButton source="board" />
          <SyncSheetsButton source="board" weeks="all" label="Backfill all weeks" />
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
          <Field label="Site address" name="site_address" className="md:col-span-2" />
          <Field label="Start date" name="start_date" type="date" />
          <Field label="End date" name="end_date" type="date" />
          <Field label="Quoted amount" name="quoted_amount" type="number" step="0.01" />
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
              {saving ? "Saving…" : "Create job"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-border-default bg-bg-raised">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-bg-form text-text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Address</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Crew</th>
                <th className="px-5 py-3 font-medium">Assigned</th>
                <th className="px-5 py-3 font-medium">Kind</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Gross</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-text-muted">
                    No jobs yet. Sync from Sheets to pull the weekly board.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-t border-border-subtle">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/jobs/${job.id}`}
                        className="font-medium hover:text-amber-600 dark:hover:text-amber-400"
                      >
                        {job.title}
                      </Link>
                      {job.source === "google_sheets" && (
                        <p className="text-xs text-text-muted">From Sheets</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {formatDate(job.work_date ?? job.start_date)}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">{job.crew_lead ?? "—"}</td>
                    <td className="px-5 py-3 text-text-secondary">{job.assigned_to ?? "—"}</td>
                    <td className="px-5 py-3 capitalize">
                      {job.work_kind && job.work_kind !== "unknown"
                        ? job.work_kind
                        : job.job_type}
                    </td>
                    <td className="px-5 py-3 capitalize">
                      {job.status.replace("_", " ")}
                    </td>
                    <td className="px-5 py-3">
                      {job.invoice_gross != null || job.quoted_amount != null
                        ? formatCurrency(job.invoice_gross ?? job.quoted_amount)
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(job.id)}
                        className="text-xs text-red-600 hover:underline dark:text-red-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
