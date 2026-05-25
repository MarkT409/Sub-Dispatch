export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div className="hero-glow pointer-events-none absolute top-0 right-0 h-[500px] w-[500px] rounded-full blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-600 dark:border-amber-400/20 dark:bg-amber-400/5 dark:text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
          Electrical subcontractor
        </p>

        <h1 className="font-display max-w-3xl text-4xl leading-[1.1] font-bold tracking-tight text-text-primary md:text-6xl">
          Roughs & trims done right,{" "}
          <span className="text-amber-600 dark:text-amber-400">on your schedule</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
          Lantana partners with electrical contractors to deliver skilled installation
          crews for rough-in and finish trim work—so your projects stay on track and your
          teams stay focused on what they do best.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="#contact"
            className="rounded-full bg-amber-500 px-8 py-3.5 font-medium text-navy-950 transition-colors hover:bg-amber-400"
          >
            Request a crew
          </a>
          <a
            href="#services"
            className="rounded-full border border-border-strong px-8 py-3.5 font-medium text-text-primary transition-colors hover:border-amber-500/40 hover:text-amber-600 dark:hover:border-amber-400/40 dark:hover:text-amber-400"
          >
            Our services
          </a>
        </div>

        <dl className="mt-16 grid grid-cols-2 gap-8 border-t border-border-strong pt-12 sm:grid-cols-3 md:max-w-2xl">
          <div>
            <dt className="text-sm text-text-muted">Focus</dt>
            <dd className="mt-1 font-display text-lg font-semibold text-text-primary">
              Rough & trim
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Model</dt>
            <dd className="mt-1 font-display text-lg font-semibold text-text-primary">
              Subcontractor
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-sm text-text-muted">Partners</dt>
            <dd className="mt-1 font-display text-lg font-semibold text-text-primary">
              Electrical contractors
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
