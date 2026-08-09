"use client";

export function AdminLoginForm({ zohoConfigured }: { zohoConfigured: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      {zohoConfigured ? (
        <>
          <a
            href="/api/admin/zoho/start"
            className="flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3.5 font-medium text-navy-950 transition-colors hover:bg-amber-400"
          >
            Sign in with Zoho
          </a>
          <p className="text-center text-sm text-text-muted">
            You&apos;ll use the same email and password as your Zoho Mail account.
            When you change that password in Zoho, it applies here too.
          </p>
        </>
      ) : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <p className="font-medium">Zoho sign-in is not configured yet.</p>
          <p className="mt-2 text-text-muted dark:text-amber-200/80">
            Add <code className="text-xs">ZOHO_CLIENT_ID</code>,{" "}
            <code className="text-xs">ZOHO_CLIENT_SECRET</code>, and{" "}
            <code className="text-xs">ADMIN_SESSION_SECRET</code> to{" "}
            <code className="text-xs">.env.local</code>, then restart the dev server.
            See the README for API Console steps.
          </p>
        </div>
      )}

      <p className="text-center text-xs text-text-muted">
        Only allowlisted Lantana emails can access the admin panel.
      </p>
    </div>
  );
}
