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
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v14m0 0-4-4m4 4 4-4M3 21h18" />
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" />
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
        {/* Charging station body */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />
        {/* Lightning bolt on station face */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 8.5 8 11.5h3L9.5 15" />
        {/* Cable and connector plug */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 12h4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 10v4" />
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
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
