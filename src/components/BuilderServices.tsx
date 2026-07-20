import type { ReactNode } from "react";

type ItemAccent = "amber" | "violet";

const builderServices: {
  label: string;
  accent: ItemAccent;
  icon: ReactNode;
}[] = [
  {
    label: "Complete Electrical Installation",
    accent: "amber",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    label: "Underground Service Installation",
    accent: "violet",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M5.25 7.5h13.5c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125H5.25c-.621 0-1.125-.504-1.125-1.125v-9.75c0-.621.504-1.125 1.125-1.125z" />
      </svg>
    ),
  },
  {
    label: "Temporary Power & Service Racks",
    accent: "amber",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3.75 9.75h16.5" />
      </svg>
    ),
  },
  {
    label: "Meter Loops",
    accent: "violet",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    label: "Utility Coordination",
    accent: "amber",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    label: "Final Trim & Energization",
    accent: "violet",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-4.5V6a2.25 2.25 0 114.5 0v.75m-4.5 0h4.5" />
      </svg>
    ),
  },
];

const accentClasses: Record<ItemAccent, string> = {
  amber: "text-amber-600 dark:text-amber-400",
  violet: "text-violet-500 dark:text-violet-400",
};

export function BuilderServices() {
  return (
    <section
      id="builders"
      className="border-t border-border-subtle bg-bg-raised py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
            Builder & developer services
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-text-secondary">
            End-to-end electrical support for production builders and developers—from
            underground and temp power through final trim and energization.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3">
          {builderServices.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center rounded-xl border border-border-default bg-bg-card px-3 py-5 text-center transition-colors hover:border-amber-500/30 hover:bg-bg-card-hover dark:hover:border-amber-400/25"
            >
              <div className={`mb-3 ${accentClasses[item.accent]}`}>{item.icon}</div>
              <p className="text-xs leading-snug font-medium text-text-secondary">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
