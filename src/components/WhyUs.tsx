const reasons = [
  {
    title: "Trade-focused crews",
    description: "Installers who understand rough and trim—not general labor sent to figure it out.",
  },
  {
    title: "Flexible capacity",
    description: "Ramp crews up for big pushes and scale back between phases without long-term hires.",
  },
  {
    title: "Your standards",
    description: "We work under your supervision, methods, and inspection requirements.",
  },
  {
    title: "Schedule accountability",
    description: "Phases tied to drywall, framing, and finish schedules—show up when the job needs you.",
  },
];

export function WhyUs() {
  return (
    <section id="why-us" className="border-t border-border-subtle bg-bg-raised py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Why contractors choose Lantana
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-text-secondary">
            Subcontracting should reduce risk on site—not add it. We focus on what
            electrical companies need most: dependable installation labor.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className="flex gap-4 rounded-xl border border-border-default bg-bg-base p-6"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                <svg
                  className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-display font-semibold text-text-primary">{reason.title}</h3>
                <p className="mt-2 text-text-muted">{reason.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
