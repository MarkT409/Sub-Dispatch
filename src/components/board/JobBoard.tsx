"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { BoardCrew, BoardJob } from "@/lib/board";
import { matchCrewName } from "@/lib/board";
import { dedupeBoardJobs } from "@/lib/board-dedupe";
import { parseBoardTyping, boardKindColor } from "@/lib/board-typing";
import { addDaysIso, todayIsoChicago } from "@/lib/sheets/job-board-parse";
import { JobBoardCell } from "@/components/board/JobBoardCell";

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI"];
const MIN_SLOTS = 1;
const MAX_SLOTS = 20;

function isoDayDiff(fromIso: string, toIso: string) {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const from = Date.UTC(fy, fm - 1, fd, 12, 0, 0);
  const to = Date.UTC(ty, tm - 1, td, 12, 0, 0);
  return Math.round((to - from) / 86_400_000);
}

function formatBoardDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** e.g. "tomorrow (Tuesday, Aug 11)", "yesterday (Monday, Aug 10)" */
export function describeDispatchDay(iso: string, todayIso = todayIsoChicago()) {
  const calendar = formatBoardDate(iso);
  const diff = isoDayDiff(todayIso, iso);
  if (diff === 0) return `today (${calendar})`;
  if (diff === 1) return `tomorrow (${calendar})`;
  if (diff === -1) return `yesterday (${calendar})`;
  if (diff > 1) return `${calendar} — in ${diff} days`;
  return `${calendar} — ${Math.abs(diff)} days ago`;
}

