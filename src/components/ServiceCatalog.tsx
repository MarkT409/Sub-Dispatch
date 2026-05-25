import Image from "next/image";

const catalog = [
  {
    title: "New Residential Construction",
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80&fit=crop",
    alt: "House framing during new residential construction",
    items: [
      "Tract Homes",
      "Custom Homes",
      "Electrical Rough-In",
      "Final Trim",
      "Panel Installation",
    ],
  },
  {
    title: "Underground Electrical",
    image:
      "https://images.unsplash.com/photo-1581094271901-ef2a9c4e2989?w=800&q=80&fit=crop",
    alt: "Electrical conduit in an underground trench",
    items: [
      "Underground Service",
      "Trenching & Conduit",
      "Utility Installation",
      "Secondary Service",
      "Site Utilities",
    ],
  },
  {
    title: "Service Rack Builds",
    image:
      "https://images.unsplash.com/photo-1473341303090-9d0f7a0a2cd1?w=800&q=80&fit=crop",
    alt: "Electrical utility service equipment outdoors",
    items: [
      "Temporary Power Poles",
      "Permanent Service Racks",
      "Meter Loops",
      "Builder Power Setups",
      "Utility Connections",
    ],
  },
  {
    title: "Custom Homes Electrical",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80&fit=crop",
    alt: "Modern custom home exterior at dusk",
    items: [
      "Custom Home Wiring",
      "Undergrounds",
      "Lighting Design",
      "Panel Upgrades",
      "Smart Home Solutions",
    ],
  },
  {
    title: "EV Chargers",
    image:
      "https://images.unsplash.com/photo-1593941707874-ef6529f4b4e3?w=800&q=80&fit=crop",
    alt: "Electric vehicle wall charger mounted in a garage",
    items: [
      "Level 2 Charger Installation",
      "Tesla Wall Connectors",
      "Load Calculations",
      "Dedicated Circuits",
      "Commercial Chargers",
    ],
  },
  {
    title: "Generators",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&fit=crop",
    alt: "Backup generator equipment outdoors",
    items: [
      "Whole Home Generators",
      "Transfer Switches",
      "Portable Generator Hookups",
      "Backup Power Solutions",
      "Maintenance",
    ],
  },
  {
    title: "Remodels & Upgrades",
    image:
      "https://images.unsplash.com/photo-1556912172-45b0f85f0d0e?w=800&q=80&fit=crop",
    alt: "Modern kitchen remodel with updated lighting",
    items: [
      "Kitchen Remodels",
      "Bathroom Remodels",
      "Home Additions",
      "Panel Upgrades",
      "Rewiring & More",
    ],
  },
  {
    title: "Maintenance & Service",
    image:
      "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80&fit=crop",
    alt: "Electrician working inside an electrical panel",
    items: [
      "Electrical Troubleshooting",
      "Repairs",
      "Preventative Maintenance",
      "Service Calls",
      "Surge Protection",
    ],
  },
];

export function ServiceCatalog() {
  return (
    <div className="mt-20 md:mt-24">
      <div className="max-w-2xl">
        <h3 className="font-display text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          Full service offerings
        </h3>
        <p className="mt-3 text-text-secondary">
          From new builds to service calls—our crews handle the scope your project needs.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border-default bg-border-default sm:grid-cols-2 lg:grid-cols-4">
        {catalog.map((service) => (
          <article
            key={service.title}
            className="group flex flex-col bg-bg-card transition-colors hover:bg-bg-card-hover"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-bg-base">
              <Image
                src={service.image}
                alt={service.alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-navy-950/20 transition-colors group-hover:bg-navy-950/10 dark:bg-navy-950/40 dark:group-hover:bg-navy-950/25" />
            </div>

            <div className="flex flex-1 flex-col p-6">
              <h4 className="font-display text-sm font-bold tracking-wider text-text-primary uppercase">
                {service.title}
              </h4>

              <ul className="mt-4 flex-1 space-y-1.5">
                {service.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-text-muted" />
                    {item}
                  </li>
                ))}
              </ul>

              <a
                href="#contact"
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-amber-600 uppercase transition-colors hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
              >
                Learn more
                <span aria-hidden>→</span>
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
