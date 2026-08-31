"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { BoardCrew, BoardJob } from "@/lib/board";
import { matchCrewName } from "@/lib/board";
import { dedupeBoardJobs } from "@/lib/board-dedupe";
import { parseBoardTyping, boardKindColor, formatBoardCellDisplay, isUncoloredBoardCrew } from "@/lib/board-typing";
import { addDaysIso, todayIsoChicago } from "@/lib/sheets/job-board-parse";
import { JobBoardCell } from "@/components/board/JobBoardCell";
import { SyncSheetsButton } from "@/components/admin/SyncSheetsButton";
import {
  BoardFilters,
  EMPTY_BOARD_FILTERS,
  jobMatchesBoardFilters,
  type BoardFilterState,
  type BoardFilterTeam,
} from "@/components/board/BoardFilters";
import type { CrewLocale } from "@/lib/i18n/crew-t";
import { t } from "@/lib/i18n/crew-t";

const DAY_LABELS_EN = ["MON", "TUE", "WED", "THU", "FRI"];
const DAY_LABELS_ES = ["LUN", "MAR", "MIÉ", "JUE", "VIE"];
const MIN_SLOTS = 1;
const MAX_SLOTS = 20;

function isoDayDiff(fromIso: string, toIso: string) {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const from = Date.UTC(fy, fm - 1, fd, 12, 0, 0);
  const to = Date.UTC(ty, tm - 1, td, 12, 0, 0);
  return Math.round((to - from) / 86_400_000);
}

function formatBoardDate(iso: string, locale: CrewLocale = "en") {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
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
  enableFilters?: boolean;
  /** Sub-teams from Crew page for the All crews filter. */
  filterTeams?: BoardFilterTeam[];
  assigneeSuggestions?: string[];
  /** Crew portal language; admin defaults to English. */
  locale?: CrewLocale;
};

