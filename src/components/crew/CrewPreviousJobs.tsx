"use client";

import { useMemo, useState } from "react";
import { formatWeekLabel } from "@/lib/board";
import { addDaysIso } from "@/lib/sheets/job-board-parse";
import type { CrewLocale } from "@/lib/i18n/crew-t";
import {
  formatDateLocale,
  formatMonthLocale,
  jobCountLabel,
  t,
  weekCountLabel,
} from "@/lib/i18n/crew-t";

type Job = {
  id: string;
  title: string;
  client: string | null;
  site_address: string | null;
  work_date: string | null;
  work_kind: string | null;
  notes: string | null;
  assigned_to?: string | null;
};

type Assignment = {
  id: string;
  status: string;
  role: string;
  assigned_at: string;
  responded_at: string | null;
  jobs: Job;
};

type WeekGroup = {
  monday: string;
  label: string;
  jobs: Assignment[];
};

type MonthGroup = {
  key: string;
  label: string;
  weeks: WeekGroup[];
  jobCount: number;
};

function mondayOfIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  return addDaysIso(iso, -daysFromMonday);
}

function monthKeyFromIso(iso: string) {
  return iso.slice(0, 7);
}

function formatKind(workKind: string | null, locale: CrewLocale) {
  if (!workKind) return "—";
  if (workKind === "rough") return t(locale, "rough");
  if (workKind === "trim") return t(locale, "trim");
  if (workKind === "service") return t(locale, "service");
  return workKind.charAt(0).toUpperCase() + workKind.slice(1);
}

function statusLabel(status: string, locale: CrewLocale) {
  switch (status) {
    case "accepted":
      return t(locale, "statusAccepted");
    case "declined":
      return t(locale, "statusDeclined");
    case "pending":
      return t(locale, "statusPending");
    case "scheduled":
      return t(locale, "statusScheduled");
    default:
      return status;
  }
}

function statusClass(status: string) {
  switch (status) {
    case "accepted":
      return "text-lime-800 dark:text-lime-300";
    case "declined":
      return "text-red-700 dark:text-red-300";
    case "pending":
      return "text-amber-800 dark:text-amber-300";
    default:
      return "text-text-muted";
  }
}

