"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

type Step = "choose" | "phone" | "email" | "code";
type Channel = "phone" | "email";

export function AdminLoginForm({
  googleConfigured = true,
}: {
  googleConfigured?: boolean;
}) {
  const [step, setStep] = useState<Step>("choose");
  const [channel, setChannel] = useState<Channel>("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [destinationDisplay, setDestinationDisplay] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  const handleGoogle = async () => {
    if (!googleConfigured) {
      toast.error("Google sign-in isn’t available right now. Try email or phone.");
      return;
    }

    try {
      setIsLoading(true);
      document.cookie = "auth_intent=admin; Path=/; Max-Age=600; SameSite=Lax";
      await signIn("google", { callbackUrl: "/admin" });
    } catch (error) {
      console.error("Sign-in error:", error);
      toast.error("Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async () => {
    setIsLoading(true);
    setDevCode(null);
    try {
      if (channel === "phone") {
        const trimmed = phone.trim();
        if (!trimmed) {
          toast.error("Enter your phone number");
          return;
        }
        const res = await fetch("/api/admin/auth/phone/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: trimmed }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Could not send code");
          return;
        }
        setDestinationDisplay(data.phoneDisplay || trimmed);
        if (data.devCode) {
          setDevCode(data.devCode);
          toast.message(`Dev code: ${data.devCode}`);
        } else if (data.smsSent) {
          toast.success("Code sent by text");
        }
      } else {
        const trimmed = email.trim();
        if (!trimmed.includes("@")) {
          toast.error("Enter your email address");
          return;
        }
        const res = await fetch("/api/admin/auth/email/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Could not send code");
          return;
        }
        setDestinationDisplay(data.email || trimmed);
        if (data.devCode) {
          setDevCode(data.devCode);
          toast.message(`Dev code: ${data.devCode}`);
        } else if (data.emailSent) {
          toast.success("Code sent to your email");
        }
      }
      setStep("code");
    } catch {
      toast.error("Could not send code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      toast.error("Enter the 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      document.cookie = "auth_intent=admin; Path=/; Max-Age=600; SameSite=Lax";
      const result =
        channel === "phone"
          ? await signIn("admin-phone", {
              phone: phone.trim(),
              code: trimmedCode,
              redirect: false,
            })
          : await signIn("admin-email", {
              email: email.trim(),
              code: trimmedCode,
              redirect: false,
            });

      if (result?.error) {
        toast.error("Invalid or expired code");
        return;
      }
      window.location.href = "/admin";
    } catch (error) {
      console.error("Admin sign-in error:", error);
      toast.error("Sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {!googleConfigured && step === "choose" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Google sign-in isn’t available. Use email or phone instead.
        </div>
      )}

      {step === "choose" ? (
        <>
          <button
            type="button"
            onClick={() => {
              setChannel("email");
              setStep("email");
            }}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-3.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue with email
          </button>

          <button
            type="button"
            onClick={() => {
              setChannel("phone");
              setStep("phone");
            }}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border-default bg-bg-base px-4 py-3.5 text-sm font-medium text-text-primary transition hover:border-amber-500/40 hover:bg-bg-raised disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue with phone number
          </button>

          <div className="relative py-1 text-center text-xs text-text-muted">
            <span className="relative z-10 bg-bg-raised px-2">or</span>
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border-subtle" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading || !googleConfigured}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border-default bg-bg-base px-4 py-3.5 text-sm font-medium text-text-primary transition hover:border-amber-500/40 hover:bg-bg-raised disabled:cursor-not-allowed disabled:opacity-50"
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

          <p className="text-center text-xs text-text-muted">
            Access is managed under Admin → Users.
          </p>
        </>
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
                    void handleSendCode();
                  }
                }}
                placeholder="(210) 555-0100"
                className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2.5 text-sm tabular-nums"
              />
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
                    void handleSendCode();
                  }
                }}
                placeholder="you@company.com"
                className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2.5 text-sm"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleSendCode()}
            disabled={
              isLoading ||
              (step === "phone" ? !phone.trim() : !email.trim().includes("@"))
            }
            className="flex w-full items-center justify-center rounded-xl bg-lime-400 px-4 py-3.5 text-sm font-semibold text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading
              ? "Sending…"
              : step === "phone"
                ? "Text me a code"
                : "Email me a code"}
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
            Code sent to{" "}
            <span className="font-medium text-text-primary">
              {destinationDisplay || (channel === "phone" ? phone : email)}
            </span>
          </p>
          {devCode && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-800 dark:text-amber-300">
              Dev mode — use code{" "}
              <span className="font-mono font-bold">{devCode}</span>
            </div>
          )}
          <div>
            <label className="block text-sm text-text-muted">6-digit code</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleVerifyCode();
                }
              }}
              placeholder="123456"
              className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em]"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleVerifyCode()}
            disabled={isLoading || code.length !== 6}
            className="flex w-full items-center justify-center rounded-xl bg-lime-400 px-4 py-3.5 text-sm font-semibold text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </button>
          <div className="flex justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                setCode("");
                setDevCode(null);
                setStep(channel);
              }}
              className="text-text-muted hover:text-text-primary"
            >
              ← Change {channel === "phone" ? "number" : "email"}
            </button>
            <button
              type="button"
              onClick={() => void handleSendCode()}
              disabled={isLoading}
              className="font-medium text-amber-700 hover:underline dark:text-amber-400"
            >
              Resend code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
