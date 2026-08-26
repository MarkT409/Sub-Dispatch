"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CrewLocale } from "@/lib/i18n/crew-t";
import { formatDateLocale, t } from "@/lib/i18n/crew-t";

type MessageItem = {
  id: string;
  assignmentId: string | null;
  jobId: string;
  title: string;
  site_address: string | null;
  work_date: string | null;
  work_kind: string | null;
  assigned_to: string | null;
  status: "pending";
};

export function CrewMessagesBubble({
  locale = "en",
}: {
  locale?: CrewLocale;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [acceptingAll, setAcceptingAll] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/crew/messages");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setMessages(Array.isArray(data.messages) ? data.messages : []);
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

  async function respond(item: MessageItem, status: "accepted" | "declined") {
    setBusyId(item.id);
    try {
      const body = item.assignmentId
        ? { assignmentId: item.assignmentId, status }
        : { jobId: item.jobId, status };
      const res = await fetch("/api/crew/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("respond failed");
      toast.success(
        status === "accepted"
          ? t(locale, "jobAccepted")
          : t(locale, "jobDeclined"),
      );
      setMessages((prev) => prev.filter((m) => m.jobId !== item.jobId));
      router.refresh();
    } catch {
      toast.error(t(locale, "respondFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function acceptAll() {
    if (messages.length === 0 || acceptingAll || busyId !== null) return;
    setAcceptingAll(true);
    const snapshot = [...messages];
    let accepted = 0;
    try {
      for (const item of snapshot) {
        const body = item.assignmentId
          ? { assignmentId: item.assignmentId, status: "accepted" as const }
          : { jobId: item.jobId, status: "accepted" as const };
        const res = await fetch("/api/crew/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("respond failed");
        accepted += 1;
        setMessages((prev) => prev.filter((m) => m.jobId !== item.jobId));
      }
      toast.success(t(locale, "jobsAcceptedAll", { n: accepted }));
      router.refresh();
    } catch {
      toast.error(t(locale, "respondFailed"));
      await refresh();
    } finally {
      setAcceptingAll(false);
    }
  }

  const count = messages.length;
  const kindLabel = (kind: string | null) => {
    if (kind === "rough") return t(locale, "rough");
    if (kind === "trim") return t(locale, "trim");
    if (kind === "service") return t(locale, "service");
    return null;
  };
  const busy = busyId !== null || acceptingAll;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void refresh();
        }}
        className="relative inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-border-default bg-bg-raised text-text-secondary hover:border-amber-500/40 hover:text-text-primary"
        aria-label={t(locale, "messages")}
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
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-xl border border-border-default bg-bg-raised shadow-lg">
          <div className="border-b border-border-subtle px-3 py-2.5">
            <p className="font-display text-sm font-semibold text-text-primary">
              {t(locale, "messagesTitle")}
            </p>
          </div>

          {loading && messages.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">…</p>
          ) : messages.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">
              {t(locale, "noNewMessages")}
            </p>
          ) : (
            <ul className="max-h-[min(70vh,24rem)] divide-y divide-border-subtle overflow-y-auto">
              {messages.map((item) => {
                const kind = kindLabel(item.work_kind);
                const itemBusy = busyId === item.id;
                return (
                  <li key={item.id} className="px-3 py-3">
                    <p className="text-xs tabular-nums text-text-muted">
                      {formatDateLocale(item.work_date, locale)}
                      {kind ? ` · ${kind}` : ""}
                    </p>
                    <p className="mt-0.5 font-medium leading-snug text-text-primary">
                      {item.site_address || item.title}
                    </p>
                    {item.assigned_to ? (
                      <p className="mt-1 text-xs text-text-muted">
                        {item.assigned_to}
                      </p>
                    ) : null}

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void respond(item, "accepted")}
                        className="min-h-10 flex-1 rounded-lg bg-lime-400 px-3 py-2 text-sm font-semibold text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {itemBusy ? "…" : t(locale, "accept")}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void respond(item, "declined")}
                        className="min-h-10 flex-1 rounded-lg bg-[#D2042D] px-3 py-2 text-sm font-semibold text-white hover:bg-[#b50327] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {itemBusy ? "…" : t(locale, "decline")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {count > 0 ? (
            <div className="border-t border-border-subtle p-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void acceptAll()}
                className="min-h-10 w-full rounded-lg bg-lime-400 px-3 py-2 text-sm font-semibold text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {acceptingAll
                  ? t(locale, "acceptingAll")
                  : t(locale, "acceptAllCount", { n: count })}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
