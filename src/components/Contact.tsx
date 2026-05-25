"use client";

export function Contact() {
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
                  <span className="block text-sm text-text-muted">Email</span>
                  <a
                    href="mailto:info@lantana.com"
                    className="text-text-primary transition-colors hover:text-amber-600 dark:hover:text-amber-400"
                  >
                    info@lantana.com
                  </a>
                </p>
                <p>
                  <span className="block text-sm text-text-muted">Phone</span>
                  <a
                    href="tel:+10000000000"
                    className="text-text-primary transition-colors hover:text-amber-600 dark:hover:text-amber-400"
                  >
                    (000) 000-0000
                  </a>
                </p>
                <p className="text-sm text-text-muted">
                  Update contact details in{" "}
                  <code className="rounded bg-bg-base px-1.5 py-0.5 text-text-secondary">
                    src/components/Contact.tsx
                  </code>
                </p>
              </div>
            </div>

            <form
              className="flex flex-col justify-center gap-5 border-t border-border-default bg-bg-form p-8 md:p-12 lg:border-t-0 lg:border-l"
              action="#"
              onSubmit={(e) => e.preventDefault()}
            >
              <div>
                <label htmlFor="company" className="block text-sm text-text-muted">
                  Company name
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  required
                  className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 dark:focus:border-amber-400/50 dark:focus:ring-amber-400/30"
                  placeholder="Your electrical contracting company"
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
                className="rounded-full bg-amber-500 py-3.5 font-medium text-navy-950 transition-colors hover:bg-amber-400"
              >
                Send inquiry
              </button>
              <p className="text-center text-xs text-text-muted">
                Form is front-end only. Wire to your email service or API when ready.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
