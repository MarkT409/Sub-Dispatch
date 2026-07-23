"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

const CONTACT_EMAIL = "noreply@lantanaelectric.com";

export function Contact() {
  const [sending, setSending] = useState(false);
  const [nextUrl, setNextUrl] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("sent") === "1") {
      toast.success("Thanks — your inquiry was sent. We'll get back to you soon.");
      window.history.replaceState({}, "", "/#contact");
    }
    setNextUrl(`${window.location.origin}/?sent=1#contact`);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nextUrl) return;

    setSending(true);

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
        toast.success("Thanks — your inquiry was sent. We'll get back to you soon.");
        window.history.replaceState({}, "", "/?sent=1#contact");
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
              {nextUrl && <input type="hidden" name="_next" value={nextUrl} />}
              <input type="hidden" name="_captcha" value="false" />
              <input type="hidden" name="_template" value="table" />

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
                disabled={sending || !nextUrl}
                className="rounded-full bg-amber-500 py-3.5 font-medium text-navy-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {sending ? "Sending…" : "Send inquiry"}
              </button>

              <p className="text-center text-xs text-text-muted">
                We&apos;ll respond within one business day.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
