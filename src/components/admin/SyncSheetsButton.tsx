"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type SyncSource = "all" | "board" | "invoices";

export function SyncSheetsButton({
  weeks = "current",
  source = "all",
  label,
}: {
  weeks?: "current" | "all";
  source?: SyncSource;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const buttonLabel =
    label ??
    (source === "invoices"
      ? "Sync invoices"
      : source === "board"
        ? weeks === "all"
          ? "Backfill all weeks"
          : "Sync from Sheets"
        : "Sync all");

  async function handleSync() {
    setBusy(true);
    try {
      const params = new URLSearchParams({
        source,
        weeks: weeks === "all" ? "all" : "current",
      });
      const response = await fetch(`/api/admin/sheets/sync?${params}`, {
        method: "POST",
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        board?: {
          parsed?: number;
          upserted?: number;
          cancelled?: number;
          sheetsSynced?: string[];
        };
        invoices?: {
          parsed?: number;
          matched?: number;
          created?: number;
          updated?: number;
        };
      } | null;

      if (!response.ok) {
        toast.error(result?.error ?? "Could not sync");
        return;
      }

      const parts: string[] = [];
      if (result?.board) {
        parts.push(
          `Board: ${result.board.parsed ?? 0} jobs (${result.board.upserted ?? 0} saved)`,
        );
      }
      if (result?.invoices) {
        parts.push(
          `Invoices: ${result.invoices.parsed ?? 0} rows (${result.invoices.updated ?? 0} updated, ${result.invoices.created ?? 0} new)`,
        );
      }

      toast.success(parts.join(" · ") || "Sync complete", {
        description: result?.board?.sheetsSynced?.length
          ? `Tabs: ${result.board.sheetsSynced.join(", ")}`
          : undefined,
      });
      router.refresh();
    } catch {
      toast.error("Could not sync");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={busy}
      className="rounded-full border border-border-default px-4 py-2 text-sm text-text-secondary hover:border-amber-500/40 hover:text-amber-600 disabled:opacity-70 dark:hover:text-amber-400"
    >
      {busy ? "Syncing…" : buttonLabel}
    </button>
  );
}
