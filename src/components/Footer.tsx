import { Logo } from "./Logo";

const footerLinks = [
  { href: "#services", label: "Services" },
  { href: "#about", label: "About" },
  { href: "#why-us", label: "Why Crew Dispatch" },
  { href: "#contact", label: "Contact" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border-subtle bg-bg-raised">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3">
            <Logo className="h-10 w-10" />
            <p className="max-w-xs text-sm text-text-muted leading-relaxed">
              Crew scheduling and job dispatch for electrical crews across
              Central Texas.
            </p>
          </div>

          <nav className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">Quick links</p>
            {footerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-text-secondary transition-colors hover:text-amber-600 dark:hover:text-amber-400"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">Contact</p>
            <a
              href="tel:+18323991024"
              className="text-sm text-text-secondary transition-colors hover:text-amber-600 dark:hover:text-amber-400"
            >
              (832) 399-1024
            </a>
            <a
              href="mailto:noreply@crew-dispatch.com"
              className="text-sm text-text-secondary transition-colors hover:text-amber-600 dark:hover:text-amber-400"
            >
              noreply@crew-dispatch.com
            </a>
            <p className="text-sm text-text-muted">Central Texas</p>
            <a
              href="/join"
              className="text-sm text-text-secondary transition-colors hover:text-amber-600 dark:hover:text-amber-400"
            >
              Join our crew →
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-border-subtle pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-muted">
            © {year} Crew Dispatch. All rights reserved.
          </p>
          <p className="text-xs text-text-muted">
            Crew scheduling · Job alerts · Accept / decline
          </p>
        </div>
      </div>
    </footer>
  );
}
