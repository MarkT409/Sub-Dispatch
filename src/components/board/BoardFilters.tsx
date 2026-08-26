"use client";

import { useMemo } from "react";
import type { BoardJob } from "@/lib/board";
import {
  assigneeIsTeamName,
  assigneeMatchesPerson,
} from "@/lib/assignee-match";
import { resolveInvoiceTab } from "@/lib/sub-teams";
import { formatBoardCellDisplay } from "@/lib/board-typing";
import { normalizeContactName } from "@/lib/crew-lead-contacts";

export type BoardFilterTeam = {
  name: string;
  members: string[];
};

export type BoardFilterState = {
  query: string;
  /** Sub-team name from Crew page (not board supervisor row). */
  team: string;
  person: string;
  day: string;
  kind: string;
};

export const EMPTY_BOARD_FILTERS: BoardFilterState = {
  query: "",
  team: "",
  person: "",
  day: "",
  kind: "",
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export function jobMatchesBoardFilters(
  job: BoardJob,
  filters: BoardFilterState,
  teams: BoardFilterTeam[] = [],
): boolean {
  if (filters.team) {
    const team = teams.find(
      (t) => normalize(t.name) === normalize(filters.team),
    );
    const teamName = team?.name || filters.team;
    const members = team?.members ?? [teamName];
    const assigned = job.assigned_to;

    const onTeam =
      assigneeIsTeamName(assigned ?? "", teamName) ||
      members.some((m) => assigneeMatchesPerson(assigned, m)) ||
      (() => {
        const tab = resolveInvoiceTab(assigned);
        if (!tab) return false;
        return (
          normalizeContactName(tab) === normalizeContactName(teamName)
        );
      })();

    if (!onTeam) return false;
  }
  if (filters.person) {
    const person = normalize(filters.person);
    const assigned = normalize(job.assigned_to || "");
    if (!assigned || (!assigned.includes(person) && assigned !== person)) {
      return false;
    }
  }
  if (filters.day && job.work_date !== filters.day) return false;
  if (filters.kind) {
    const kind = normalize(job.work_kind || "unknown");
    if (kind !== normalize(filters.kind)) return false;
  }
  if (filters.query.trim()) {
    const q = normalize(filters.query);
    const hay = normalize(
      [
        job.site_address,
        job.title,
        job.assigned_to,
        job.crew_lead,
        job.work_kind,
        job.notes,
        formatBoardCellDisplay(job),
      ]
        .filter(Boolean)
        .join(" "),
    );
    if (!hay.includes(q)) return false;
  }
  return true;
}

function formatDayOption(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function BoardFilters({
  teams,
  jobs,
  days,
  filters,
  onChange,
}: {
  teams: BoardFilterTeam[];
  jobs: BoardJob[];
  days: string[];
  filters: BoardFilterState;
  onChange: (next: BoardFilterState) => void;
}) {
  const selectedTeam = useMemo(
    () =>
      teams.find((t) => normalize(t.name) === normalize(filters.team)) ?? null,
    [teams, filters.team],
  );

  const people = useMemo(() => {
    if (selectedTeam) {
      return [...new Set(selectedTeam.members.map((m) => m.trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
    }
    const set = new Set<string>();
    for (const j of jobs) {
      const name = j.assigned_to?.trim();
      if (name) set.add(name);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [jobs, selectedTeam]);

  const kinds = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      set.add((j.work_kind || "unknown").toLowerCase());
    }
    const order = ["rough", "trim", "unknown", "service"];
    return [...set].sort(
      (a, b) =>
        (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) -
        (order.indexOf(b) === -1 ? 99 : order.indexOf(b)),
    );
  }, [jobs]);

  const teamOptions = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );

  const activeCount = [
    filters.query,
    filters.team,
    filters.person,
    filters.day,
    filters.kind,
  ].filter(Boolean).length;

  const matchCount = useMemo(
    () => jobs.filter((j) => jobMatchesBoardFilters(j, filters, teams)).length,
    [jobs, filters, teams],
  );

  function patch(partial: Partial<BoardFilterState>) {
    const next = { ...filters, ...partial };
    // Drop person if it isn't on the newly selected team
    if (partial.team !== undefined && next.person) {
      const team = teams.find(
        (t) => normalize(t.name) === normalize(next.team),
      );
      if (
        team &&
        !team.members.some(
          (m) => normalize(m) === normalize(next.person),
        )
      ) {
        next.person = "";
      }
    }
    onChange(next);
  }

  const selectClass =
    "min-h-9 rounded-lg border border-border-default bg-bg-raised px-2.5 text-sm text-text-primary";

  return (
    <div className="space-y-2 rounded-xl border border-border-default bg-bg-raised/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">Search jobs</span>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => patch({ query: e.target.value })}
            placeholder="Search address, name…"
            className="min-h-9 w-full rounded-lg border border-border-default bg-bg-base px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted"
          />
        </label>

        <select
          aria-label="Filter by sub team"
          value={filters.team}
          onChange={(e) => patch({ team: e.target.value })}
          className={selectClass}
        >
          <option value="">All sub teams</option>
          {teamOptions.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by person"
          value={filters.person}
          onChange={(e) => patch({ person: e.target.value })}
          className={selectClass}
        >
          <option value="">All people</option>
          {people.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by date"
          value={filters.day}
          onChange={(e) => patch({ day: e.target.value })}
          className={selectClass}
        >
          <option value="">All days</option>
          {days.map((day) => (
            <option key={day} value={day}>
              {formatDayOption(day)}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by job type"
          value={filters.kind}
          onChange={(e) => patch({ kind: e.target.value })}
          className={selectClass}
        >
          <option value="">All types</option>
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {kind.charAt(0).toUpperCase() + kind.slice(1)}
            </option>
          ))}
        </select>

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={() => onChange(EMPTY_BOARD_FILTERS)}
            className="min-h-9 rounded-lg px-2.5 text-sm text-text-muted hover:text-text-primary"
          >
            Clear
          </button>
        ) : null}
      </div>

      {activeCount > 0 ? (
        <p className="text-xs text-text-muted">
          Showing {matchCount} of {jobs.length} job
          {jobs.length === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}