export function JobBoard({
  weekStart,
  weekLabel,
  days,
  crews,
  jobs,
  canWrite,
  enableFilters = false,
  filterTeams = [],
  assigneeSuggestions = [],
  locale = "en",
}: Props) {
  const DAY_LABELS = locale === "es" ? DAY_LABELS_ES : DAY_LABELS_EN;
  const router = useRouter();
  const [fullscreen, setFullscreen] = useState(false);
  const [localJobs, setLocalJobs] = useState(jobs);
  const [localCrews, setLocalCrews] = useState(crews);
  const [filters, setFilters] = useState<BoardFilterState>(EMPTY_BOARD_FILTERS);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedCrewLeads, setSelectedCrewLeads] = useState<string[]>([]);
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
    setSelectedCrewLeads([]);
    setDispatchOpen(false);
    setFilters(EMPTY_BOARD_FILTERS);
  }, [days]);

  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  const filtersActive = Boolean(
    filters.query ||
      filters.team ||
      filters.person ||
      filters.day ||
      filters.kind,
  );

  const filteredJobs = useMemo(() => {
    if (!enableFilters || !filtersActive) return localJobs;
    return localJobs.filter((j) =>
      jobMatchesBoardFilters(j, filters, filterTeams),
    );
  }, [enableFilters, filtersActive, localJobs, filters, filterTeams]);

  // Always show every supervisor row — filtering only hides job cells.
  // Hiding rows made a Lantana team filter look like "the board only has Lantana."
  const displayedCrews = localCrews;

  const jobsByCrewDay = useMemo(() => {
    const map = new Map<string, BoardJob[]>();
    for (const crew of displayedCrews) {
      for (const day of days) {
        const key = `${crew.name.toLowerCase()}|${day}`;
        const list = dedupeBoardJobs(
          filteredJobs.filter(
            (j) =>
              matchCrewName(j.crew_lead, crew.name) && j.work_date === day,
          ),
        );
        map.set(key, list);
      }
    }
    return map;
  }, [displayedCrews, days, filteredJobs]);

  /** Whole-week rough / trim / total (not per supervisor). */
  const weekKindTotals = useMemo(() => {
    let rough = 0;
    let trim = 0;
    let other = 0;
    const daySet = new Set(days);
    for (const job of filteredJobs) {
      if (!job.work_date || !daySet.has(job.work_date)) continue;
      const onBoard = displayedCrews.some((c) =>
        matchCrewName(job.crew_lead, c.name),
      );
      if (!onBoard) continue;
      if (job.work_kind === "trim") trim += 1;
      else if (job.work_kind === "rough" || job.work_kind === "service")
        rough += 1;
      else other += 1;
    }
    return { rough, trim, other, total: rough + trim + other };
  }, [filteredJobs, days, displayedCrews]);

  const dayKindTotals = useMemo(() => {
    const map = new Map<string, { rough: number; trim: number; total: number }>();
    for (const day of days) {
      let rough = 0;
      let trim = 0;
      let other = 0;
      for (const crew of displayedCrews) {
        const list =
          jobsByCrewDay.get(`${crew.name.toLowerCase()}|${day}`) ?? [];
        for (const job of list) {
          if (job.work_kind === "trim") trim += 1;
          else if (job.work_kind === "rough" || job.work_kind === "service")
            rough += 1;
          else other += 1;
        }
      }
      map.set(day, { rough, trim, total: rough + trim + other });
    }
    return map;
  }, [days, displayedCrews, jobsByCrewDay]);

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
    if (selectedCrewLeads.length === 0) {
      toast.error("Select at least one crew to dispatch.");
      return;
    }

    setDispatching(true);
    try {
      const res = await fetch("/api/board/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days: selectedDays,
          crewLeads: selectedCrewLeads,
        }),
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
      setSelectedCrewLeads([]);
      router.refresh();
    } catch {
      toast.error("Dispatch failed");
    } finally {
      setDispatching(false);
    }
  }

  function openDispatchDialog() {
    if (selectedDays.length === 0) return;
    const withJobs = localCrews
      .filter((crew) =>
        localJobs.some(
          (j) =>
            j.work_date &&
            selectedDays.includes(j.work_date) &&
            matchCrewName(j.crew_lead, crew.name) &&
            Boolean(j.assigned_to?.trim()),
        ),
      )
      .map((c) => c.name);
    setSelectedCrewLeads(
      withJobs.length > 0 ? withJobs : localCrews.map((c) => c.name),
    );
    setDispatchOpen(true);
  }

  function toggleDispatchCrew(name: string) {
    setSelectedCrewLeads((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
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
        (j) =>
          j.work_date &&
          selectedDays.includes(j.work_date) &&
          selectedCrewLeads.some((name) => matchCrewName(j.crew_lead, name)) &&
          Boolean(j.assigned_to?.trim()),
      ).length,
    [localJobs, selectedDays, selectedCrewLeads],
  );

  async function commitCell(
    raw: string,
    crewLead: string,
    workDate: string,
    existing?: BoardJob,
  ) {
    const allowFreeform = isUncoloredBoardCrew(crewLead);
    const parsed = parseBoardTyping(raw, existing?.work_kind, {
      allowFreeform,
    });

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
      toast.error(
        allowFreeform
          ? "Enter a job, or use r/t for rough/trim color"
          : "Start with r (rough) or t (trim), e.g. r 1980 Campus – Juan",
      );
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
    <div className="w-full overflow-x-auto overscroll-x-contain rounded border-2 border-black [-webkit-overflow-scrolling:touch] dark:border-gray-200">
      <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
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
            {DAY_LABELS.map((label, i) => {
              const day = days[i];
              const counts = day
                ? (dayKindTotals.get(day) ?? { rough: 0, trim: 0, total: 0 })
                : { rough: 0, trim: 0, total: 0 };
              return (
                <th
                  key={label}
                  className={`relative border-r-2 border-black px-1 text-center font-bold tracking-wider last:border-r-0 dark:border-gray-200 ${headerH}`}
                >
                  {/* Day stays centered; R/T sit to its right without shifting it */}
                  <div>{label}</div>
                  <div className="text-[9px] font-normal opacity-70">
                    {day?.slice(5).replace("-", "/")}
                  </div>
                  <div
                    className="pointer-events-none absolute right-0.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 sm:right-1 sm:gap-1"
                    title={`${counts.rough} rough · ${counts.trim} trim`}
                  >
                    <span className="rounded px-1 py-0.5 text-[9px] font-bold leading-none tabular-nums text-gray-900 bg-[#b3ceff] sm:text-[10px]">
                      {counts.rough}
                    </span>
                    <span className="rounded px-1 py-0.5 text-[9px] font-bold leading-none tabular-nums text-gray-900 bg-[#b3ecd0] sm:text-[10px]">
                      {counts.trim}
                    </span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {displayedCrews.map((crew) => {
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
                      className={`border-r-2 border-black p-0 align-top last:border-r-0 dark:border-gray-200 ${rowH} ${boardKindColor(job?.work_kind, job?.site_address || job?.title, crew.name)} ${
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
                        crewLead={crew.name}
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

  const mobileDayBoard = (
    <div className="space-y-3 md:hidden">
      {days.map((day, i) => {
        const dayJobs = displayedCrews.flatMap((crew) => {
          const list =
            jobsByCrewDay.get(`${crew.name.toLowerCase()}|${day}`) ?? [];
          return list.map((job) => ({ crew: crew.name, job }));
        });
        return (
          <section
            key={day}
            className="overflow-hidden rounded-xl border border-border-default bg-bg-raised"
          >
            <header className="border-b border-border-subtle bg-bg-form/60 px-3 py-2.5">
              <h3 className="font-display text-sm font-bold tracking-wide text-text-primary">
                {DAY_LABELS[i]}{" "}
                <span className="font-normal text-text-muted">
                  {formatBoardDate(day, locale)}
                </span>
              </h3>
            </header>
            {dayJobs.length === 0 ? (
              <p className="px-3 py-4 text-sm text-text-muted">
                {t(locale, "noJobsDay")}
              </p>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {dayJobs.map(({ crew, job }) => (
                  <li
                    key={job.id}
                    className={`px-3 py-2.5 ${boardKindColor(job.work_kind, job.site_address || job.title, crew)}`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                      {crew}
                      {job.assigned_to ? ` · ${job.assigned_to}` : ""}
                      {job.work_kind
                        ? ` · ${job.work_kind.charAt(0).toUpperCase()}${job.work_kind.slice(1)}`
                        : ""}
                    </p>
                    <p className="mt-0.5 text-sm font-bold leading-snug text-gray-900 dark:text-white">
                      {formatBoardCellDisplay(job)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => goWeek(-1)}
          className="min-h-9 rounded border border-border-default px-2.5 py-1.5 text-sm hover:bg-bg-raised"
        >
          {t(locale, "prevWeek")}
        </button>
        <h2 className="min-w-[5.5rem] text-center font-display text-sm font-bold tracking-wide sm:min-w-[6.5rem] sm:text-lg">
          {weekLabel}
        </h2>
        <button
          type="button"
          onClick={() => goWeek(1)}
          className="min-h-9 rounded border border-border-default px-2.5 py-1.5 text-sm hover:bg-bg-raised"
        >
          {t(locale, "nextWeek")}
        </button>
        <button
          type="button"
          onClick={() => router.push("?")}
          className="min-h-9 px-1 text-sm text-text-muted hover:text-text-primary"
        >
          {t(locale, "thisWeek")}
        </button>
        <div
          className="ml-1 flex flex-wrap items-center gap-1.5"
          aria-label={`Week totals: ${weekKindTotals.rough} rough, ${weekKindTotals.trim} trim, ${weekKindTotals.total} total`}
        >
          <span
            className="inline-flex min-h-8 items-center gap-1 rounded-md bg-[#b3ceff] px-2 py-1 text-[11px] font-bold tabular-nums text-gray-900"
            title="Rough jobs this week"
          >
            <span className="opacity-70">R</span>
            {weekKindTotals.rough}
          </span>
          <span
            className="inline-flex min-h-8 items-center gap-1 rounded-md bg-[#b3ecd0] px-2 py-1 text-[11px] font-bold tabular-nums text-gray-900"
            title="Trim jobs this week"
          >
            <span className="opacity-70">T</span>
            {weekKindTotals.trim}
          </span>
          <span
            className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border-default bg-bg-raised px-2 py-1 text-[11px] font-bold tabular-nums text-text-primary"
            title="All jobs this week"
          >
            <span className="opacity-70">Total</span>
            {weekKindTotals.total}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {canWrite && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border-default bg-bg-raised p-1">
              {days.map((day, i) => {
                const on = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`min-h-8 rounded-md px-2 py-1 text-[11px] font-bold tracking-wide ${
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
              onClick={() => openDispatchDialog()}
              className="min-h-9 rounded-lg bg-lime-400 px-3 py-1.5 text-sm font-semibold text-black hover:bg-lime-300 disabled:opacity-60"
            >
              Dispatch Crews
            </button>
            <SyncSheetsButton source="all" weeks="current" label="Sync board" />
          </div>
        )}
        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          className="hidden min-h-9 rounded-lg border border-border-default bg-bg-raised px-3 py-1.5 text-sm font-medium text-text-primary hover:border-amber-500/40 hover:text-amber-700 sm:inline-flex dark:hover:text-amber-400"
        >
          {fullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>
    </div>
  );

  const boardBody = (
    <div className="w-full space-y-3">
      {toolbar}
      {enableFilters ? (
        <BoardFilters
          teams={filterTeams}
          jobs={localJobs}
          days={days}
          filters={filters}
          onChange={setFilters}
        />
      ) : null}
      {enableFilters && filtersActive ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-400/15 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          <span>
            Board is filtered
            {filters.team ? (
              <>
                {" "}
                to <strong>{filters.team}</strong>
              </>
            ) : null}
            . Clear filters to see every supervisor’s jobs.
          </span>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_BOARD_FILTERS)}
            className="rounded-md bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950 hover:bg-amber-300"
          >
            Clear filters
          </button>
        </div>
      ) : null}
      {!canWrite ? (
        <>
          {mobileDayBoard}
          <div className="hidden md:block">{boardTable}</div>
        </>
      ) : (
        <>
          <p className="text-xs text-text-muted md:hidden">
            {t(locale, "swipeBoardHint")}
          </p>
          {boardTable}
        </>
      )}
      {displayedCrews.length === 0 && (
        <p className="rounded-lg border border-border-default bg-bg-raised px-4 py-6 text-center text-sm text-text-muted">
          {filtersActive
            ? "No jobs match these filters."
            : canWrite
              ? (
                <>
                  No board crews configured. Run migration{" "}
                  <code className="text-xs">005_app_roles_board.sql</code> in
                  Supabase.
                </>
              )
              : t(locale, "emptyWeekViewer")}
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
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border-default bg-bg-raised p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="dispatch-confirm-title"
              className="font-display text-lg font-bold text-text-primary"
            >
              Confirm dispatch
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Notify crews for{" "}
              <span className="font-semibold text-text-primary">
                {dispatchDayPhrase}
              </span>
              .
            </p>
            <p className="mt-2 text-sm text-text-muted">
              This will send{" "}
              <span className="font-medium text-text-secondary">
                {dispatchJobCount} job{dispatchJobCount === 1 ? "" : "s"}
              </span>{" "}
              from the selected supervisors.
            </p>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Supervisors
                </p>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    disabled={dispatching}
                    className="text-amber-700 hover:underline disabled:opacity-60 dark:text-amber-400"
                    onClick={() =>
                      setSelectedCrewLeads(localCrews.map((c) => c.name))
                    }
                  >
                    All
                  </button>
                  <button
                    type="button"
                    disabled={dispatching}
                    className="text-text-muted hover:underline disabled:opacity-60"
                    onClick={() => setSelectedCrewLeads([])}
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-border-default bg-bg-base p-2 sm:grid-cols-3">
                {localCrews.map((crew) => {
                  const on = selectedCrewLeads.includes(crew.name);
                  return (
                    <label
                      key={crew.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                        on
                          ? "bg-lime-400/20 text-text-primary"
                          : "text-text-muted hover:bg-bg-raised"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-lime-500"
                        checked={on}
                        disabled={dispatching}
                        onChange={() => toggleDispatchCrew(crew.name)}
                      />
                      <span className="truncate font-semibold uppercase tracking-wide">
                        {crew.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

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
                disabled={dispatching || selectedCrewLeads.length === 0}
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
