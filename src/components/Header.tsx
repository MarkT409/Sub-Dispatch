"use client";

import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

const navLinks = [
  { href: "#services", label: "Services" },
  { href: "#about", label: "About" },
  { href: "#why-us", label: "Why Lantana" },
  { href: "#contact", label: "Contact" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-border-subtle bg-bg-base/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a
          href="#"
          className="font-display text-xl font-semibold tracking-tight text-text-primary"
        >
          Lantana
          <span className="ml-1 text-amber-500 dark:text-amber-400">.</span>
        </a>

        <div className="flex items-center gap-3 md:gap-8">
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-text-secondary transition-colors hover:text-amber-500 dark:hover:text-amber-400"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contact"
              className="rounded-full bg-amber-500 px-5 py-2 text-sm font-medium text-navy-950 transition-colors hover:bg-amber-400"
            >
              Partner With Us
            </a>
          </nav>

          <button
            type="button"
            className="flex flex-col gap-1.5 md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span
              className={`block h-0.5 w-6 bg-text-primary transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""}`}
            />
            <span
              className={`block h-0.5 w-6 bg-text-primary transition-opacity ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block h-0.5 w-6 bg-text-primary transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </button>

          <ThemeToggle />
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-border-subtle bg-bg-raised px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-text-secondary hover:text-amber-500 dark:hover:text-amber-400"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contact"
              className="rounded-full bg-amber-500 px-5 py-2.5 text-center font-medium text-navy-950"
              onClick={() => setMenuOpen(false)}
            >
              Partner With Us
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
