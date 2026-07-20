export function About() {
  return (
    <section id="about" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
              Powering homes, businesses & job sites
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-text-secondary">
              Lantana Electric delivers residential, commercial, and underground electrical
              work—with skilled crews for rough-in, trim, and full-scope installation. We
              partner with electrical contractors who need dependable labor, and with
              builders who need a team that shows up ready.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-text-secondary">
              From tract homes and custom builds to service racks and finish-out, our
              installers follow your specs, your schedule, and your standards—so projects
              move forward without delays or surprises.
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
                  text: "You scope the job—new build, underground, rough, trim, or full package.",
                },
                {
                  step: "02",
                  text: "We assign a crew sized to your timeline and project type.",
                },
                {
                  step: "03",
                  text: "Installers report to your leadership and complete work to spec.",
                },
                {
                  step: "04",
                  text: "You move to the next phase with quality work and clear communication.",
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
