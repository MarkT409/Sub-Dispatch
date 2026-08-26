"use client";

import { signIn, signOut } from "next-auth/react";
import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";
import { useState } from "react";
import { toast } from "sonner";

type Step = "choose" | "phone" | "email" | "sent";
type Channel = "phone" | "email";

export default function CrewLoginForm({
  googleConfigured = true,
  supabaseConfigured = true,
  accessHint = null,
  signedInEmail = null,
}: {
  googleConfigured?: boolean;
  supabaseConfigured?: boolean;
  accessHint?: string | null;
  signedInEmail?: string | null;
}) {
  const [step, setStep] = useState<Step>("choose");
  const [channel, setChannel] = useState<Channel>("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [destinationDisplay, setDestinationDisplay] = useState("");
  const [matchedName, setMatchedName] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);

  const handleGoogle = async () => {
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

  const handleSendLink = async () => {
    if (!supabaseConfigured) {
      toast.error("Supabase is not configured yet.");
      return;
    }

    setIsLoading(true);
    setDevLink(null);
    try {
      if (channel === "phone") {
        const trimmed = phone.trim();
        if (!trimmed) {
          toast.error("Enter your phone number");
          return;
        }
        const res = await fetch("/api/crew/auth/phone/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: trimmed }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Could not send link");
          return;
        }
        setDestinationDisplay(data.phoneDisplay || trimmed);
        setMatchedName(data.name || "");
        if (data.devLink) {
          setDevLink(data.devLink);
          toast.message("Dev mode — open the link below");
        } else if (data.linkSent) {
          toast.success("Sign-in link texted to you");
        }
      } else {
        const trimmed = email.trim();
        if (!trimmed.includes("@")) {
          toast.error("Enter your email address");
          return;
        }
        const res = await fetch("/api/crew/auth/email/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Could not send link");
          return;
        }
        setDestinationDisplay(data.email || trimmed);
        setMatchedName(data.name || "");
        if (data.devLink) {
          setDevLink(data.devLink);
          toast.message("Dev mode — open the link below");
        } else if (data.linkSent) {
          toast.success("Sign-in link emailed to you");
        }
      }
      setStep("sent");
    } catch {
      toast.error("Could not send sign-in link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border-default bg-bg-raised p-8 shadow-sm">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>

        <h1 className="mb-2 text-center font-display text-2xl font-bold tracking-tight text-text-primary">
          Sign in
        </h1>
        <p className="mb-8 text-center text-text-muted">
          {step === "sent"
            ? matchedName
              ? `Welcome, ${matchedName}. Open the link we sent to sign in.`
              : "Open the link we sent to sign in"
            : "Sign in to see your current and previous jobs"}
        </p>

        {!supabaseConfigured && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            Supabase is still using placeholder values in{" "}
            <code className="text-xs">.env.local</code>. Set your real project
            URL and service role key, then restart the server.
          </div>
        )}

        {accessHint && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {accessHint}
          </div>
        )}

        {signedInEmail ? (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/crew/login" })}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border-default bg-bg-input px-4 py-3 text-sm font-medium text-text-secondary transition hover:border-amber-500/40"
          >
            Sign out and try a different account
          </button>
        ) : step === "choose" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setChannel("email");
                setStep("email");
              }}
              disabled={isLoading || !supabaseConfigured}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue with email
            </button>

            <button
              type="button"
              onClick={() => {
                setChannel("phone");
                setStep("phone");
              }}
              disabled={isLoading || !supabaseConfigured}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-default bg-bg-input px-4 py-3 text-sm font-medium text-text-secondary transition hover:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue with phone number
            </button>

            <div className="relative py-2 text-center text-xs text-text-muted">
              <span className="relative z-10 bg-bg-raised px-2">or</span>
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border-subtle" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={isLoading || !googleConfigured}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-border-default bg-bg-input px-4 py-3 text-sm font-medium text-text-secondary transition hover:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-default border-t-text-muted" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Continue with Google
            </button>
          </div>
        ) : step === "phone" || step === "email" ? (
          <div className="space-y-4">
            {step === "phone" ? (
              <div>
                <label className="block text-sm text-text-muted">
                  Phone number
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSendLink();
                    }
                  }}
                  placeholder="(210) 555-0100"
                  className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2.5 text-sm tabular-nums"
                />
                <p className="mt-2 text-xs text-text-muted">
                  We’ll text a sign-in link to the number on your Crew card.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm text-text-muted">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSendLink();
                    }
                  }}
                  placeholder="you@company.com"
                  className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2.5 text-sm"
                />
                <p className="mt-2 text-xs text-text-muted">
                  We’ll email a sign-in link to the address on your Crew card.
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => void handleSendLink()}
              disabled={
                isLoading ||
                (step === "phone"
                  ? !phone.trim()
                  : !email.trim().includes("@"))
              }
              className="flex w-full items-center justify-center rounded-lg bg-lime-400 px-4 py-3 text-sm font-semibold text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading
                ? "Sending…"
                : step === "phone"
                  ? "Text me a sign-in link"
                  : "Email me a sign-in link"}
            </button>
            <button
              type="button"
              onClick={() => setStep("choose")}
              className="w-full text-center text-sm text-text-muted hover:text-text-primary"
            >
              ← Back
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-sm text-text-secondary">
              Link sent to{" "}
              <span className="font-medium text-text-primary">
                {destinationDisplay ||
                  (channel === "phone" ? phone : email)}
              </span>
            </p>
            <p className="text-center text-xs text-text-muted">
              Open the link on this phone or computer to finish signing in. It
              expires in 20 minutes.
            </p>
            {devLink ? (
              <a
                href={devLink}
                className="block break-all rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-center text-sm font-medium text-amber-800 hover:underline dark:text-amber-300"
              >
                Dev mode — open sign-in link
              </a>
            ) : null}
            <div className="flex justify-between gap-3 text-sm">
              <button
                type="button"
                onClick={() => {
                  setDevLink(null);
                  setStep(channel);
                }}
                className="text-text-muted hover:text-text-primary"
              >
                ← Change {channel === "phone" ? "number" : "email"}
              </button>
              <button
                type="button"
                onClick={() => void handleSendLink()}
                disabled={isLoading}
                className="font-medium text-amber-700 hover:underline dark:text-amber-400"
              >
                Resend link
              </button>
            </div>
          </div>
        )}

        {step === "choose" && (
          <p className="mt-6 text-center text-xs text-text-muted">
            Email or phone must match what’s saved on your Crew card.
            <br />
            Contact admin if you need access.
          </p>
        )}

        <div className="mt-6 border-t border-border-subtle pt-5 text-center">
          <p className="text-sm text-text-muted">Admin instead?</p>
          <a
            href="/admin/login"
            className="mt-1 inline-block text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            Go to admin sign in →
          </a>
        </div>
      </div>
      <PoweredBy className="mt-8" />
    </div>
  );
}
