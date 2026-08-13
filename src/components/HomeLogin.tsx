"use client";

import { signIn } from "next-auth/react";
import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";
import { useState } from "react";
import { toast } from "sonner";

export default function HomeLogin({
  googleConfigured = true,
  supabaseConfigured = true,
}: {
  googleConfigured?: boolean;
  supabaseConfigured?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!googleConfigured) {
      toast.error(
        "Google SSO is not configured. Add CREW_GOOGLE_CLIENT_ID and CREW_GOOGLE_CLIENT_SECRET to .env.local, then restart.",
      );
      return;
    }

    if (!supabaseConfigured) {
      toast.error(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, then restart.",
      );
      return;
    }

    try {
      setIsLoading(true);
      document.cookie = "auth_intent=crew; Path=/; Max-Age=600; SameSite=Lax";
      await signIn("google", { callbackUrl: "/crew" });
    } catch (error) {
      console.error("Sign-in error:", error);
      toast.error("Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-10 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-center">
            <BrandMark className="text-3xl" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to view your assigned jobs
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          {!supabaseConfigured && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              Supabase is still using placeholder values in{" "}
              <code className="text-xs">.env.local</code>. Set your real project
              URL and service role key, then restart the server.
            </div>
          )}

          {!googleConfigured && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              Google sign-in needs{" "}
              <code className="text-xs">CREW_GOOGLE_CLIENT_ID</code> and{" "}
              <code className="text-xs">CREW_GOOGLE_CLIENT_SECRET</code> in{" "}
              <code className="text-xs">.env.local</code>.
            </div>
          )}

          <button
            type="button"
            onClick={handleSignIn}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-300 bg-white px-6 py-3.5 text-base font-medium text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-600"
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
            <p className="text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Only authorized crew members can access this portal.
              <br />
              Contact your administrator if you need access.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <a
            href="/admin/login"
            className="text-sm font-medium text-amber-700 transition-colors hover:underline dark:text-amber-400"
          >
            Admin sign in →
          </a>
          <a
            href="/crew/login"
            className="text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Crew portal login
          </a>
        </div>
      </div>
      <PoweredBy className="mt-10" />
    </div>
  );
}
