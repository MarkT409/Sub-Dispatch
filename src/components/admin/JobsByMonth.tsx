"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/admin-format";
import { jobGross, sumJobGross } from "@/lib/admin-metrics";
import type { Job } from "@/lib/admin-types";
import { getCurrentBillingWeekRange } from "@/lib/sheets/job-board-parse";

type MonthGroup = {
  key: string;
  label: string;
  jobs: Job[];
};

function monthKeyFromJob(job: Job) {
  const raw = job.work_date ?? job.start_date;
  if (!raw) return "unknown";
  const iso = raw.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(iso) ? iso : "unknown";
}

function monthLabel(key: string) {
  if (key === "unknown") return "No date";
  const [y, m] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function currentMonthKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

function currentWeekRange() {
  return getCurrentBillingWeekRange();
}

function jobDate(job: Job) {
  return job.work_date ?? job.start_date ?? "";
}

function isInCurrentWeek(job: Job, weekStart: string, weekEnd: string) {
  const d = jobDate(job);
  return Boolean(d && d >= weekStart && d <= weekEnd);
}

function sortJobsDesc(jobs: Job[]) {
  return [...jobs].sort((a, b) => jobDate(b).localeCompare(jobDate(a)));
}

export function groupJobsByMonth(jobs: Job[]): MonthGroup[] {
  const map = new Map<string, Job[]>();
  for (const job of jobs) {
    const key = monthKeyFromJob(job);
    const list = map.get(key) ?? [];
    list.push(job);
    map.set(key, list);
  }

  const keys = [...map.keys()].sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return b.localeCompare(a);
  });

  return keys.map((key) => ({
    key,
    label: monthLabel(key),
    jobs: sortJobsDesc(map.get(key) ?? []),
  }));
}

function weekRangeLabel(weekStart: string, weekEnd: string) {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

function SectionStats({ jobs }: { jobs: Job[] }) {
  const { total, priced, unpriced } = sumJobGross(jobs);
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
      <span className="font-display text-base font-semibold text-text-primary">
        {formatCurrency(total)}
        <span className="ml-1.5 text-xs font-normal text-text-muted">gross</span>
      </span>
      <span className="text-text-muted">
        {jobs.length} job{jobs.length === 1 ? "" : "s"}
        {unpriced > 0 ? (
          <span className="text-text-muted">
            {" "}
            · {priced} priced · {unpriced} open
          </span>
        ) : null}
      </span>
    </div>
  );
}

