export function About() {
  return (
    <section id="about" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
              Built for electrical contractors
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-text-secondary">
              Lantana exists to support the contractors who win the jobs. When you land a
              large commercial or multi-family project, you need reliable labor for rough-in
              and trim phases—not another layer of management headaches.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-text-secondary">
              Our installers work as an extension of your team: following your foreman,
              your drawings, and your quality standards. You keep the contract and the
              customer relationship; we deliver the hands on site.
            </p>
          </div>

          <div className="rounded-2xl border border-border-default bg-bg-raised p-8 shadow-sm md:p-10 dark:shadow-none">
            <h3 className="font-display text-lg font-semibold text-amber-600 dark:text-amber-400">
              How we work
            </h3>
            <ol className="mt-6 space-y-6">
              {[
                {
                  step: "01",
                  text: "You scope the phase—rough, trim, or both—and share job requirements.",
                },
                {
                  step: "02",
                  text: "We assign a crew sized to your timeline and project type.",
                },
                {
                  step: "03",
                  text: "Installers report to your site leadership and complete work to spec.",
                },
                {
                  step: "04",
                  text: "You move to the next phase with labor off your payroll, not off your standards.",
                },
              ].map((item) => (
                <li key={item.step} className="flex gap-4">
                  <span className="font-display shrink-0 text-sm font-bold text-amber-600/80 dark:text-amber-400/80">
                    {item.step}
                  </span>
                  <span className="text-text-secondary">{item.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
