"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";
import type { CrewLocale } from "@/lib/i18n/crew-t";
import { t } from "@/lib/i18n/crew-t";

export function LanguagePicker({ memberName }: { memberName?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<CrewLocale | null>(null);

  async function choose(locale: CrewLocale) {
    setBusy(locale);
    try {
      const res = await fetch("/api/crew/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || t("en", "couldNotSave"));
        return;
      }
      router.refresh();
    } catch {
      toast.error(t("en", "couldNotSave"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-base">
      <header className="border-b border-border-default bg-bg-raised">
        <div className="flex w-full items-center gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <BrandMark className="text-lg sm:text-xl" />
          {memberName ? (
            <p className="truncate border-l border-border-subtle pl-3 text-sm text-text-muted sm:pl-4">
              {memberName}
            </p>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <h1 className="font-display text-center text-2xl font-bold tracking-tight text-text-primary">
          {t("en", "chooseLanguageTitle")}
        </h1>
        <p className="mt-2 text-center text-lg text-text-muted">
          {t("es", "chooseLanguageSubtitle")}
        </p>

        <div className="mt-8 grid gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void choose("en")}
            className="min-h-14 rounded-xl border-2 border-border-default bg-bg-raised px-4 py-4 text-lg font-semibold text-text-primary transition hover:border-lime-500/50 hover:bg-lime-400/10 disabled:opacity-50"
          >
            {busy === "en" ? "…" : t("en", "languageEnglish")}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void choose("es")}
            className="min-h-14 rounded-xl border-2 border-border-default bg-bg-raised px-4 py-4 text-lg font-semibold text-text-primary transition hover:border-lime-500/50 hover:bg-lime-400/10 disabled:opacity-50"
          >
            {busy === "es" ? "…" : t("es", "languageSpanish")}
          </button>
        </div>
      </main>

      <footer className="pb-8">
        <PoweredBy />
      </footer>
    </div>
  );
}