export function groupPreviousByMonthWeeks(
  assignments: Assignment[],
  locale: CrewLocale = "en",
): MonthGroup[] {
  const byMonth = new Map<string, Map<string, Assignment[]>>();

  for (const a of assignments) {
    const date = a.jobs.work_date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const month = monthKeyFromIso(date);
    const monday = mondayOfIso(date);
    let weeks = byMonth.get(month);
    if (!weeks) {
      weeks = new Map();
      byMonth.set(month, weeks);
    }
    const list = weeks.get(monday) ?? [];
    list.push(a);
    weeks.set(monday, list);
  }

  const monthKeys = [...byMonth.keys()].sort((a, b) => b.localeCompare(a));

  return monthKeys.map((key) => {
    const weeksMap = byMonth.get(key)!;
    const mondays = [...weeksMap.keys()].sort((a, b) => b.localeCompare(a));
    const weeks: WeekGroup[] = mondays.map((monday) => {
      const jobs = (weeksMap.get(monday) ?? []).sort((a, b) =>
        (b.jobs.work_date ?? "").localeCompare(a.jobs.work_date ?? ""),
      );
      return {
        monday,
        label: formatWeekLabel(monday),
        jobs,
      };
    });
    return {
      key,
      label: formatMonthLocale(key, locale),
      weeks,
      jobCount: weeks.reduce((n, w) => n + w.jobs.length, 0),
    };
  });
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className={`inline-block text-xs text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      ▾
    </span>
  );
}

function JobRows({
  assignments,
  locale,
}: {
  assignments: Assignment[];
  locale: CrewLocale;
}) {
  return (
    <ul className="divide-y divide-border-subtle">
      <li className="hidden gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted lg:grid lg:grid-cols-[7.5rem_minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_6rem_5.5rem] lg:px-5">
        <span>{t(locale, "colDate")}</span>
        <span>{t(locale, "colJob")}</span>
        <span>{t(locale, "colAddress")}</span>
        <span>{t(locale, "colAssignee")}</span>
        <span>{t(locale, "colKind")}</span>
        <span className="text-right">{t(locale, "colStatus")}</span>
      </li>
      {assignments.map((a) => {
        const job = a.jobs;
        return (
          <li key={a.id} className="px-3 py-3 sm:px-4 lg:px-5 lg:py-2">
            <div className="lg:hidden">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs tabular-nums text-text-muted">
                    {formatDateLocale(job.work_date, locale)}
                    {job.work_kind
                      ? ` · ${formatKind(job.work_kind, locale)}`
                      : ""}
                  </p>
                  <p className="mt-0.5 font-medium leading-snug text-text-primary">
                    {job.title}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-medium ${statusClass(a.status)}`}
                >
                  {statusLabel(a.status, locale)}
                </span>
              </div>
              {job.site_address ? (
                <p className="mt-1.5 text-sm text-text-secondary">
                  {job.site_address}
                </p>
              ) : null}
              {(job.assigned_to || job.client) && (
                <p className="mt-1 text-xs text-text-muted">
                  {job.assigned_to || job.client}
                </p>
              )}
            </div>

            <div className="hidden items-center gap-3 lg:grid lg:grid-cols-[7.5rem_minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_6rem_5.5rem]">
              <span className="text-sm tabular-nums text-text-secondary">
                {formatDateLocale(job.work_date, locale)}
              </span>
              <span className="min-w-0 truncate font-medium text-text-primary">
                {job.title}
              </span>
              <span className="min-w-0 truncate text-sm text-text-muted">
                {job.site_address || "—"}
              </span>
              <span className="truncate text-sm text-text-secondary">
                {job.assigned_to || job.client || "—"}
              </span>
              <span className="text-sm text-text-secondary">
                {formatKind(job.work_kind, locale)}
              </span>
              <span
                className={`text-right text-sm font-medium ${statusClass(a.status)}`}
              >
                {statusLabel(a.status, locale)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function CrewPreviousJobs({
  assignments,
  locale = "en",
}: {
  assignments: Assignment[];
  locale?: CrewLocale;
}) {
  const months = useMemo(
    () => groupPreviousByMonthWeeks(assignments, locale),
    [assignments, locale],
  );

  const [openMonth, setOpenMonth] = useState<string | null>(
    () => months[0]?.key ?? null,
  );
  const [openWeek, setOpenWeek] = useState<string | null>(
    () => months[0]?.weeks[0]?.monday ?? null,
  );

  if (months.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-bg-raised px-5 py-10 text-center">
        <p className="text-text-muted">{t(locale, "noPreviousJobs")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-bg-raised">
      <div className="divide-y divide-border-subtle">
        {months.map((month) => {
          const monthOpen = openMonth === month.key;
          return (
            <div key={month.key}>
              <button
                type="button"
                onClick={() => {
                  setOpenMonth(monthOpen ? null : month.key);
                  if (!monthOpen && month.weeks[0]) {
                    setOpenWeek(month.weeks[0].monday);
                  }
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-bg-form/80 sm:px-5"
                aria-expanded={monthOpen}
              >
                <span className="font-display text-base font-semibold text-text-primary">
                  {month.label}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-text-muted sm:gap-3 sm:text-sm">
                  <span className="max-w-[11rem] truncate sm:max-w-none">
                    {weekCountLabel(locale, month.weeks.length)} ·{" "}
                    {jobCountLabel(locale, month.jobCount)}
                  </span>
                  <Chevron open={monthOpen} />
                </span>
              </button>

              {monthOpen && (
                <div className="border-t border-border-subtle bg-bg-base/40">
                  <div className="divide-y divide-border-subtle">
                    {month.weeks.map((week) => {
                      const weekOpen = openWeek === week.monday;
                      return (
                        <div key={week.monday}>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenWeek(weekOpen ? null : week.monday)
                            }
                            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bg-form/60 sm:px-5 sm:pl-8"
                            aria-expanded={weekOpen}
                          >
                            <span className="text-sm font-medium text-text-primary">
                              {t(locale, "week")} {week.label}
                            </span>
                            <span className="flex items-center gap-3 text-xs text-text-muted">
                              <span>
                                {jobCountLabel(locale, week.jobs.length)}
                              </span>
                              <Chevron open={weekOpen} />
                            </span>
                          </button>
                          {weekOpen && (
                            <div className="border-t border-border-subtle bg-bg-raised">
                              <JobRows
                                assignments={week.jobs}
                                locale={locale}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
