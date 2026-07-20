"use client";

import { positions } from "@/lib/join-positions";

export function JoinForm() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const role = (form.elements.namedItem("role") as HTMLSelectElement).value;
    const experience = (form.elements.namedItem("experience") as HTMLInputElement).value;
    const message = (form.elements.namedItem("message") as HTMLTextAreaElement).value;
    const subject = encodeURIComponent(`Crew Application — ${role}`);
    const body = encodeURIComponent(
      `Name: ${name}\nPosition of interest: ${role}\nYears of experience: ${experience}\n\n${message}`
    );
    window.location.href = `mailto:join@lantanaelectric.com?subject=${subject}&body=${body}`;
  }

  return (
    <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
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
            <option key={pos.title} value={pos.title}>{pos.title}</option>
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
        className="rounded-full bg-amber-500 py-3.5 font-medium text-navy-950 transition-colors hover:bg-amber-400"
      >
        Send application
      </button>

      <p className="text-center text-xs text-text-muted">
        Or email us directly at{" "}
        <a
          href="mailto:join@lantanaelectric.com"
          className="text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
        >
          join@lantanaelectric.com
        </a>
      </p>
    </form>
  );
}
