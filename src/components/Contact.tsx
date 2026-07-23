"use client";

import { useState, type FormEvent } from "react";

type FormStatus = "idle" | "sending" | "success" | "error";

const CONTACT_EMAIL = "info@lantanaelectric.com";

export function Contact() {
  const [status, setStatus] = useState<FormStatus>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
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
          message,
          _subject: `Lantana website inquiry from ${name}`,
          _replyto: email,
          _template: "table",
        }),
      });

      const result = (await response.json().catch(() => null)) as {
        success?: string | boolean;
        message?: string;
      } | null;

      if (!response.ok || result?.success === "false" || result?.success === false) {
        throw new Error(result?.message ?? "Form submission failed");
      }

      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="overflow-hidden rounded-3xl border border-amber-500/25 bg-bg-raised shadow-lg dark:border-amber-400/20 dark:bg-linear-to-br dark:from-navy-800 dark:to-navy-900 dark:shadow-none">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 md:p-12 lg:p-14">
              <h2 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
                Need crews for your next job?
              </h2>
              <p className="mt-4 text-lg text-text-secondary">
                Tell us about your project—location, phase, timeline, and crew size—and
                we&apos;ll get back to you to discuss partnering on roughs, trims, or both.
              </p>

              <div className="mt-10 space-y-4 text-text-secondary">
                <p>
                  <span className="block text-sm text-text-muted">Phone</span>
                  <a
                    href="tel:+18323991024"
                    className="text-text-primary transition-colors hover:text-amber-600 dark:hover:text-amber-400"
                  >
                    (832) 399-1024
                  </a>
                </p>
                <p>
                  <span className="block text-sm text-text-muted">Email</span>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-text-primary transition-colors hover:text-amber-600 dark:hover:text-amber-400"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </p>
                <p>
                  <span className="block text-sm text-text-muted">Service area</span>
                  <span className="text-text-primary">Central Texas</span>
                </p>
              </div>
            </div>

            <form
              className="flex flex-col justify-center gap-5 border-t border-border-default bg-bg-form p-8 md:p-12 lg:border-t-0 lg:border-l"
              onSubmit={handleSubmit}
            >
              <div>
                <label htmlFor="name" className="block text-sm text-text-muted">
                  Your name
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
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm text-text-muted">
                  Project details
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  className="mt-1.5 w-full resize-none rounded-lg border border-border-default bg-bg-input px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 dark:focus:border-amber-400/50 dark:focus:ring-amber-400/30"
                  placeholder="Job type, location, rough/trim/both, timeline..."
                />
              </div>
              <button
                type="submit"
                disabled={status === "sending"}
                className="rounded-full bg-amber-500 py-3.5 font-medium text-navy-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "sending" ? "Sending…" : "Send inquiry"}
              </button>

              {status === "success" && (
                <p className="text-center text-sm text-amber-600 dark:text-amber-400">
                  Thanks — your inquiry was emailed to us. We&apos;ll get back to you soon.
                </p>
              )}
              {status === "error" && (
                <p className="text-center text-sm text-red-600 dark:text-red-400">
                  Couldn&apos;t send right now. Call{" "}
                  <a href="tel:+18323991024" className="underline">
                    (832) 399-1024
                  </a>{" "}
                  or email{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              )}
              {status === "idle" && (
                <p className="text-center text-xs text-text-muted">
                  We&apos;ll respond within one business day.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
