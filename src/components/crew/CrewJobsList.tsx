"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Job = {
  id: string;
  title: string;
  client: string | null;
  site_address: string | null;
  work_date: string | null;
  work_kind: string | null;
  notes: string | null;
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
}

export default function CrewJobsList({
  assignments,
  showActions = false,
}: CrewJobsListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleResponse = async (
    assignmentId: string,
    status: "accepted" | "declined",
  ) => {
    setLoading(assignmentId);
    try {
      const response = await fetch("/api/crew/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, status }),
      });

      if (!response.ok) {
        throw new Error("Failed to respond to assignment");
      }

      toast.success(status === "accepted" ? "Job accepted!" : "Job declined");
      router.refresh();
    } catch (error) {
      console.error("Response error:", error);
      toast.error("Failed to respond. Please try again.");
    } finally {
      setLoading(null);
    }
  };

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
            Accepted
          </span>
        );
      case "declined":
        return (
          <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-700 dark:text-red-300">
            Declined
          </span>
        );
      case "pending":
        return (
          <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
            Pending
          </span>
        );
      case "scheduled":
        return (
          <span className="rounded-full bg-bg-form px-2 py-1 text-xs font-semibold text-text-secondary">
            Scheduled
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No date";
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

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
                      {assignment.jobs.work_kind.charAt(0).toUpperCase() +
                        assignment.jobs.work_kind.slice(1)}
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
                {formatDate(assignment.jobs.work_date)}
              </p>

              {assignment.jobs.notes && (
                <p className="text-sm text-text-muted">{assignment.jobs.notes}</p>
              )}
            </div>

            {showActions && assignment.status === "pending" && (
              <div className="mt-4 flex gap-3 border-t border-border-subtle pt-4">
                <button
                  type="button"
                  onClick={() => handleResponse(assignment.id, "accepted")}
                  disabled={loading !== null}
                  className="flex-1 rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading === assignment.id ? "Saving…" : "Accept"}
                </button>
                <button
                  type="button"
                  onClick={() => handleResponse(assignment.id, "declined")}
                  disabled={loading !== null}
                  className="flex-1 rounded-lg border border-border-default px-4 py-2.5 text-sm font-medium text-text-secondary hover:border-red-500/40 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-red-400"
                >
                  {loading === assignment.id ? "Saving…" : "Decline"}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
