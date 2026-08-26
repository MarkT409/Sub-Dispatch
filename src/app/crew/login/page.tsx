import { auth } from "@/lib/auth";
import { isGoogleAuthConfigured } from "@/lib/oauth-env";
import { hasServiceRoleEnv } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import CrewLoginForm from "@/components/crew/CrewLoginForm";

type PageProps = {
  searchParams: Promise<{ error?: string; email?: string }>;
};

export default async function CrewLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await auth();

  if (session?.user?.crewMemberId && !session.user.isAdmin) {
    redirect("/crew");
  }

  if (session?.user?.isAdmin) {
    redirect("/admin");
  }

  let accessHint: string | null = null;
  if (session?.user?.email && !session.user.crewMemberId) {
    accessHint = `Signed in as ${session.user.email}, but this email is not on the crew roster. Ask an admin to add you in Crew, then sign in again.`;
  } else if (params.error === "AccessDenied" || params.error === "Callback") {
    accessHint = params.email
      ? `${params.email} is not on the crew roster or ADMIN_EMAILS. Add it in Admin → Crew (or .env.local), then try again.`
      : "Sign-in was denied. Your Google email must be on the crew roster (or in ADMIN_EMAILS).";
  } else if (params.error === "Configuration") {
    accessHint =
      "Auth is misconfigured. Check CREW_GOOGLE_CLIENT_ID, CREW_GOOGLE_CLIENT_SECRET, and NEXTAUTH_SECRET.";
  }

  return (
    <CrewLoginForm
      googleConfigured={isGoogleAuthConfigured()}
      supabaseConfigured={hasServiceRoleEnv()}
      accessHint={accessHint}
      signedInEmail={session?.user?.email ?? null}
    />
  );
}
