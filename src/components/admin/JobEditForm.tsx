"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Field, Select } from "@/components/admin/JobsManager";
import { formatCurrency, formatDate, formatWorkKind } from "@/lib/admin-format";
import { JOB_STATUSES, JOB_TYPES, type Job } from "@/lib/admin-types";

export function JobEditForm({ job }: { job: Job }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/admin/jobs/${job.id}`, {
        method: "PATCH",
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
        toast.error(result.error ?? "Could not save job");
        return;
      }
      toast.success("Job updated");
      router.refresh();
    } catch {
      toast.error("Could not save job");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-xl border border-border-default bg-bg-raised p-6 md:grid-cols-2"
    >
      {(job.crew_lead ||
        job.assigned_to ||
        job.work_date ||
        job.work_kind ||
        job.invoice_gross != null) && (
        <div className="md:col-span-2 grid gap-3 rounded-lg border border-border-subtle bg-bg-form px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Work date" value={formatDate(job.work_date)} />
          <Meta label="Crew lead" value={job.crew_lead ?? "—"} />
          <Meta label="Assigned" value={job.assigned_to ?? "—"} />
          <Meta
            label="Kind"
            value={formatWorkKind(job.work_kind) ?? "—"}
          />
          <Meta label="Plan" value={job.plan_name ?? "—"} />
          <Meta label="Sqft" value={job.plan_sqft ?? "—"} />
          <Meta
            label="Gross"
            value={
              job.invoice_gross != null || job.quoted_amount != null
                ? formatCurrency(job.invoice_gross ?? job.quoted_amount)
                : "—"
            }
          />
          {job.invoice_week && <Meta label="Invoice week" value={job.invoice_week} />}
        </div>
      )}
      <Field label="Title" name="title" required defaultValue={job.title} />
      <Field label="Client / builder" name="client" defaultValue={job.client ?? ""} />
      <Select
        label="Type"
        name="job_type"
        defaultValue={job.job_type}
        options={JOB_TYPES.map((t) => ({ value: t, label: t }))}
      />
      <Select
        label="Status"
        name="status"
        defaultValue={job.status}
        options={JOB_STATUSES.map((s) => ({
          value: s,
          label: s.replace("_", " "),
        }))}
      />
      <Field
        label="Site address"
        name="site_address"
        className="md:col-span-2"
        defaultValue={job.site_address ?? ""}
      />
      <Field label="Start date" name="start_date" type="date" defaultValue={job.start_date ?? ""} />
      <Field label="End date" name="end_date" type="date" defaultValue={job.end_date ?? ""} />
      <Field
        label="Quoted amount"
        name="quoted_amount"
        type="number"
        step="0.01"
        defaultValue={job.quoted_amount != null ? String(job.quoted_amount) : ""}
      />
      <div className="md:col-span-2">
        <label className="block text-sm text-text-muted">Notes</label>
        <textarea
          name="notes"
          rows={4}
          defaultValue={job.notes ?? ""}
          className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm"
        />
      </div>
      <div className="md:col-span-2 flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-navy-950 disabled:opacity-70"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/jobs")}
          className="rounded-full border border-border-default px-5 py-2.5 text-sm"
        >
          Back
        </button>
      </div>
    </form>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}