function formatDispatchDayList(isos: string[], todayIso = todayIsoChicago()) {
  const sorted = [...isos].sort();
  const parts = sorted.map((d) => describeDispatchDay(d, todayIso));
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

type Props = {
  weekStart: string;
  weekLabel: string;
  days: string[];
  crews: BoardCrew[];
  jobs: BoardJob[];
  canWrite: boolean;
  showSync?: boolean;
  assigneeSuggestions?: string[];
};

export function JobBoard({
  weekStart,
  weekLabel,
  days,
  crews,
  jobs,
  canWrite,
  showSync = false,
  assigneeSuggestions = [],
}: Props) {
  const router = useRouter();
  const [fullscreen, setFullscreen] = useState(false);
  const [localJobs, setLocalJobs] = useState(jobs);
  const [localCrews, setLocalCrews] = useState(crews);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [shakeKeys, setShakeKeys] = useState<Set<string>>(new Set());
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeDrag = useRef<{
    crewId: string;
    startY: number;
    startSlots: number;
    lastTarget: number;
  } | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dense = !fullscreen;
  const rowPx = dense ? 40 : 48;

  useEffect(() => {
    setLocalJobs(jobs);
  }, [jobs]);

  useEffect(() => {
    setLocalCrews(crews);
  }, [crews]);

  useEffect(() => {
    // Changing weeks clears day selection so the wrong week can't stay checked
    setSelectedDays([]);
    setDispatchOpen(false);
  }, [days]);

  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  const jobsByCrewDay = useMemo(() => {
    const map = new Map<string, BoardJob[]>();
    for (const crew of localCrews) {
      for (const day of days) {
        const key = `${crew.name.toLowerCase()}|${day}`;
        const list = dedupeBoardJobs(
          localJobs.filter(
            (j) =>
              matchCrewName(j.crew_lead, crew.name) && j.work_date === day,
          ),
        );
        map.set(key, list);
      }
    }
    return map;
  }, [localCrews, days, localJobs]);

  function occupiedRowsForCrew(crew: BoardCrew) {
    let max = 0;
    for (const day of days) {
      const n =
        jobsByCrewDay.get(`${crew.name.toLowerCase()}|${day}`)?.length ?? 0;
      if (n > max) max = n;
    }
    return max;
  }

  function triggerShake(keys: string[]) {
    if (keys.length === 0) return;
    // Clear first so the animation can re-fire on repeated blocked shrinks
    setShakeKeys(new Set());
    requestAnimationFrame(() => {
      setShakeKeys(new Set(keys));
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => setShakeKeys(new Set()), 420);
    });
  }

  function shakeJobsInLastRow(crew: BoardCrew, slots: number) {
    const rowIdx = slots - 1;
    const keys: string[] = [];
    for (const day of days) {
      const list =
        jobsByCrewDay.get(`${crew.name.toLowerCase()}|${day}`) ?? [];
      if (list[rowIdx]) {
        keys.push(`${crew.id}|${day}|${rowIdx}`);
      }
    }
    triggerShake(keys);
  }

  async function persistSlots(crewId: string, row_slots: number) {
    const res = await fetch(`/api/board/crews/${crewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row_slots }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Could not resize crew rows");
      setLocalCrews(crews);
      return;
    }
    setLocalCrews((prev) =>
      prev.map((c) =>
        c.id === crewId ? { ...c, row_slots: data.crew.row_slots } : c,
      ),
    );
    router.refresh();
  }

  function applySlotTarget(crewId: string, target: number, occupied: number) {
    const floor = Math.max(MIN_SLOTS, occupied);
    let next = Math.min(MAX_SLOTS, Math.max(MIN_SLOTS, target));

    if (next < floor) {
      next = floor;
    }

    setLocalCrews((prev) => {
      const current = prev.find((c) => c.id === crewId);
      if (!current || current.row_slots === next) return prev;
      return prev.map((c) =>
        c.id === crewId ? { ...c, row_slots: next } : c,
      );
    });
    return next;
  }

  function onResizePointerDown(e: PointerEvent<HTMLDivElement>, crew: BoardCrew) {
    if (!canWrite) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeDrag.current = {
      crewId: crew.id,
      startY: e.clientY,
      startSlots: crew.row_slots,
      lastTarget: crew.row_slots,
    };
  }

  function onResizePointerMove(e: PointerEvent<HTMLDivElement>, crew: BoardCrew) {
    const drag = resizeDrag.current;
    if (!drag || drag.crewId !== crew.id) return;

    const deltaRows = Math.round((e.clientY - drag.startY) / rowPx);
    const target = drag.startSlots + deltaRows;
    if (target === drag.lastTarget) return;

    const occupied = occupiedRowsForCrew(crew);

    // Removing a row that still holds jobs → shake those boxes, block shrink
    if (target < occupied) {
      shakeJobsInLastRow(crew, occupied);
      const floored = applySlotTarget(crew.id, occupied, occupied);
      drag.lastTarget = floored;
      return;
    }

    const applied = applySlotTarget(crew.id, target, occupied);
    drag.lastTarget = applied;
  }

  function onResizePointerUp(e: PointerEvent<HTMLDivElement>, crew: BoardCrew) {
    const drag = resizeDrag.current;
    if (!drag || drag.crewId !== crew.id) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    const finalSlots = drag.lastTarget;
    const startSlots = drag.startSlots;
    resizeDrag.current = null;

    if (finalSlots !== startSlots) {
      if (persistTimer.current) clearTimeout(persistTimer.current);
      void persistSlots(crew.id, finalSlots);
    }
  }

  useEffect(() => {
    if (!fullscreen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!dispatchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !dispatching) setDispatchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatchOpen, dispatching]);

  function goWeek(offsetWeeks: number) {
    const next = addDaysIso(weekStart, offsetWeeks * 7);
    router.push(`?weekStart=${next}`);
  }

  async function confirmDispatch() {
    if (!canWrite || selectedDays.length === 0) return;

    setDispatching(true);
    try {
      const res = await fetch("/api/board/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: selectedDays }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Dispatch failed");
        return;
      }
      const teams = (data.teamsNotified as string[] | undefined)?.length
        ? ` → ${(data.teamsNotified as string[]).join(", ")}`
        : "";
      toast.success(
        `Dispatched ${data.jobsDispatched ?? 0} of ${data.jobsConsidered ?? 0} jobs (${data.assignmentsCreated ?? 0} assignments)${teams}`,
      );
      if (Array.isArray(data.skipped) && data.skipped.length > 0) {
        toast.message(
          `${data.skipped.length} job${data.skipped.length === 1 ? "" : "s"} skipped (no assignee or unresolved crew)`,
        );
      }
      setDispatchOpen(false);
      setSelectedDays([]);
      router.refresh();
    } catch {
      toast.error("Dispatch failed");
    } finally {
      setDispatching(false);
    }
  }

  function toggleDay(day: string) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  const dispatchDayPhrase = useMemo(
    () => formatDispatchDayList(selectedDays),
    [selectedDays],
  );
  const dispatchJobCount = useMemo(
    () =>
      localJobs.filter(
        (j) => j.work_date && selectedDays.includes(j.work_date),
      ).length,
    [localJobs, selectedDays],
  );

  async function commitCell(
    raw: string,
    crewLead: string,
    workDate: string,
    existing?: BoardJob,
  ) {
    const parsed = parseBoardTyping(raw, existing?.work_kind);

    if (parsed === "clear") {
      if (!existing) return;
      const res = await fetch(`/api/board/jobs/${existing.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not clear cell");
        throw new Error(data.error || "clear failed");
      }
      setLocalJobs((prev) => prev.filter((j) => j.id !== existing.id));
      router.refresh();
      return;
    }

    if (!parsed) {
      toast.error("Start with r (rough) or t (trim), e.g. r 1980 Campus – Juan");
      throw new Error("invalid typing");
    }

    const payload = {
      title: parsed.address,
      site_address: parsed.address,
      work_date: workDate,
      crew_lead: crewLead,
      assigned_to: parsed.assigned_to,
      work_kind: parsed.work_kind,
      notes: parsed.assigned_to?.includes("+L") ? "+L" : null,
    };

    if (existing) {
      const res = await fetch(`/api/board/jobs/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Save failed");
        throw new Error(data.error || "save failed");
      }
      setLocalJobs((prev) =>
        prev.map((j) => (j.id === existing.id ? { ...j, ...data.job } : j)),
      );
    } else {
      const res = await fetch("/api/board/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Save failed");
        throw new Error(data.error || "save failed");
      }
      setLocalJobs((prev) => [...prev, data.job as BoardJob]);
    }

    router.refresh();
  }

  const headerH = dense
    ? "h-8 text-[11px] sm:h-9 sm:text-xs"
    : "h-10 text-xs sm:h-11 sm:text-sm";
  const rowH = dense ? "min-h-9" : "min-h-11";
  const crewCol = dense ? "w-16 sm:w-20" : "w-20 sm:w-24";

  const boardTable = (
    <div className="w-full overflow-x-auto rounded border-2 border-black dark:border-gray-200">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col className={crewCol} />
          <col />
          <col />
          <col />
          <col />
          <col />
        </colgroup>
        <thead>
          <tr className="bg-black text-white dark:bg-gray-100 dark:text-black">
            <th
              className={`sticky left-0 z-10 border-r-2 border-black bg-black px-1 text-center font-bold tracking-wider dark:border-gray-200 dark:bg-gray-100 ${headerH}`}
            >
              CREW
            </th>
            {DAY_LABELS.map((label, i) => (
              <th
                key={label}
                className={`border-r-2 border-black px-1 text-center font-bold tracking-wider last:border-r-0 dark:border-gray-200 ${headerH}`}
              >
                <div>{label}</div>
                <div className="text-[9px] font-normal opacity-70">
                  {days[i]?.slice(5).replace("-", "/")}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {localCrews.map((crew) => {
            const occupied = occupiedRowsForCrew(crew);
            // Writers: exact slot count. Viewers: never clip jobs if slots lag behind.
            const rowCount = canWrite
              ? Math.max(crew.row_slots, 1)
              : Math.max(crew.row_slots, occupied, 1);

            return Array.from({ length: rowCount }).map((_, rowIdx) => (
              <tr key={`${crew.id}-${rowIdx}`}>
                {rowIdx === 0 && (
                  <td
                    rowSpan={rowCount}
                    className={`sticky left-0 z-10 border-r-2 border-b-2 border-black bg-gray-200 px-1 text-center align-middle text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs dark:border-gray-200 dark:bg-gray-700 dark:text-white ${dense ? "" : "sm:text-sm"} relative select-none`}
                  >
                    <span className="pointer-events-none px-0.5">
                      {crew.name}
                    </span>
                    {canWrite && (
                      <div
                        role="separator"
                        aria-orientation="horizontal"
                        aria-label={`Resize ${crew.name} rows`}
                        title="Drag down to add a row · drag up to remove"
                        className="absolute inset-x-0 bottom-0 z-20 flex h-3 cursor-row-resize items-end justify-center touch-none"
                        onPointerDown={(e) => onResizePointerDown(e, crew)}
                        onPointerMove={(e) => onResizePointerMove(e, crew)}
                        onPointerUp={(e) => onResizePointerUp(e, crew)}
                        onPointerCancel={(e) => onResizePointerUp(e, crew)}
                      >
                        <span className="mb-0.5 h-0.5 w-6 rounded-full bg-black/35 dark:bg-white/40" />
                      </div>
                    )}
                  </td>
                )}
                {days.map((day) => {
                  const list =
                    jobsByCrewDay.get(`${crew.name.toLowerCase()}|${day}`) ??
                    [];
                  const job = list[rowIdx];
                  const cellKey = `${crew.id}|${day}|${rowIdx}`;
                  const isCrewLast = rowIdx === rowCount - 1;
                  return (
                    <td
                      key={`${crew.id}-${day}-${rowIdx}`}
                      className={`border-r-2 border-black p-0 align-top last:border-r-0 dark:border-gray-200 ${rowH} ${boardKindColor(job?.work_kind)} ${
                        isCrewLast
                          ? "border-b-2 border-b-black dark:border-b-gray-200"
                          : "border-b border-b-gray-400 dark:border-b-gray-500"
                      }`}
                    >
                      <JobBoardCell
                        job={job}
                        canWrite={canWrite}
                        dense={dense}
                        shaking={shakeKeys.has(cellKey)}
                        suggestions={assigneeSuggestions}
                        onCommit={(raw, existing) =>
                          commitCell(raw, crew.name, day, existing)
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => goWeek(-1)}
          className="rounded border border-border-default px-2.5 py-1 text-sm hover:bg-bg-raised"
        >
          ← Prev
        </button>
        <h2 className="min-w-[6.5rem] text-center font-display text-base font-bold tracking-wide sm:text-lg">
          {weekLabel}
        </h2>
        <button
          type="button"
          onClick={() => goWeek(1)}
          className="rounded border border-border-default px-2.5 py-1 text-sm hover:bg-bg-raised"
        >
          Next →
        </button>
        <button
          type="button"
          onClick={() => router.push("?")}
          className="text-sm text-text-muted hover:text-text-primary"
        >
          This week
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border-default bg-bg-raised p-1">
              {days.map((day, i) => {
                const on = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`rounded-md px-2 py-1 text-[11px] font-bold tracking-wide ${
                      on
                        ? "bg-lime-400 text-lime-950"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                    title={describeDispatchDay(day)}
                  >
                    {DAY_LABELS[i]}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={selectedDays.length === 0}
              onClick={() => setDispatchOpen(true)}
              className="rounded-lg bg-lime-400 px-3 py-1.5 text-sm font-semibold text-black hover:bg-lime-300 disabled:opacity-60"
            >
              Dispatch Crews?
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          className="rounded-lg border border-border-default bg-bg-raised px-3 py-1.5 text-sm font-medium text-text-primary hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-amber-400"
        >
          {fullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>
    </div>
  );

  const boardBody = (
    <div className={`w-full space-y-3 ${dense ? "max-w-6xl" : ""}`}>
      {toolbar}
      {boardTable}
      {localCrews.length === 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          No board crews configured. Run migration{" "}
          <code className="text-xs">005_app_roles_board.sql</code> in Supabase.
        </p>
      )}
    </div>
  );

  return (
    <>
      {fullscreen ? (
        <div className="fixed inset-0 z-[100] flex flex-col bg-bg-base text-text-primary">
          <div className="flex-1 overflow-auto p-3 sm:p-4">{boardBody}</div>
        </div>
      ) : (
        boardBody
      )}

      {dispatchOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dispatch-confirm-title"
          onClick={() => {
            if (!dispatching) setDispatchOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border-default bg-bg-raised p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="dispatch-confirm-title"
              className="font-display text-lg font-bold text-text-primary"
            >
              Confirm dispatch
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Are you sure you want to notify crews for{" "}
              <span className="font-semibold text-text-primary">
                {dispatchDayPhrase}
              </span>
              ?
            </p>
            <p className="mt-2 text-sm text-text-muted">
              This will send{" "}
              <span className="font-medium text-text-secondary">
                {dispatchJobCount} job{dispatchJobCount === 1 ? "" : "s"}
              </span>{" "}
              to the matching sub crews.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={dispatching}
                onClick={() => setDispatchOpen(false)}
                className="rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-base disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={dispatching}
                onClick={() => void confirmDispatch()}
                className="rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-lime-950 hover:bg-lime-300 disabled:opacity-60"
              >
                {dispatching ? "Dispatching…" : "Yes, notify crews"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
