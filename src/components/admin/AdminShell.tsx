"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { AdminMessagesBubble } from "@/components/admin/AdminMessagesBubble";
import { EnableNotificationsButton } from "@/components/admin/EnableNotificationsButton";
import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";
import { AdminAutoSync } from "@/components/admin/AdminAutoSync";

export function AdminShell({
  children,
  email,
  isSuperAdmin = false,
  boardWrite = false,
}: {
  children: React.ReactNode;
  email?: string | null;
  isSuperAdmin?: boolean;
  boardWrite?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const nav = [
    { href: "/admin", label: "Scheduler", exact: true },
    { href: "/admin/crew", label: "Crew", exact: false },
    { href: "/admin/users", label: "Users", exact: false },
    { href: "/admin/settings", label: "Settings", exact: false },
  ];

  async function handleSignOut() {
    try {
      await signOut({ callbackUrl: "/admin/login" });
      toast.success("Signed out");
      router.refresh();
    } catch {
      toast.error("Could not sign out");
    }
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <AdminAutoSync />
      <header className="relative z-50 border-b border-border-subtle bg-bg-raised/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="shrink-0">
              <BrandMark className="text-lg sm:text-xl" />
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
          <div className="flex items-center gap-2 sm:gap-3">
            {email && (
              <span className="hidden text-xs text-text-muted lg:inline">
                {email}
                {isSuperAdmin
                  ? " · super"
                  : boardWrite
                    ? " · editor"
                    : " · view"}
              </span>
            )}
            {isSuperAdmin ? <AdminMessagesBubble /> : null}
            <EnableNotificationsButton />
            <ThemeToggle />
            <button
              type="button"
              onClick={handleSignOut}
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
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 md:py-6">{children}</main>
      <footer className="pb-20">
        <PoweredBy />
      </footer>
      <InstallAppPrompt />
    </div>
  );
}
