"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EnableCrewNotificationsButton } from "@/components/crew/EnableCrewNotificationsButton";
import type { CrewLocale } from "@/lib/i18n/crew-t";
import { isCrewLocale } from "@/lib/i18n/crew-messages";
import { t } from "@/lib/i18n/crew-t";

type Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  locale?: CrewLocale | null;
  push_notifications_enabled?: boolean;
};

export function CrewSettingsForm({ initial }: { initial: Profile }) {
  const router = useRouter();
  const [email, setEmail] = useState(initial.email ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [locale, setLocale] = useState<CrewLocale>(
    isCrewLocale(initial.locale) ? initial.locale : "en",
  );
  const [pushEnabled, setPushEnabled] = useState(
    initial.push_notifications_enabled ?? true,
  );
  const [busy, setBusy] = useState(false);
  const [localeBusy, setLocaleBusy] = useState(false);

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
        toast.error(data.error || t(locale, "couldNotSave"));
        return;
      }
      setEmail(data.profile?.email ?? email);
      setPhone(data.profile?.phone ?? phone);
      toast.success(t(locale, "profileSaved"));
    } catch {
      toast.error(t(locale, "couldNotSave"));
    } finally {
      setBusy(false);
    }
  }

  async function saveLocale(next: CrewLocale) {
    if (next === locale) return;
    const prev = locale;
    setLocale(next);
    setLocaleBusy(true);
    try {
      const res = await fetch("/api/crew/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLocale(prev);
        toast.error(data.error || t(prev, "couldNotSave"));
        return;
      }
      router.refresh();
    } catch {
      setLocale(prev);
      toast.error(t(prev, "couldNotSave"));
    } finally {
      setLocaleBusy(false);
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
        toast.error(data.error || t(locale, "couldNotSave"));
        return;
      }
      toast.success(
        next ? t(locale, "alertsOnToast") : t(locale, "alertsOffToast"),
      );
    } catch {
      setPushEnabled(!next);
      toast.error(t(locale, "couldNotSave"));
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <section className="rounded-xl border border-border-default bg-bg-raised p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold tracking-tight">
          {t(locale, "languageTitle")}
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {t(locale, "languageHint")}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={localeBusy}
            onClick={() => void saveLocale("en")}
            className={`min-h-11 rounded-lg border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
              locale === "en"
                ? "border-lime-500 bg-lime-400/20 text-text-primary"
                : "border-border-default text-text-secondary hover:border-amber-500/40"
            }`}
          >
            {t(locale, "languageEnglish")}
          </button>
          <button
            type="button"
            disabled={localeBusy}
            onClick={() => void saveLocale("es")}
            className={`min-h-11 rounded-lg border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
              locale === "es"
                ? "border-lime-500 bg-lime-400/20 text-text-primary"
                : "border-border-default text-text-secondary hover:border-amber-500/40"
            }`}
          >
            {t(locale, "languageSpanish")}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border-default bg-bg-raised p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold tracking-tight">
          {t(locale, "contactTitle")}
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {t(locale, "contactHint")}
        </p>

        <form onSubmit={saveProfile} className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="text-text-muted">{t(locale, "name")}</span>
            <input
              value={initial.name}
              disabled
              className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-form px-3 py-2 text-sm text-text-muted"
            />
            <span className="mt-1 block text-xs text-text-muted">
              {t(locale, "nameLockedHint")}
            </span>
          </label>

          <label className="block text-sm">
            <span className="text-text-muted">{t(locale, "phone")}</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm tabular-nums"
              placeholder="(210) 555-0100"
            />
            <span className="mt-1 block text-xs text-text-muted">
              {t(locale, "phoneHint")}
            </span>
          </label>

          <label className="block text-sm">
            <span className="text-text-muted">{t(locale, "email")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm"
              placeholder="you@email.com"
            />
            <span className="mt-1 block text-xs text-text-muted">
              {t(locale, "emailHint")}
            </span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-lime-300 disabled:opacity-50"
          >
            {busy ? t(locale, "saving") : t(locale, "saveContact")}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border-default bg-bg-raised p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold tracking-tight">
          {t(locale, "alertsTitle")}
        </h2>
        <p className="mt-1 text-sm text-text-muted">{t(locale, "alertsHint")}</p>

        <label className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border-subtle px-3 py-3 text-sm">
          <span>{t(locale, "alertsToggle")}</span>
          <input
            type="checkbox"
            checked={pushEnabled}
            onChange={(e) => void togglePush(e.target.checked)}
            className="h-4 w-4"
          />
        </label>

        <div className="mt-4">
          <EnableCrewNotificationsButton locale={locale} />
        </div>
      </section>
    </div>
  );
}
