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
    accessHint = `Signed in as ${session.user.email}, but this email isn’t on the crew roster. Ask an admin to add you in Crew, then sign in again.`;
  } else if (params.error === "AccessDenied" || params.error === "Callback") {
    accessHint = params.email
      ? `${params.email} isn’t on the crew roster. Ask an admin to add that email in Crew, then try again.`
      : "Sign-in was denied. Your Google email must be on the crew roster.";
  } else if (params.error === "Configuration") {
    accessHint =
      "Sign-in isn’t available right now. Please try again later or use email/phone.";
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
