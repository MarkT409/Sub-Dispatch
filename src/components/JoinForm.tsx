"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { positions } from "@/lib/join-positions";

const CONTACT_EMAIL = "noreply@crew-dispatch.com";

export function JoinForm() {
  const [sending, setSending] = useState(false);
  const [nextUrl, setNextUrl] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("sent") === "1") {
      toast.success("Thanks — your application was sent. We'll be in touch soon.");
      window.history.replaceState({}, "", "/join");
    }
    setNextUrl(`${window.location.origin}/join?sent=1`);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nextUrl) return;

    setSending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const role = String(formData.get("role") ?? "").trim();
    const experience = String(formData.get("experience") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${CONTACT_EMAIL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          role,
          experience,
          message,
          _subject: `Crew application — ${role} from ${name}`,
          _replyto: email,
          _template: "table",
          _next: nextUrl,
        }),
      });

      const result = (await response.json().catch(() => null)) as {
        success?: string | boolean;
        message?: string;
      } | null;

      const ok = result?.success === true || result?.success === "true";
      const resultMessage = result?.message ?? "";

      if (ok) {
        form.reset();
        toast.success("Thanks — your application was sent. We'll be in touch soon.");
        window.history.replaceState({}, "", "/join?sent=1");
        return;
      }

      if (/activation/i.test(resultMessage)) {
        toast.message("One-time setup required", {
          description: `Open ${CONTACT_EMAIL} (check spam), click FormSubmit's activate link, then submit again.`,
          duration: 10000,
        });
        return;
      }

      form.setAttribute("action", `https://formsubmit.co/${CONTACT_EMAIL}`);
      form.setAttribute("method", "POST");
      form.submit();
    } catch {
      form.setAttribute("action", `https://formsubmit.co/${CONTACT_EMAIL}`);
      form.setAttribute("method", "POST");
      form.submit();
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
      {nextUrl && <input type="hidden" name="_next" value={nextUrl} />}
      <input type="hidden" name="_captcha" value="false" />
      <input type="hidden" name="_template" value="table" />

      <div>
        <label htmlFor="name" className="block text-sm text-text-muted">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 dark:focus:border-amber-400/50 dark:focus:ring-amber-400/30"
          placeholder="Your name"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm text-text-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 dark:focus:border-amber-400/50 dark:focus:ring-amber-400/30"
          placeholder="you@email.com"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm text-text-muted">
          Position of interest
        </label>
        <select
          id="role"
          name="role"
          required
          className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-4 py-3 text-text-primary focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 dark:focus:border-amber-400/50 dark:focus:ring-amber-400/30"
        >
          <option value="">Select a role…</option>
          {positions.map((pos) => (
            <option key={pos.title} value={pos.title}>
              {pos.title}
            </option>
          ))}
          <option value="Other">Other / Not sure yet</option>
        </select>
      </div>

      <div>
        <label htmlFor="experience" className="block text-sm text-text-muted">
          Years of electrical experience
        </label>
        <input
          id="experience"
          name="experience"
          type="text"
          required
          className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 dark:focus:border-amber-400/50 dark:focus:ring-amber-400/30"
          placeholder="e.g. 3 years rough-in, 1 year trim"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm text-text-muted">
          Anything else we should know?
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="mt-1.5 w-full resize-none rounded-lg border border-border-default bg-bg-input px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 dark:focus:border-amber-400/50 dark:focus:ring-amber-400/30"
          placeholder="Tools you own, availability, location, references…"
        />
      </div>

      <button
        type="submit"
        disabled={sending || !nextUrl}
        className="rounded-full bg-amber-500 py-3.5 font-medium text-navy-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {sending ? "Sending…" : "Send application"}
      </button>

      <p className="text-center text-xs text-text-muted">
        Or email us directly at{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
        >
          {CONTACT_EMAIL}
        </a>
      </p>
    </form>
  );
}
