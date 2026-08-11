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

export default function CrewJobsList({ assignments, showActions = false }: CrewJobsListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleResponse = async (assignmentId: string, status: "accepted" | "declined") => {
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
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "trim":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "service":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Accepted</span>;
      case "declined":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Declined</span>;
      case "pending":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No date";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <div
          key={assignment.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {assignment.jobs.work_kind && (
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getWorkKindColor(
                        assignment.jobs.work_kind
                      )}`}
                    >
                      {assignment.jobs.work_kind.charAt(0).toUpperCase() + assignment.jobs.work_kind.slice(1)}
                    </span>
                  )}
                  {assignment.role === "lead" && (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      Lead
                    </span>
                  )}
                  {getStatusBadge(assignment.status)}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {assignment.jobs.title}
                </h3>
                {assignment.jobs.client && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Client: {assignment.jobs.client}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {assignment.jobs.site_address && (
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {assignment.jobs.site_address}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formatDate(assignment.jobs.work_date)}
                </span>
              </div>

              {assignment.jobs.notes && (
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {assignment.jobs.notes}
                  </span>
                </div>
              )}
            </div>

            {showActions && assignment.status === "pending" && (
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleResponse(assignment.id, "accepted")}
                  disabled={loading !== null}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading === assignment.id ? "Loading..." : "Accept"}
                </button>
                <button
                  onClick={() => handleResponse(assignment.id, "declined")}
                  disabled={loading !== null}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading === assignment.id ? "Loading..." : "Decline"}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
