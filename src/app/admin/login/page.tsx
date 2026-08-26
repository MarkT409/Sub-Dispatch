import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";
import { isGoogleAuthConfigured } from "@/lib/oauth-env";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

type PageProps = {
  searchParams: Promise<{ error?: string; email?: string }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error;
  const deniedEmail = params.email;
  const googleConfigured = isGoogleAuthConfigured();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-bg-raised p-8 shadow-sm dark:shadow-none">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark />
          <h1 className="font-display text-2xl font-bold text-text-primary">
            Admin sign in
          </h1>
          <p className="text-sm text-text-muted">
            Sign in with email, phone, or Google.
          </p>
        </div>

        {(error === "unauthorized" || error === "AccessDenied") && (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            {deniedEmail ? (
              <>
                <span className="font-medium">{deniedEmail}</span> isn’t set up
                for admin access. Ask a super admin to add that email under{" "}
                <strong>Users</strong>.
              </>
            ) : (
              <>
                That account isn’t set up for admin access. Ask a super admin to
                add you under <strong>Users</strong>.
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
            Google sign-in isn’t available right now. Try email or phone, or
            contact support.
          </p>
        )}

        <AdminLoginForm googleConfigured={googleConfigured} />

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
