"use client";

import { useState } from "react";

export type MetricCardData = {
  label: string;
  value: string;
  hint?: string;
};

export function DashboardMetrics({
  workCards,
  cashCards,
  summary,
}: {
  workCards: MetricCardData[];
  cashCards: MetricCardData[];
  /** Compact line shown while collapsed */
  summary: { lastWeekGross: string; thisWeekGross: string; onBoard: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-xl border border-border-default bg-bg-raised">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-bg-form/70 sm:px-5"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-text-primary">Metrics</p>
          <p className="mt-0.5 truncate text-xs text-text-muted">
            Last week {summary.lastWeekGross}
            <span className="mx-1.5 text-border-default">·</span>
            This week {summary.thisWeekGross}
            <span className="mx-1.5 text-border-default">·</span>
            Board {summary.onBoard}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border-subtle px-4 py-4 sm:px-5">
          <MetricGroup title="Work & gross" cards={workCards} />
          <MetricGroup title="Cash & year" cards={cashCards} />
        </div>
      ) : null}
    </section>
  );
}

function MetricGroup({ title, cards }: { title: string; cards: MetricCardData[] }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-muted">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-2.5">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint }: MetricCardData) {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-form/50 px-3 py-2.5">
      <p className="text-[11px] leading-tight text-text-muted">{label}</p>
      <p className="mt-1 font-display text-base font-semibold tracking-tight text-text-primary sm:text-lg">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
