"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "cd-sheets-auto-sync-at";
const MIN_INTERVAL_MS = 2 * 60 * 1000; // avoid hammering Sheets

/**
 * Quietly pull the Google Sheets board (and invoices) into Supabase.
 * No UI — runs when an admin is in the panel.
 *
 * Uses board-only sync (not invoices) and current week only.
 */
export function AdminAutoSync() {
  const pathname = usePathname();
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const last = Number(sessionStorage.getItem(STORAGE_KEY) || "0");
    if (Date.now() - last < MIN_INTERVAL_MS) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          "/api/admin/sheets/sync?source=board&weeks=current",
          { method: "POST" },
        );
        if (!res.ok) return;
        sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
        if (
          !cancelled &&
          (pathname === "/admin" || pathname.startsWith("/admin/jobs"))
        ) {
          router.refresh();
        }
      } catch {
        // Silent — cron + next visit will retry
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
