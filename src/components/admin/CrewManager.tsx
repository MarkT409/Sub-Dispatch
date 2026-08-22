"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SubTeam, SubWorker } from "@/lib/sub-teams-data";

type MemberDraft = { name: string; phone: string };

export function CrewManager({
  initialTeams,
  seedError,
}: {
  initialTeams: SubTeam[];
  seedError?: string | null;
}) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [newTeam, setNewTeam] = useState("");
  const [memberDrafts, setMemberDrafts] = useState<
    Record<string, MemberDraft>
  >({});
  const [busy, setBusy] = useState<string | null>(null);

  function draftFor(teamId: string): MemberDraft {
    return memberDrafts[teamId] ?? { name: "", phone: "" };
  }

  async function patchWorker(
    workerId: string,
    patch: {
      phone?: string | null;
      is_lead?: boolean;
      name?: string;
    },
  ) {
    const res = await fetch(`/api/admin/sub-workers/${workerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Could not update worker");
    }
    return data.worker as SubWorker;
  }

  function replaceWorker(teamId: string, worker: SubWorker) {
    setTeams((prev) =>
      prev.map((t) =>
        t.id !== teamId
          ? t
          : {
              ...t,
              workers: t.workers
                .map((w) => (w.id === worker.id ? worker : w))
                .sort(
                  (a, b) =>
                    Number(b.is_lead) - Number(a.is_lead) ||
                    a.sort_order - b.sort_order ||
                    a.name.localeCompare(b.name),
                ),
            },
      ),
    );
  }

  async function addTeam(event: FormEvent) {
    event.preventDefault();
    const name = newTeam.trim();
    if (!name) return;
    setBusy("team");
    try {
      const res = await fetch("/api/admin/sub-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not add team");
        return;
      }
      setTeams((prev) => [...prev, data.team as SubTeam]);
      setNewTeam("");
      toast.success(`Added ${name}`);
      router.refresh();
    } catch {
      toast.error("Could not add team");
    } finally {
      setBusy(null);
    }
  }

  async function removeTeam(team: SubTeam) {
    if (
      !confirm(
        `Delete team “${team.name}” and all of its workers? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(team.id);
    try {
      const res = await fetch(`/api/admin/sub-teams/${team.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not delete team");
        return;
      }
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      toast.success(`Removed ${team.name}`);
      router.refresh();
    } catch {
      toast.error("Could not delete team");
    } finally {
      setBusy(null);
    }
  }

  async function addWorker(team: SubTeam) {
    const draft = draftFor(team.id);
    const name = draft.name.trim();
    if (!name) return;
    const phone = draft.phone.trim();
    if (
      phone &&
      !confirm(
        `Confirm SMS consent for ${name}: they agreed to receive Crew Dispatch texts for sign-in and job alerts (message frequency varies; message & data rates may apply; STOP to opt out). Continue?`,
      )
    ) {
      return;
    }
    setBusy(`${team.id}:add`);
    try {
      const res = await fetch(`/api/admin/sub-teams/${team.id}/workers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not add worker");
        return;
      }
      const worker = data.worker as SubWorker;
      setTeams((prev) =>
        prev.map((t) =>
          t.id === team.id ? { ...t, workers: [...t.workers, worker] } : t,
        ),
      );
      setMemberDrafts((prev) => ({
        ...prev,
        [team.id]: { name: "", phone: "" },
      }));
      toast.success(`Added ${name} to ${team.name}`);
      router.refresh();
    } catch {
      toast.error("Could not add worker");
    } finally {
      setBusy(null);
    }
  }

  async function removeWorker(team: SubTeam, worker: SubWorker) {
    setBusy(worker.id);
    try {
      const res = await fetch(`/api/admin/sub-workers/${worker.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not remove worker");
        return;
      }
      setTeams((prev) =>
        prev.map((t) =>
          t.id === team.id
            ? { ...t, workers: t.workers.filter((w) => w.id !== worker.id) }
            : t,
        ),
      );
      toast.success(`Removed ${worker.name}`);
      router.refresh();
    } catch {
      toast.error("Could not remove worker");
    } finally {
      setBusy(null);
    }
  }

  async function savePhone(team: SubTeam, worker: SubWorker, phone: string) {
    const next = phone.trim();
    if ((worker.phone ?? "") === next) return;
    if (
      next &&
      !confirm(
        `Confirm SMS consent for ${worker.name}: they agreed to receive Crew Dispatch texts for sign-in and job alerts (message frequency varies; message & data rates may apply; STOP to opt out). Save number?`,
      )
    ) {
      return;
    }
    setBusy(`${worker.id}:phone`);
    try {
      const updated = await patchWorker(worker.id, { phone: next || null });
      replaceWorker(team.id, updated);
      toast.success(`Updated phone for ${worker.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save phone");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Crew</h1>
        <p className="mt-1 text-text-muted">
          Subcontractor teams for dispatch. Names with a phone number show in
          lime green. Names power assignee autocomplete and crew portal login.
        </p>
      </div>

      {seedError && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {seedError}
        </p>
      )}

      <form
        onSubmit={addTeam}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border-default bg-bg-raised p-4"
      >
        <div className="min-w-[12rem] flex-1">
          <label className="block text-sm text-text-muted">New team</label>
          <input
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            placeholder="e.g. Team name"
            className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy === "team" || !newTeam.trim()}
          className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-navy-950 disabled:opacity-70"
        >
          {busy === "team" ? "Adding…" : "Add team"}
        </button>
      </form>

      {teams.length === 0 ? (
        <p className="rounded-xl border border-border-default bg-bg-raised px-5 py-10 text-center text-text-muted">
          No teams yet. Add a team above, or run migration{" "}
          <code className="text-xs">006_sub_teams.sql</code> and refresh to seed
          from the worker map.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <section
              key={team.id}
              className="flex flex-col rounded-xl border border-border-default bg-bg-raised"
            >
              <header className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
                <h2 className="font-display text-lg font-bold tracking-tight">
                  {team.name}
                </h2>
                <button
                  type="button"
                  onClick={() => void removeTeam(team)}
                  disabled={busy === team.id}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                >
                  Delete team
                </button>
              </header>

              <ul className="flex-1 divide-y divide-border-subtle px-2 py-1">
                {team.workers.length === 0 ? (
                  <li className="px-2 py-4 text-center text-sm text-text-muted">
                    No workers yet
                  </li>
                ) : (
                  team.workers.map((worker) => {
                    const hasPhone = Boolean(worker.phone?.trim());
                    return (
                    <li
                      key={worker.id}
                      className={`flex items-start justify-between gap-2 px-2 py-2.5 text-sm ${
                        hasPhone
                          ? "rounded-lg bg-lime-400/15 ring-1 ring-inset ring-lime-400/40"
                          : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <span
                          className={`block truncate font-medium ${
                            hasPhone
                              ? "text-lime-700 dark:text-lime-300"
                              : "text-text-primary"
                          }`}
                        >
                          {worker.name}
                        </span>
                        <input
                          type="tel"
                          defaultValue={worker.phone ?? ""}
                          key={`${worker.id}:${worker.phone ?? ""}`}
                          placeholder="Phone"
                          disabled={busy === `${worker.id}:phone`}
                          onBlur={(e) =>
                            void savePhone(team, worker, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className={`w-full rounded-md border border-border-default bg-bg-input px-2 py-1 text-xs tabular-nums placeholder:text-text-muted ${
                            hasPhone
                              ? "text-lime-700 dark:text-lime-300"
                              : "text-text-secondary"
                          }`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeWorker(team, worker)}
                        disabled={busy === worker.id}
                        className="mt-0.5 shrink-0 text-xs text-text-muted hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
                        aria-label={`Remove ${worker.name}`}
                      >
                        −
                      </button>
                    </li>
                    );
                  })
                )}
              </ul>

              <div className="mt-auto space-y-2 border-t border-border-subtle p-3">
                <input
                  value={draftFor(team.id).name}
                  onChange={(e) =>
                    setMemberDrafts((prev) => ({
                      ...prev,
                      [team.id]: {
                        ...draftFor(team.id),
                        name: e.target.value,
                      },
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addWorker(team);
                    }
                  }}
                  placeholder="Add name…"
                  className="w-full rounded-lg border border-border-default bg-bg-input px-2.5 py-1.5 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={draftFor(team.id).phone}
                    onChange={(e) =>
                      setMemberDrafts((prev) => ({
                        ...prev,
                        [team.id]: {
                          ...draftFor(team.id),
                          phone: e.target.value,
                        },
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void addWorker(team);
                      }
                    }}
                    placeholder="Phone (optional)"
                    className="min-w-0 flex-1 rounded-lg border border-border-default bg-bg-input px-2.5 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void addWorker(team)}
                    disabled={
                      busy === `${team.id}:add` ||
                      !draftFor(team.id).name.trim()
                    }
                    className="rounded-lg border border-border-default px-2.5 py-1.5 text-sm font-medium hover:border-amber-500/40 hover:text-amber-700 disabled:opacity-50 dark:hover:text-amber-400"
                  >
                    +
                  </button>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
