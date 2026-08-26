"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { CrewLocale } from "@/lib/i18n/crew-t";
import { formatDateLocale, t } from "@/lib/i18n/crew-t";

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

interface CrewJobsListProps {
  assignments: Assignment[];
  showActions?: boolean;
  variant?: "cards" | "rows";
  locale?: CrewLocale;
}

export default function CrewJobsList({
  assignments,
  showActions = false,
  variant = "cards",
  locale = "en",
}: CrewJobsListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleResponse = async (
    assignmentId: string,
    status: "accepted" | "declined",
  ) => {
    setLoading(assignmentId);
    try {
      const body = assignmentId.startsWith("job:")
        ? { jobId: assignmentId.slice(4), status }
        : { assignmentId, status };

      const response = await fetch("/api/crew/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to respond to assignment");
      }

      toast.success(
        status === "accepted"
          ? t(locale, "jobAccepted")
          : t(locale, "jobDeclined"),
      );
      router.refresh();
    } catch (error) {
      console.error("Response error:", error);
      toast.error(t(locale, "respondFailed"));
    } finally {
      setLoading(null);
    }
  };

  function actionButtons(assignment: Assignment) {
    const canRespond =
      showActions &&
      ["pending", "accepted", "declined"].includes(assignment.status);
    if (!canRespond) return null;

    const busy = loading === assignment.id;
    const showAccept = assignment.status !== "accepted";
    const showDecline = assignment.status !== "declined";

    return (
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {showAccept ? (
          <button
            type="button"
            onClick={() => handleResponse(assignment.id, "accepted")}
            disabled={loading !== null}
            className="min-h-9 rounded-md bg-lime-400 px-2.5 py-1.5 text-xs font-semibold text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
          >
            {busy ? "…" : t(locale, "accept")}
          </button>
        ) : null}
        {showDecline ? (
          <button
            type="button"
            onClick={() => handleResponse(assignment.id, "declined")}
            disabled={loading !== null}
            className="min-h-9 rounded-md border border-border-default px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:border-red-500/40 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-red-400 sm:min-h-0"
          >
            {busy ? "…" : t(locale, "decline")}
          </button>
        ) : null}
      </div>
    );
  }

  const getWorkKindColor = (workKind: string | null) => {
    switch (workKind) {
      case "rough":
        return "bg-blue-500/15 text-blue-800 dark:text-blue-200";
      case "trim":
        return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
      case "service":
        return "bg-violet-500/15 text-violet-800 dark:text-violet-200";
      default:
        return "bg-bg-form text-text-secondary";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <span className="rounded-full bg-lime-400/20 px-2 py-1 text-xs font-semibold text-lime-800 dark:text-lime-300">
            {t(locale, "statusAccepted")}
          </span>
        );
      case "declined":
        return (
          <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-700 dark:text-red-300">
            {t(locale, "statusDeclined")}
          </span>
        );
      case "pending":
        return (
          <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
            {t(locale, "statusPending")}
          </span>
        );
      case "scheduled":
        return (
          <span className="rounded-full bg-bg-form px-2 py-1 text-xs font-semibold text-text-secondary">
            {t(locale, "statusScheduled")}
          </span>
        );
      default:
        return null;
    }
  };

  const formatKind = (workKind: string | null) => {
    if (!workKind) return null;
    if (workKind === "rough") return t(locale, "rough");
    if (workKind === "trim") return t(locale, "trim");
    if (workKind === "service") return t(locale, "service");
    return workKind.charAt(0).toUpperCase() + workKind.slice(1);
  };

  if (variant === "rows") {
    return (
      <div className="w-full overflow-hidden rounded-xl border border-border-default bg-bg-raised">
        <ul className="divide-y divide-border-subtle">
          <li
            className={`hidden gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted lg:grid lg:px-5 ${
              showActions
                ? "lg:grid-cols-[7.5rem_minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_5.5rem_5.5rem_minmax(9rem,auto)]"
                : "lg:grid-cols-[7.5rem_minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_5.5rem_5.5rem]"
            }`}
          >
            <span>{t(locale, "colDate")}</span>
            <span>{t(locale, "colJob")}</span>
            <span>{t(locale, "colAddress")}</span>
            <span>{t(locale, "colAssignee")}</span>
            <span>{t(locale, "colKind")}</span>
            <span className={showActions ? "" : "text-right"}>
              {t(locale, "colStatus")}
            </span>
            {showActions ? (
              <span className="text-right">{t(locale, "colActions")}</span>
            ) : null}
          </li>
          {assignments.map((assignment) => {
            const job = assignment.jobs;
            const kind = formatKind(job.work_kind);
            const actions = actionButtons(assignment);

            return (
              <li
                key={assignment.id}
                className="px-3 py-3 sm:px-4 lg:px-5 lg:py-2"
              >
                <div className="lg:hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs tabular-nums text-text-muted">
                        {formatDateLocale(job.work_date, locale)}
                        {kind ? ` · ${kind}` : ""}
                      </p>
                      <p className="mt-0.5 font-medium leading-snug text-text-primary">
                        {job.title}
                      </p>
                    </div>
                    {getStatusBadge(assignment.status)}
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
                  {actions ? <div className="mt-3">{actions}</div> : null}
                </div>

                <div
                  className={`hidden items-center gap-3 lg:grid ${
                    showActions
                      ? "lg:grid-cols-[7.5rem_minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_5.5rem_5.5rem_minmax(9rem,auto)]"
                      : "lg:grid-cols-[7.5rem_minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_5.5rem_5.5rem]"
                  }`}
                >
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
                    {kind || "—"}
                  </span>
                  <span
                    className={`flex items-center ${showActions ? "" : "justify-end"}`}
                  >
                    {getStatusBadge(assignment.status)}
                  </span>
                  {showActions ? (
                    actions ?? (
                      <span className="text-right text-xs text-text-muted">
                        —
                      </span>
                    )
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => (
        <div
          key={assignment.id}
          className="overflow-hidden rounded-xl border border-border-default bg-bg-raised"
        >
          <div className="p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {assignment.jobs.work_kind && (
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${getWorkKindColor(
                        assignment.jobs.work_kind,
                      )}`}
                    >
                      {formatKind(assignment.jobs.work_kind)}
                    </span>
                  )}
                  {getStatusBadge(assignment.status)}
                </div>
                <h3 className="font-display text-lg font-bold tracking-tight text-text-primary">
                  {assignment.jobs.title}
                </h3>
                {assignment.jobs.client && (
                  <p className="mt-0.5 text-sm text-text-muted">
                    {assignment.jobs.client}
                  </p>
                )}
              </div>
            </div>

            <div className="mb-1 space-y-2">
              {assignment.jobs.site_address && (
                <p className="text-sm text-text-secondary">
                  {assignment.jobs.site_address}
                </p>
              )}

              <p className="text-sm font-medium text-text-primary">
                {formatDateLocale(assignment.jobs.work_date, locale)}
              </p>

              {assignment.jobs.notes && (
                <p className="text-sm text-text-muted">{assignment.jobs.notes}</p>
              )}
            </div>

            {actionButtons(assignment) ? (
              <div className="mt-4 border-t border-border-subtle pt-4">
                {actionButtons(assignment)}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
