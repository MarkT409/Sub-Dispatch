"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";

function MagicSignInInner() {
  const params = useSearchParams();
  const token = params.get("token")?.trim() || "";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing sign-in link.");
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await signIn("magic", {
        token,
        redirect: false,
        callbackUrl: "/crew",
      });
      if (cancelled) return;
      if (res?.error) {
        setError("This sign-in link is invalid or expired. Request a new one.");
        return;
      }
      window.location.href = res?.url || "/crew";
    })().catch(() => {
      if (!cancelled) setError("Could not finish sign-in. Try again.");
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/crew/login" className="mb-8 self-start">
        <BrandMark className="text-xl" />
      </Link>
      <div className="rounded-2xl border border-border-default bg-bg-raised p-6 text-center shadow-sm">
        {error ? (
          <>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Link
              href="/crew/login"
              className="mt-4 inline-flex rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-black hover:bg-lime-300"
            >
              Back to login
            </Link>
          </>
        ) : (
          <p className="text-sm text-text-muted">Signing you in…</p>
        )}
      </div>
      <div className="mt-10">
        <PoweredBy />
      </div>
    </div>
  );
}

export default function CrewMagicAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-text-muted">
          Signing you in…
        </div>
      }
    >
      <MagicSignInInner />
    </Suspense>
  );
}
