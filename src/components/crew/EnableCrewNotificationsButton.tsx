"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Status =
  | "loading"
  | "unsupported"
  | "off"
  | "on"
  | "denied"
  | "missing_vapid";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as { standalone?: boolean }).standalone))
  );
}

async function registerServiceWorker() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export function EnableCrewNotificationsButton() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setStatus("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }

      try {
        const cfg = await fetch("/api/crew/push/subscribe").then((r) =>
          r.json(),
        );
        if (!cfg?.configured || !cfg.publicKey) {
          if (!cancelled) setStatus("missing_vapid");
          return;
        }

        await registerServiceWorker();
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (!cancelled) setStatus(existing ? "on" : "off");
        if (!cancelled) setShowIosHint(isIos() && !isStandalone());
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    }

    void refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      if (isIos() && !isStandalone()) {
        setShowIosHint(true);
        toast.message(
          "Add this app to your Home Screen first, then open it from there to enable notifications.",
        );
        return;
      }

      const cfg = await fetch("/api/crew/push/subscribe").then((r) => r.json());
      if (!cfg?.publicKey) {
        toast.error("Push is not configured on the server yet");
        setStatus("missing_vapid");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        toast.error("Notifications were blocked");
        return;
      }

      await registerServiceWorker();
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.publicKey),
      });

      const json = subscription.toJSON();
      const response = await fetch("/api/crew/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(result?.error ?? "Could not enable notifications");
        return;
      }

      setStatus("on");
      toast.success("Job notifications enabled");
    } catch (err) {
      console.error(err);
      toast.error("Could not enable notifications");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/crew/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
      }
      setStatus("off");
      toast.success("Notifications turned off");
    } catch {
      toast.error("Could not turn off notifications");
    } finally {
      setBusy(false);
    }
  }

  if (
    status === "loading" ||
    status === "unsupported" ||
    status === "missing_vapid"
  ) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {status === "on" ? (
        <button
          type="button"
          disabled={busy}
          onClick={disable}
          className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-amber-500/40 hover:text-amber-700 disabled:opacity-70 dark:border-gray-600 dark:text-gray-200 dark:hover:text-amber-400"
        >
          {busy ? "…" : "Notifications on"}
        </button>
      ) : status === "denied" ? (
        <span className="text-xs text-gray-500">Notifications blocked</span>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={enable}
          className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-amber-500/40 hover:text-amber-700 disabled:opacity-70 dark:border-gray-600 dark:text-gray-200 dark:hover:text-amber-400"
        >
          {busy ? "…" : "Enable job alerts"}
        </button>
      )}
      {showIosHint ? (
        <p className="max-w-[11rem] text-right text-[10px] leading-snug text-gray-500">
          iPhone: Share → Add to Home Screen, then open the app icon
        </p>
      ) : null}
    </div>
  );
}