function JobsTable({ jobs, emptyMessage }: { jobs: Job[]; emptyMessage: string }) {
  if (jobs.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-text-muted">{emptyMessage}</p>;
  }

  const { total } = sumJobGross(jobs);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="bg-bg-form text-text-muted">
          <tr>
            <th className="px-5 py-2.5 font-medium">Address</th>
            <th className="px-5 py-2.5 font-medium">Date</th>
            <th className="px-5 py-2.5 font-medium">Assigned</th>
            <th className="px-5 py-2.5 font-medium">Kind</th>
            <th className="px-5 py-2.5 font-medium">Gross</th>
            <th className="px-5 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const gross = jobGross(job);
            return (
              <tr key={job.id} className="border-t border-border-subtle">
                <td className="px-5 py-3 font-medium">
                  <Link
                    href={`/admin/jobs/${job.id}`}
                    className="hover:text-amber-600 dark:hover:text-amber-400"
                  >
                    {job.title}
                  </Link>
                </td>
                <td className="px-5 py-3 text-text-secondary">
                  {formatDate(job.work_date ?? job.start_date)}
                </td>
                <td className="px-5 py-3 text-text-secondary">{job.assigned_to ?? "—"}</td>
                <td className="px-5 py-3 capitalize text-text-secondary">
                  {job.work_kind && job.work_kind !== "unknown" ? job.work_kind : job.job_type}
                </td>
                <td className="px-5 py-3 text-text-secondary">
                  {gross != null ? formatCurrency(gross) : "—"}
                </td>
                <td className="px-5 py-3 capitalize text-text-secondary">
                  {String(job.status).replace("_", " ")}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border-default bg-bg-form/60">
            <td colSpan={4} className="px-5 py-3 text-sm font-medium text-text-secondary">
              Total gross
            </td>
            <td className="px-5 py-3 font-display text-sm font-semibold">{formatCurrency(total)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** This week’s board jobs only (Mon–Fri). */
export function ThisWeekJobs({ jobs }: { jobs: Job[] }) {
  const { start, end } = currentWeekRange();
  const weekJobs = useMemo(
    () => sortJobsDesc(jobs.filter((j) => isInCurrentWeek(j, start, end))),
    [jobs, start, end],
  );

  return (
    <section className="overflow-hidden rounded-xl border border-border-default bg-bg-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold">This week</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Current billing week · {weekRangeLabel(start, end)} (Sat–Fri)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SectionStats jobs={weekJobs} />
          <Link href="/admin/jobs" className="text-sm text-amber-600 dark:text-amber-400">
            Manage jobs
          </Link>
        </div>
      </div>
      <JobsTable
        jobs={weekJobs}
        emptyMessage="No jobs on this week’s board yet. Sync from Sheets to pull them in."
      />
    </section>
  );
}

/**
 * Current calendar month, excluding this week’s jobs.
 * When the week rolls over, those jobs appear here automatically.
 */
export function CurrentMonthJobs({ jobs }: { jobs: Job[] }) {
  const thisMonth = currentMonthKey();
  const { start, end } = currentWeekRange();

  const monthJobs = useMemo(() => {
    return sortJobsDesc(
      jobs.filter((job) => {
        if (monthKeyFromJob(job) !== thisMonth) return false;
        return !isInCurrentWeek(job, start, end);
      }),
    );
  }, [jobs, thisMonth, start, end]);

  return (
    <section className="overflow-hidden rounded-xl border border-border-default bg-bg-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{monthLabel(thisMonth)}</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Earlier weeks this month (this Sat–Fri week stays above until Saturday)
          </p>
        </div>
        <SectionStats jobs={monthJobs} />
      </div>
      <JobsTable
        jobs={monthJobs}
        emptyMessage="No earlier jobs this month yet. When this week ends, those jobs move here."
      />
    </section>
  );
}

export function PreviousMonthsJobs({ jobs }: { jobs: Job[] }) {
  const thisMonth = currentMonthKey();
  const pastGroups = useMemo(
    () => groupJobsByMonth(jobs).filter((g) => g.key !== thisMonth),
    [jobs, thisMonth],
  );
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (pastGroups.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-border-default bg-bg-raised">
      <div className="border-b border-border-subtle px-5 py-4">
        <h2 className="font-display text-lg font-semibold">Previous months</h2>
        <p className="mt-0.5 text-xs text-text-muted">
          Open a month to view older board jobs (newest first).
        </p>
      </div>
      <div className="divide-y divide-border-subtle">
        {pastGroups.map((group) => {
          const isOpen = openKey === group.key;
          const { total, priced, unpriced } = sumJobGross(group.jobs);
          return (
            <div key={group.key}>
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : group.key)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-bg-form/80"
                aria-expanded={isOpen}
              >
                <span className="font-display text-base font-semibold text-text-primary">
                  {group.label}
                </span>
                <span className="flex items-center gap-3 text-sm text-text-muted">
                  <span className="font-display font-semibold text-text-primary">
                    {formatCurrency(total)}
                  </span>
                  <span>
                    {group.jobs.length} job{group.jobs.length === 1 ? "" : "s"}
                    {unpriced > 0 ? ` · ${priced} priced` : ""}
                  </span>
                  <span
                    className={`inline-block text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    ▾
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-border-subtle">
                  <JobsTable jobs={group.jobs} emptyMessage="No jobs." />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
