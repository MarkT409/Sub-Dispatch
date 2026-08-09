"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const nav = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/crew", label: "Crew" },
];

export function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      toast.success("Signed out");
      router.push("/admin/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out");
    }
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <header className="border-b border-border-subtle bg-bg-raised/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="shrink-0">
              <Logo className="h-9 w-auto sm:h-10" />
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {nav.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-amber-500/15 font-medium text-amber-700 dark:text-amber-400"
                        : "text-text-secondary hover:text-amber-600 dark:hover:text-amber-400"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {email && (
              <span className="hidden text-xs text-text-muted md:inline">{email}</span>
            )}
            <ThemeToggle />
            <button
              type="button"
              onClick={signOut}
              className="rounded-full border border-border-default px-3 py-1.5 text-sm text-text-secondary hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border-subtle px-4 py-2 sm:hidden">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                  active
                    ? "bg-amber-500/15 font-medium text-amber-700 dark:text-amber-400"
                    : "text-text-secondary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8 md:py-10">{children}</main>
    </div>
  );
}
