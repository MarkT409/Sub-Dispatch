import type { ReactNode } from "react";
import { ServiceCatalog } from "./ServiceCatalog";

type ServiceAccent = "amber" | "violet";

const services: {
  title: string;
  description: string;
  accent: ServiceAccent;
  icon: ReactNode;
}[] = [
  {
    title: "New Residential Construction",
    description:
      "Complete electrical installation for tract homes and custom home builds.",
    accent: "amber",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    title: "Underground Electrical",
    description:
      "Underground service installation, trenching, conduit, and utility solutions.",
    accent: "amber",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M5.25 7.5h13.5c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125H5.25c-.621 0-1.125-.504-1.125-1.125v-9.75c0-.621.504-1.125 1.125-1.125z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5v3.75" />
      </svg>
    ),
  },
  {
    title: "Service Rack Builds",
    description:
      "Temporary and permanent service racks, meter loops, and builder power.",
    accent: "violet",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
      </svg>
    ),
  },
  {
    title: "EV Chargers & Generators",
    description:
      "EV charger installation and whole home generator systems.",
    accent: "amber",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25h1.5M19.5 10.5v3" />
      </svg>
    ),
  },
  {
    title: "Remodels & Upgrades",
    description:
      "Panel upgrades, rewiring, additions, and electrical improvements.",
    accent: "violet",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-4.5V6a2.25 2.25 0 114.5 0v.75m-4.5 0h4.5" />
      </svg>
    ),
  },
  {
    title: "Commercial Electrical",
    description:
      "Buildouts, tenant finish-outs, maintenance, and service solutions.",
    accent: "amber",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.449.148-.9.286-1.35.414m-16.5 0a2.18 2.18 0 01-.75-1.661V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    ),
  },
];

const accentClasses: Record<ServiceAccent, string> = {
  amber: "text-amber-600 dark:text-amber-400",
  violet: "text-violet-500 dark:text-violet-400",
};

export function Services() {
  return (
    <section id="services" className="border-t border-border-subtle bg-bg-raised py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            What we do
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Skilled crews for rough-in, trim, and full-scope electrical work—partnering
            with contractors who need reliable labor on residential and commercial jobs.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl border border-border-default bg-bg-card shadow-sm dark:shadow-none">
          <div className="flex flex-col xl:flex-row">
            {services.map((service, index) => (
              <article
                key={service.title}
                className={`group flex flex-1 flex-col gap-4 p-6 transition-colors hover:bg-bg-card-hover md:p-8 ${
                  index > 0 ? "border-t border-border-default xl:border-t-0 xl:border-l" : ""
                }`}
              >
                <div className={`shrink-0 ${accentClasses[service.accent]}`}>{service.icon}</div>
                <div>
                  <h3 className="font-display text-xs font-bold tracking-wider text-text-primary uppercase">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {service.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <ServiceCatalog />
      </div>
    </section>
  );
}
