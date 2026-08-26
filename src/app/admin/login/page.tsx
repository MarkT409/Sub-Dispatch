import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";
import { isGoogleAuthConfigured } from "@/lib/oauth-env";
import { getAdminEmails } from "@/lib/admin-auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

type PageProps = {
  searchParams: Promise<{ error?: string; email?: string }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error;
  const deniedEmail = params.email;
  const googleConfigured = isGoogleAuthConfigured();
  const allowlistCount = getAdminEmails().length;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-bg-raised p-8 shadow-sm dark:shadow-none">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark />
          <h1 className="font-display text-2xl font-bold text-text-primary">Admin sign in</h1>
          <p className="text-sm text-text-muted">
            Sign in with email, phone, or Google.
          </p>
        </div>

        {(error === "unauthorized" || error === "AccessDenied") && (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            {deniedEmail ? (
              <>
                <span className="font-medium">{deniedEmail}</span> isn’t set up
                for admin access. A super admin must add that exact email under{" "}
                <strong>Users</strong> (or to{" "}
                <code className="text-xs">ADMIN_EMAILS</code> /{" "}
                <code className="text-xs">SUPER_ADMIN_EMAILS</code> in{" "}
                <code className="text-xs">.env.local</code>).
              </>
            ) : (
              <>
                That account isn’t set up for admin access. Add the email under{" "}
                <strong>Users</strong>, or to the env allowlist, then try again.
              </>
            )}
          </p>
        )}
        {(error === "auth" || error === "OAuthCallback") && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            Sign-in was cancelled or failed. Try again.
          </p>
        )}
        {error === "Configuration" && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            Google SSO is not configured. Set{" "}
            <code className="text-xs">CREW_GOOGLE_CLIENT_ID</code> and{" "}
            <code className="text-xs">CREW_GOOGLE_CLIENT_SECRET</code> in{" "}
            <code className="text-xs">.env.local</code>, then restart the
            server.
          </p>
        )}

        <AdminLoginForm googleConfigured={googleConfigured} />

        <p className="mt-4 text-center text-xs text-text-muted">
          Admin allowlist currently has {allowlistCount} email
          {allowlistCount === 1 ? "" : "s"} loaded.
          {allowlistCount === 0 && " Set ADMIN_EMAILS and restart."}
        </p>

        <div className="mt-6 border-t border-border-subtle pt-5 text-center">
          <p className="text-sm text-text-muted">Crew instead?</p>
          <a
            href="/crew/login"
            className="mt-1 inline-block text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            Go to crew sign in →
          </a>
        </div>
      </div>
      <PoweredBy className="mt-8" />
    </div>
  );
}
