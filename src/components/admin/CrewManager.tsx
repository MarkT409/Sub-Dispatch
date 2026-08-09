"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/admin-format";
import type { CrewMember } from "@/lib/admin-types";

export function CrewManager({ initialCrew }: { initialCrew: CrewMember[] }) {
  const router = useRouter();
  const [crew, setCrew] = useState(initialCrew);
  const [saving, setSaving] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          default_rate: formData.get("default_rate"),
          notes: formData.get("notes"),
          active: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error ?? "Could not add crew member");
        return;
      }
      setCrew((prev) => [...prev, result.member].sort((a, b) => a.name.localeCompare(b.name)));
      event.currentTarget.reset();
      toast.success("Crew member added");
      router.refresh();
    } catch {
      toast.error("Could not add crew member");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: CrewMember) {
    const response = await fetch(`/api/admin/crew/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !member.active }),
    });
    if (!response.ok) {
      toast.error("Could not update");
      return;
    }
    const result = await response.json();
    setCrew((prev) => prev.map((c) => (c.id === member.id ? result.member : c)));
    toast.success(result.member.active ? "Marked active" : "Marked inactive");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this crew member?")) return;
    const response = await fetch(`/api/admin/crew/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete");
      return;
    }
    setCrew((prev) => prev.filter((c) => c.id !== id));
    toast.success("Removed");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Crew</h1>
        <p className="mt-1 text-text-muted">People you pay for roughs, trims, and installs.</p>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid gap-4 rounded-xl border border-border-default bg-bg-raised p-6 md:grid-cols-2"
      >
        <div>
          <label className="block text-sm text-text-muted">Name</label>
          <input name="name" required className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm text-text-muted">Email</label>
          <input name="email" type="email" className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm text-text-muted">Phone</label>
          <input name="phone" className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm text-text-muted">Default rate</label>
          <input name="default_rate" type="number" step="0.01" className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-text-muted">Notes</label>
          <textarea name="notes" rows={2} className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={saving} className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-navy-950 disabled:opacity-70 md:w-fit">
          {saving ? "Saving…" : "Add crew member"}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-border-default bg-bg-raised">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-bg-form text-text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Rate</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {crew.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-text-muted">
                    No crew members yet.
                  </td>
                </tr>
              ) : (
                crew.map((member) => (
                  <tr key={member.id} className="border-t border-border-subtle">
                    <td className="px-5 py-3 font-medium">{member.name}</td>
                    <td className="px-5 py-3 text-text-secondary">
                      <div>{member.email ?? "—"}</div>
                      <div className="text-xs text-text-muted">{member.phone ?? ""}</div>
                    </td>
                    <td className="px-5 py-3">{formatCurrency(member.default_rate)}</td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(member)}
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          member.active
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            : "bg-bg-form text-text-muted"
                        }`}
                      >
                        {member.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button type="button" onClick={() => handleDelete(member.id)} className="text-xs text-red-600 dark:text-red-400">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
