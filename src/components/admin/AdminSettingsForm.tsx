"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { EnableNotificationsButton } from "@/components/admin/EnableNotificationsButton";
import { ThemeToggle } from "@/components/ThemeToggle";

type Profile = {
  email: string;
  name: string | null;
  phone: string | null;
  role: string | null;
  board_write?: boolean;
};

export function AdminSettingsForm({ initial }: { initial: Profile }) {
  const [name, setName] = useState(initial.name ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not save");
        return;
      }
      setName(data.profile?.name ?? name);
      setPhone(data.profile?.phone ?? phone);
      toast.success("Settings saved");
    } catch {
      toast.error("Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <section className="rounded-xl border border-border-default bg-bg-raised p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Profile
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Your contact details. Phone is used for admin text-code sign-in.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="text-text-muted">Email</span>
            <input
              value={initial.email}
              disabled
              className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-form px-3 py-2 text-sm text-text-muted"
            />
            <span className="mt-1 block text-xs text-text-muted">
              Managed by Google sign-in / Users allowlist.
            </span>
          </label>

          <label className="block text-sm">
            <span className="text-text-muted">Display name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm"
              placeholder="Your name"
            />
          </label>

          <label className="block text-sm">
            <span className="text-text-muted">Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm tabular-nums"
              placeholder="(210) 555-0100"
            />
            <span className="mt-1 block text-xs text-text-muted">
              Optional until you want phone sign-in. We only text login codes.
            </span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-navy-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border-default bg-bg-raised p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Notifications
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Browser alerts for new board jobs (this device).
        </p>
        <div className="mt-4">
          <EnableNotificationsButton />
        </div>
      </section>

      <section className="rounded-xl border border-border-default bg-bg-raised p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Appearance
        </h2>
        <p className="mt-1 text-sm text-text-muted">Light or dark theme.</p>
        <div className="mt-4">
          <ThemeToggle />
        </div>
      </section>

      {initial.role && (
        <p className="text-center text-xs text-text-muted">
          Role: {initial.role}
          {initial.board_write || initial.role === "super_admin"
            ? " · board write"
            : " · view only"}
        </p>
      )}
    </div>
  );
}
