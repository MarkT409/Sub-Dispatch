"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { EnableCrewNotificationsButton } from "@/components/crew/EnableCrewNotificationsButton";

type Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  push_notifications_enabled?: boolean;
};

export function CrewSettingsForm({ initial }: { initial: Profile }) {
  const [email, setEmail] = useState(initial.email ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [pushEnabled, setPushEnabled] = useState(
    initial.push_notifications_enabled ?? true,
  );
  const [busy, setBusy] = useState(false);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/crew/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not save");
        return;
      }
      setEmail(data.profile?.email ?? email);
      setPhone(data.profile?.phone ?? phone);
      toast.success("Profile saved");
    } catch {
      toast.error("Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function togglePush(next: boolean) {
    setPushEnabled(next);
    try {
      const res = await fetch("/api/crew/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ push_notifications_enabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPushEnabled(!next);
        toast.error(data.error || "Could not update notifications");
        return;
      }
      toast.success(next ? "Job alerts on" : "Job alerts off");
    } catch {
      setPushEnabled(!next);
      toast.error("Could not update notifications");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <section className="rounded-xl border border-border-default bg-bg-raised p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Your contact info
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Keep this up to date so you can sign in and get job texts. You can add
          a phone or email anytime.
        </p>

        <form onSubmit={saveProfile} className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="text-text-muted">Name</span>
            <input
              value={initial.name}
              disabled
              className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-form px-3 py-2 text-sm text-text-muted"
            />
            <span className="mt-1 block text-xs text-text-muted">
              Ask a supervisor if your name needs to change.
            </span>
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
              Used for text-code sign-in. Must match the number you log in with.
            </span>
          </label>

          <label className="block text-sm">
            <span className="text-text-muted">Email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm"
              placeholder="you@email.com"
            />
            <span className="mt-1 block text-xs text-text-muted">
              Optional — for Google sign-in later or contact.
            </span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-lime-300 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save contact info"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border-default bg-bg-raised p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Job alerts
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Push notifications on this device when you get a new assignment.
        </p>

        <label className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border-subtle px-3 py-3 text-sm">
          <span>Allow job alert notifications</span>
          <input
            type="checkbox"
            checked={pushEnabled}
            onChange={(e) => void togglePush(e.target.checked)}
            className="h-4 w-4"
          />
        </label>

        <div className="mt-4">
          <EnableCrewNotificationsButton />
        </div>
      </section>
    </div>
  );
}
