"use client";

import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";

export default function HomeLogin({
  googleConfigured = true,
  supabaseConfigured = true,
}: {
  googleConfigured?: boolean;
  supabaseConfigured?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-10 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-center">
            <BrandMark className="text-3xl" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Choose how you want to sign in
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          {!supabaseConfigured && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              Sign-in isn’t available right now. Please try again later.
            </div>
          )}

          {!googleConfigured && supabaseConfigured && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              Google sign-in isn’t available. Use email or phone on the next
              screen.
            </div>
          )}

          <div className="flex flex-col gap-3">
            <a
              href="/admin/login"
              className="flex w-full items-center justify-center rounded-xl bg-lime-400 px-6 py-3.5 text-base font-semibold text-black shadow-sm transition hover:bg-lime-300"
            >
              Admin sign in
            </a>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              Email, phone, or Google — for dispatch staff
            </p>

            <a
              href="/crew/login"
              className="mt-2 flex w-full items-center justify-center rounded-xl border-2 border-gray-300 bg-white px-6 py-3.5 text-base font-medium text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-600"
            >
              Crew sign in
            </a>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              Email, phone, or Google — for field crews
            </p>
          </div>
        </div>
      </div>
      <PoweredBy className="mt-10" />
    </div>
  );
}
