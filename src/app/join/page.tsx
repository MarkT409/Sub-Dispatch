import type { Metadata } from "next";
import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";
import { JoinForm } from "@/components/JoinForm";
import { positions } from "@/lib/join-positions";

export const metadata: Metadata = {
  title: "Join the Crew | Sub-Dispatch",
  description:
    "Looking for skilled electricians and apprentices for residential rough-in and trim work. Apply today.",
};

const perks = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Consistent work",
    description: "Steady residential jobs—no slow seasons chasing your own leads.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    title: "Small crew culture",
    description: "Work alongside people who take pride in what they install.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: "Competitive pay",
    description: "Paid by the phase—rough-in and trim rates that reflect your skill.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
    title: "Clear expectations",
    description: "You know the schedule, the scope, and who to call. No guessing.",
  },
];

export default function JoinPage() {
  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-50 border-b border-border-subtle bg-bg-base/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="shrink-0 transition-opacity hover:opacity-90" aria-label="Sub-Dispatch — Home">
            <BrandMark className="text-xl" />
          </a>
          <a
            href="/"
            className="text-sm text-text-secondary transition-colors hover:text-amber-600 dark:hover:text-amber-400"
          >
            ← Back to home
          </a>
        </div>
      </header>

      <main className="pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="mx-auto max-w-6xl px-6">

          {/* Hero */}
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-600 dark:border-amber-400/20 dark:bg-amber-400/5 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
              Now hiring
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
              Join the{" "}
              <span className="text-amber-600 dark:text-amber-400">crew.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-text-secondary">
              We&apos;re looking for electricians who show up, do clean work, and want to be
              part of a team that earns repeat business. Rough-in, trim, and underground
              positions available across Central Texas.
            </p>
          </div>

          <div className="mt-20 grid gap-16 lg:grid-cols-2 lg:gap-12">

            {/* Left column: perks + open positions */}
            <div className="space-y-14">

              {/* Perks */}
              <div>
                <h2 className="font-display text-xl font-semibold text-text-primary">
                  What it&apos;s like to work with us
                </h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {perks.map((perk) => (
                    <div key={perk.title} className="flex gap-4">
                      <div className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400">
                        {perk.icon}
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-text-primary">{perk.title}</h3>
                        <p className="mt-1 text-sm text-text-muted">{perk.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Open positions */}
              <div>
                <h2 className="font-display text-xl font-semibold text-text-primary">
                  Open positions
                </h2>
                <ul className="mt-4 divide-y divide-border-default rounded-xl border border-border-default overflow-hidden">
                  {positions.map((pos) => (
                    <li
                      key={pos.title}
                      className="flex items-center justify-between gap-4 bg-bg-card px-5 py-4"
                    >
                      <div>
                        <p className="font-medium text-text-primary">{pos.title}</p>
                        <p className="mt-0.5 text-sm text-text-muted">{pos.type}</p>
                      </div>
                      <svg className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-text-muted">
                  Don&apos;t see your exact role? Reach out anyway—we grow our team based on talent.
                </p>
              </div>
            </div>

            {/* Right column: application form */}
            <div>
              <div className="rounded-2xl border border-border-default bg-bg-raised p-8 shadow-sm md:p-10 dark:shadow-none">
                <h2 className="font-display text-xl font-semibold text-text-primary">
                  Apply now
                </h2>
                <p className="mt-2 text-sm text-text-muted">
                  Fill out the form and we&apos;ll be in touch within a couple days.
                </p>
                <JoinForm />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border-subtle py-8">
        <PoweredBy />
      </footer>
    </>
  );
}
