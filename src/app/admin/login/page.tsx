import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { Logo } from "@/components/Logo";
import { hasZohoOAuthEnv } from "@/lib/admin-session";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error;
  const zohoConfigured = hasZohoOAuthEnv();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-bg-raised p-8 shadow-sm dark:shadow-none">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo className="h-10 w-auto sm:h-11" />
          <h1 className="font-display text-2xl font-bold text-text-primary">Admin sign in</h1>
          <p className="text-sm text-text-muted">
            Sign in with your Lantana Zoho account (same credentials as Zoho Mail).
          </p>
        </div>

        {error === "unauthorized" && (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            That Zoho account is not on the admin allowlist.
          </p>
        )}
        {error === "auth" && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            Sign-in was cancelled or the session expired. Try again.
          </p>
        )}
        {error === "zoho_config" && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            Zoho OAuth is not configured on this server.
          </p>
        )}
        {error === "zoho_denied" && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            Zoho access was denied. Try again and approve the app.
          </p>
        )}
        {(error === "zoho_token" || error === "zoho_email") && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            Could not finish Zoho sign-in. Check client ID/secret and redirect URI, then try again.
          </p>
        )}

        <AdminLoginForm zohoConfigured={zohoConfigured} />

        <p className="mt-6 text-center text-sm text-text-muted">
          <a href="/" className="hover:text-amber-600 dark:hover:text-amber-400">
            ← Back to site
          </a>
        </p>
      </div>
    </div>
  );
}
