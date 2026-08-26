"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BOARD_WRITE_STAFF_NAMES } from "@/lib/supervisors";

export type StaffUser = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: "super_admin" | "admin";
  board_write: boolean;
  active: boolean;
  board_crew_id?: string | null;
};

type SupervisorDraft = {
  name: string;
  email: string;
  phone: string;
  role: StaffUser["role"];
  board_write: boolean;
  userId: string | null;
};

type EditDraft = {
  name: string;
  email: string;
  phone: string;
  role: StaffUser["role"];
  board_write: boolean;
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

function userMatchesSupervisor(user: StaffUser, supervisor: { id: string; name: string }) {
  if (user.board_crew_id && user.board_crew_id === supervisor.id) return true;
  const key = norm(supervisor.name);
  const name = norm(user.name || "");
  if (!name) return false;
  if (name === key) return true;
  if (name.startsWith(`${key} `)) return true;
  return name.split(/\s+/)[0] === key;
}

function buildSupervisorDraft(
  supervisor: { id: string; name: string },
  users: StaffUser[],
): SupervisorDraft {
  const linked = users.find((u) => userMatchesSupervisor(u, supervisor));
  if (linked) {
    return {
      name: linked.name || supervisor.name,
      email: linked.email || "",
      phone: linked.phone || "",
      role: linked.role,
      board_write: linked.role === "super_admin" || linked.board_write,
      userId: linked.id,
    };
  }
  return {
    name: supervisor.name,
    email: "",
    phone: "",
    role: "admin",
    board_write: true,
    userId: null,
  };
}

export function StaffAccessManager({
  initialUsers,
  boardSupervisors,
  readOnly = false,
}: {
  initialUsers: StaffUser[];
  boardSupervisors: { id: string; name: string }[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffUser["role"]>("admin");
  const [boardWrite, setBoardWrite] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  const locked = readOnly || busy;

  const [supervisorDrafts, setSupervisorDrafts] = useState<
    Record<string, SupervisorDraft>
  >(() => {
    const map: Record<string, SupervisorDraft> = {};
    for (const s of boardSupervisors) {
      map[s.id] = buildSupervisorDraft(s, initialUsers);
    }
    return map;
  });

  const linkedUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of boardSupervisors) {
      const match = users.find((u) => userMatchesSupervisor(u, s));
      if (match) ids.add(match.id);
    }
    return ids;
  }, [boardSupervisors, users]);

  const supers = users
    .filter((u) => u.role === "super_admin")
    .sort((a, b) =>
      (a.name || a.email || "").localeCompare(b.name || b.email || ""),
    );

  const otherAdmins = users
    .filter((u) => u.role === "admin" && !linkedUserIds.has(u.id))
    .sort((a, b) =>
      (a.name || a.email || "").localeCompare(b.name || b.email || ""),
    );

  function upsertLocalUser(user: StaffUser) {
    setUsers((prev) => {
      const without = prev.filter((u) => {
        if (u.id === user.id) return false;
        if (user.email && u.email && u.email === user.email) return false;
        return true;
      });
      return [...without, user];
    });
  }

  function startEdit(user: StaffUser) {
    setEditingId(user.id);
    setEditDraft({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      role: user.role,
      board_write: user.board_write || user.role === "super_admin",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function patchUser(
    id: string,
    patch: Record<string, unknown>,
  ) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      upsertLocalUser(data.user);
      toast.success("Updated");
      router.refresh();
      return data.user as StaffUser;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createUser(opts: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      upsertLocalUser(data.user);
      toast.success(`Saved ${data.user.name || data.user.email || "user"}`);
      router.refresh();
      return data.user as StaffUser;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editDraft) return;
    const email = editDraft.email.trim();
    if (email && !email.includes("@")) {
      toast.error("Enter a valid email or leave it blank");
      return;
    }
    const updated = await patchUser(id, {
      name: editDraft.name.trim() || null,
      email: email || null,
      phone: editDraft.phone.trim() || null,
      role: editDraft.role,
      board_write:
        editDraft.role === "super_admin" ? true : editDraft.board_write,
    });
    if (updated) cancelEdit();
  }

  async function saveSupervisor(crewId: string, boardName: string) {
    const draft = supervisorDrafts[crewId];
    if (!draft) return;
    const email = draft.email.trim();
    if (email && !email.includes("@")) {
      toast.error(`Enter a valid email for ${boardName}, or leave it blank`);
      return;
    }

    const payload = {
      name: draft.name.trim() || boardName,
      email: email || null,
      phone: draft.phone.trim() || null,
      role: draft.role,
      board_write: draft.role === "super_admin" ? true : draft.board_write,
      board_crew_id: crewId,
    };

    let user: StaffUser | null = null;
    if (draft.userId) {
      user = await patchUser(draft.userId, payload);
    } else {
      user = await createUser({ ...payload, active: true });
    }

    if (user) {
      setSupervisorDrafts((prev) => ({
        ...prev,
        [crewId]: {
          name: user!.name || boardName,
          email: user!.email || "",
          phone: user!.phone || "",
          role: user!.role,
          board_write: user!.role === "super_admin" || user!.board_write,
          userId: user!.id,
        },
      }));
    }
  }

  async function addStaff(e: FormEvent) {
    e.preventDefault();
    const created = await createUser({
      email,
      name: name.trim() || email,
      phone: phone.trim() || null,
      role,
      board_write: role === "super_admin" ? true : boardWrite,
    });
    if (created) {
      setEmail("");
      setName("");
      setPhone("");
      setRole("admin");
      setBoardWrite(true);
    }
  }

  function updateSupervisorDraft(
    crewId: string,
    patch: Partial<SupervisorDraft>,
  ) {
    setSupervisorDrafts((prev) => ({
      ...prev,
      [crewId]: { ...prev[crewId], ...patch },
    }));
  }

  function renderUserRow(user: StaffUser) {
    const isEditing = editingId === user.id && editDraft;
    const canToggleWrite = user.role !== "super_admin";

    if (isEditing && editDraft) {
      return (
        <tr
          key={user.id}
          className="border-b border-border-subtle bg-amber-500/5"
        >
          <td className="px-3 py-2.5">
            <div className="flex flex-col gap-1.5">
              <input
                value={editDraft.name}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, name: e.target.value })
                }
                placeholder="Name"
                className="w-full rounded border border-border-default bg-bg-input px-2 py-1 text-sm"
              />
              <input
                type="email"
                value={editDraft.email}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, email: e.target.value })
                }
                placeholder="Email"
                className="w-full rounded border border-border-default bg-bg-input px-2 py-1 text-xs"
              />
              <input
                type="tel"
                value={editDraft.phone}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, phone: e.target.value })
                }
                placeholder="Phone"
                className="w-full rounded border border-border-default bg-bg-input px-2 py-1 text-xs tabular-nums"
              />
            </div>
          </td>
          <td className="px-3 py-2.5">
            <select
              disabled={busy}
              value={editDraft.role}
              onChange={(e) =>
                setEditDraft({
                  ...editDraft,
                  role: e.target.value as StaffUser["role"],
                  board_write:
                    e.target.value === "super_admin"
                      ? true
                      : editDraft.board_write,
                })
              }
              className="rounded border border-border-default bg-bg-input px-2 py-1"
            >
              <option value="admin">admin</option>
              <option value="super_admin">super_admin</option>
            </select>
          </td>
          <td className="px-3 py-2.5">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                disabled={busy || editDraft.role === "super_admin"}
                checked={
                  editDraft.role === "super_admin" || editDraft.board_write
                }
                onChange={(e) =>
                  setEditDraft({
                    ...editDraft,
                    board_write: e.target.checked,
                  })
                }
              />
              <span className="text-xs text-text-muted">
                {editDraft.role === "super_admin" || editDraft.board_write
                  ? "Read + write"
                  : "Read only"}
              </span>
            </label>
          </td>
          <td className="px-3 py-2.5">
            <div className="flex flex-col items-start gap-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveEdit(user.id)}
                className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
              >
                Save
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={cancelEdit}
                className="text-xs text-text-muted hover:underline"
              >
                Cancel
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr key={user.id} className="border-b border-border-subtle last:border-0">
        <td className="px-3 py-2.5">
          <div className="font-medium text-text-primary">
            {user.name || "—"}
          </div>
          <div className="text-xs text-text-muted">
            {user.email || "No email yet"}
          </div>
          {user.phone ? (
            <div className="text-xs tabular-nums text-text-muted">
              {user.phone}
            </div>
          ) : null}
        </td>
        <td className="px-3 py-2.5">
          {readOnly ? (
            <span className="text-xs text-text-secondary">{user.role}</span>
          ) : (
            <select
              disabled={locked || editingId !== null}
              value={user.role}
              onChange={(e) => {
                const nextRole = e.target.value as StaffUser["role"];
                void patchUser(user.id, {
                  role: nextRole,
                  board_write:
                    nextRole === "super_admin" ? true : user.board_write,
                });
              }}
              className="rounded border border-border-default bg-bg-input px-2 py-1 text-xs"
            >
              <option value="admin">admin</option>
              <option value="super_admin">super_admin</option>
            </select>
          )}
        </td>
        <td className="px-3 py-2.5">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              disabled={
                readOnly || locked || !canToggleWrite || editingId !== null
              }
              checked={user.role === "super_admin" || user.board_write}
              onChange={(e) =>
                void patchUser(user.id, { board_write: e.target.checked })
              }
            />
            <span className="text-xs text-text-muted">
              {user.role === "super_admin" || user.board_write
                ? "Read + write"
                : "Read only"}
            </span>
          </label>
        </td>
        <td className="px-3 py-2.5">
          {readOnly ? (
            <span className="text-xs text-text-muted">
              {user.active ? "Active" : "Inactive"}
            </span>
          ) : (
            <div className="flex flex-col items-start gap-1">
              <button
                type="button"
                disabled={locked || editingId !== null}
                onClick={() => startEdit(user)}
                className="text-xs font-medium text-amber-700 hover:underline disabled:opacity-40 dark:text-amber-400"
              >
                Edit
              </button>
              {user.active ? (
                <button
                  type="button"
                  disabled={locked || editingId !== null}
                  onClick={() => void patchUser(user.id, { active: false })}
                  className="text-xs text-red-600 hover:underline disabled:opacity-40"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  disabled={locked || editingId !== null}
                  onClick={() => void patchUser(user.id, { active: true })}
                  className="text-xs text-amber-700 hover:underline disabled:opacity-40 dark:text-amber-400"
                >
                  Reactivate
                </button>
              )}
            </div>
          )}
        </td>
      </tr>
    );
  }

  function renderSupervisorRow(s: { id: string; name: string }) {
    const draft = supervisorDrafts[s.id] ?? buildSupervisorDraft(s, users);

    if (readOnly) {
      return (
        <tr key={s.id} className="border-b border-border-subtle last:border-0">
          <td className="px-3 py-2.5">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Board: {s.name}
            </div>
            <div className="font-medium text-text-primary">
              {draft.name || s.name}
            </div>
            <div className="text-xs text-text-muted">
              {draft.email || "No email yet"}
            </div>
            {draft.phone ? (
              <div className="text-xs tabular-nums text-text-muted">
                {draft.phone}
              </div>
            ) : null}
          </td>
          <td className="px-3 py-2.5 align-top">
            <span className="text-xs text-text-secondary">{draft.role}</span>
          </td>
          <td className="px-3 py-2.5 align-top">
            <span className="text-xs text-text-muted">
              {draft.role === "super_admin" || draft.board_write
                ? "Read + write"
                : "Read only"}
            </span>
          </td>
          <td className="px-3 py-2.5 align-top">
            <span className="text-xs text-text-muted">
              {draft.userId ? "Linked" : "Not linked"}
            </span>
          </td>
        </tr>
      );
    }

    return (
      <tr key={s.id} className="border-b border-border-subtle last:border-0">
        <td className="px-3 py-2.5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Board: {s.name}
          </div>
          <div className="flex flex-col gap-1.5">
            <input
              value={draft.name}
              onChange={(e) =>
                updateSupervisorDraft(s.id, { name: e.target.value })
              }
              placeholder="Display name"
              className="w-full max-w-[16rem] rounded border border-border-default bg-bg-input px-2 py-1 text-sm"
            />
            <input
              type="email"
              value={draft.email}
              onChange={(e) =>
                updateSupervisorDraft(s.id, { email: e.target.value })
              }
              placeholder="Email (optional)"
              className="w-full max-w-[16rem] rounded border border-border-default bg-bg-input px-2 py-1 text-xs"
            />
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) =>
                updateSupervisorDraft(s.id, { phone: e.target.value })
              }
              placeholder="Phone"
              className="w-full max-w-48 rounded border border-border-default bg-bg-input px-2 py-1 text-xs tabular-nums"
            />
          </div>
        </td>
        <td className="px-3 py-2.5 align-top">
          <select
            disabled={locked}
            value={draft.role}
            onChange={(e) =>
              updateSupervisorDraft(s.id, {
                role: e.target.value as StaffUser["role"],
                board_write:
                  e.target.value === "super_admin" ? true : draft.board_write,
              })
            }
            className="rounded border border-border-default bg-bg-input px-2 py-1"
          >
            <option value="admin">admin</option>
            <option value="super_admin">super_admin</option>
          </select>
        </td>
        <td className="px-3 py-2.5 align-top">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              disabled={locked || draft.role === "super_admin"}
              checked={draft.role === "super_admin" || draft.board_write}
              onChange={(e) =>
                updateSupervisorDraft(s.id, { board_write: e.target.checked })
              }
            />
            <span className="text-xs text-text-muted">
              {draft.role === "super_admin" || draft.board_write
                ? "Read + write"
                : "Read only"}
            </span>
          </label>
        </td>
        <td className="px-3 py-2.5 align-top">
          <div className="flex flex-col items-start gap-1">
            <button
              type="button"
              disabled={locked}
              onClick={() => void saveSupervisor(s.id, s.name)}
              className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
            >
              Save
            </button>
            {draft.userId ? (
              <button
                type="button"
                disabled={locked}
                onClick={() =>
                  void patchUser(draft.userId!, { active: false }).then(
                    (user) => {
                      if (user) {
                        updateSupervisorDraft(s.id, {
                          ...buildSupervisorDraft(s, [
                            ...users.filter((u) => u.id !== user.id),
                            user,
                          ]),
                        });
                      }
                    },
                  )
                }
                className="text-xs text-red-600 hover:underline"
              >
                Deactivate
              </button>
            ) : null}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-border-default bg-bg-raised p-4 sm:p-5">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight">
          Supervisors &amp; access
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {readOnly
            ? "View-only. Ask a super admin to change roles or contact info."
            : `Edit supervisors and staff below. Use Role to promote anyone to super_admin. Email is optional on supervisors until you know it. ${BOARD_WRITE_STAFF_NAMES.join(" and ")} default to write when added.`}
        </p>
      </div>

      {!readOnly ? (
      <form
        onSubmit={addStaff}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border-subtle bg-bg-base/50 p-3"
      >
        <label className="block min-w-40 flex-1 text-sm">
          <span className="text-text-muted">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2"
            placeholder="Dustin"
          />
        </label>
        <label className="block min-w-56 flex-1 text-sm">
          <span className="text-text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2"
            placeholder="name@company.com"
          />
        </label>
        <label className="block min-w-40 flex-1 text-sm">
          <span className="text-text-muted">Phone</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 tabular-nums"
            placeholder="(210) 555-0100"
          />
        </label>
        <label className="block min-w-40 text-sm">
          <span className="text-text-muted">Role</span>
          <select
            value={role}
            onChange={(e) => {
              const next = e.target.value as StaffUser["role"];
              setRole(next);
              if (next === "super_admin") setBoardWrite(true);
            }}
            className="mt-1 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2"
          >
            <option value="admin">admin</option>
            <option value="super_admin">super_admin</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            disabled={role === "super_admin"}
            checked={role === "super_admin" || boardWrite}
            onChange={(e) => setBoardWrite(e.target.checked)}
          />
          Board write
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-navy-950 hover:bg-amber-400 disabled:opacity-50"
        >
          Add staff
        </button>
      </form>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border-subtle bg-bg-base text-text-muted">
            <tr>
              <th className="px-3 py-2.5 font-medium">Person</th>
              <th className="px-3 py-2.5 font-medium">Role</th>
              <th className="px-3 py-2.5 font-medium">Board</th>
              <th className="px-3 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {supers.map((user) => renderUserRow(user))}
            {boardSupervisors.map((s) => renderSupervisorRow(s))}
            {otherAdmins.map((user) => renderUserRow(user))}
            {supers.length === 0 &&
              boardSupervisors.length === 0 &&
              otherAdmins.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-text-muted"
                  >
                    No staff yet. Add someone above.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
