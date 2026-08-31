"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type AdminMessageItem = {
  id: string;
  assignmentId: string;
  jobId: string;
  title: string;
  site_address: string | null;
  work_date: string | null;
  work_kind: string | null;
  assigned_to: string | null;
  crew_name: string | null;
  crew_lead: string | null;
  status: "accepted" | "declined";
  responded_at: string | null;
};

type Tab = "declined" | "accepted";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatWhen(iso: string | null) {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function kindLabel(kind: string | null) {
  if (kind === "rough") return "Rough";
  if (kind === "trim") return "Trim";
  if (kind === "service") return "Service";
  return null;
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function AdminMessagesBubble() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("declined");
  const [accepted, setAccepted] = useState<AdminMessageItem[]>([]);
  const [declined, setDeclined] = useState<AdminMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/messages");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setAccepted(Array.isArray(data.accepted) ? data.accepted : []);
      setDeclined(Array.isArray(data.declined) ? data.declined : []);
    } catch {
      /* ignore transient errors */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function dismiss(payload: {
    ids?: string[];
    all?: boolean;
    olderThanDays?: number;
  }) {
    const key =
      payload.ids?.join(",") ||
      (payload.all ? "all" : `older:${payload.olderThanDays}`);
    setBusy(key);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not clear notifications");
        return;
      }
      toast.success(
        data.dismissed === 1
          ? "Notification cleared"
          : `Cleared ${data.dismissed ?? 0} notifications`,
      );
      await refresh();
    } catch {
      toast.error("Could not clear notifications");
    } finally {
      setBusy(null);
    }
  }

  const declinedCount = declined.length;
  const acceptedCount = accepted.length;
  const total = declinedCount + acceptedCount;
  const items = tab === "declined" ? declined : accepted;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void refresh();
        }}
        className="relative inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-border-default bg-bg-raised text-text-secondary hover:border-amber-500/40 hover:text-text-primary"
        aria-label="Crew responses"
        aria-expanded={open}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 8h10M7 12h6m-8 7.5 2.4-2.4H18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8.1a2 2 0 0 0 2 2h.4L8 19.5Z"
          />
        </svg>
        {total > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-[60] mt-2 w-[min(100vw-1.5rem,24rem)] overflow-hidden rounded-xl border border-border-default bg-bg-raised shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-2.5">
            <p className="font-display text-sm font-semibold text-text-primary">
              Crew responses
            </p>
            {total > 0 ? (
              <div className="flex shrink-0 items-center gap-2 text-[11px]">
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void dismiss({ olderThanDays: 7 })}
                  className="text-text-muted hover:text-text-primary disabled:opacity-60"
                >
                  Clear 7d+
                </button>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Clear all accepted and declined notifications from this list?",
                      )
                    ) {
                      void dismiss({ all: true });
                    }
                  }}
                  className="font-medium text-red-600 hover:text-red-500 disabled:opacity-60"
                >
                  Clear all
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 border-b border-border-subtle">
            <button
              type="button"
              onClick={() => setTab("declined")}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === "declined"
                  ? "border-b-2 border-[#D2042D] text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Declined
              <CountBadge count={declinedCount} />
            </button>
            <button
              type="button"
              onClick={() => setTab("accepted")}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === "accepted"
                  ? "border-b-2 border-lime-500 text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Accepted
              <CountBadge count={acceptedCount} />
            </button>
          </div>

          {loading && items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">…</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">
              {tab === "declined"
                ? "No declined jobs yet"
                : "No accepted jobs yet"}
            </p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-border-subtle overflow-y-auto">
              {items.map((item) => {
                const kind = kindLabel(item.work_kind);
                const when = formatWhen(item.responded_at);
                const who =
                  item.crew_name ||
                  item.assigned_to ||
                  item.crew_lead ||
                  "Crew";
                return (
                  <li key={item.id} className="px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs tabular-nums text-text-muted">
                        {formatDate(item.work_date)}
                        {kind ? ` · ${kind}` : ""}
                      </p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            item.status === "declined"
                              ? "bg-[#D2042D]/15 text-[#D2042D]"
                              : "bg-lime-400/20 text-lime-700 dark:text-lime-300"
                          }`}
                        >
                          {item.status}
                        </span>
                        <button
                          type="button"
                          title="Remove from list"
                          disabled={Boolean(busy)}
                          onClick={() => void dismiss({ ids: [item.id] })}
                          className="rounded px-1.5 py-0.5 text-[11px] text-text-muted hover:bg-bg-base hover:text-red-600 disabled:opacity-60"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <p className="mt-0.5 font-medium leading-snug text-text-primary">
                      {item.site_address || item.title}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {who}
                      {item.crew_lead &&
                      item.crew_name &&
                      item.crew_lead !== item.crew_name
                        ? ` · ${item.crew_lead}`
                        : ""}
                    </p>
                    {when ? (
                      <p className="mt-1 text-[11px] text-text-muted">
                        Responded {when}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
