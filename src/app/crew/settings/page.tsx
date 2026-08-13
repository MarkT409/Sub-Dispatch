import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";
import { CrewSettingsForm } from "@/components/crew/CrewSettingsForm";

export default async function CrewSettingsPage() {
  const session = await auth();

  if (session?.user?.isAdmin) {
    redirect("/admin/settings");
  }
  if (!session?.user?.crewMemberId) {
    redirect("/crew/login");
  }

  const supabase = createServiceClient();
  const { data: member } = await supabase
    .from("crew_members")
    .select("id, name, email, phone")
    .eq("id", session.user.crewMemberId)
    .single();

  if (!member) {
    redirect("/crew/login");
  }

  const { data: crewUser } = await supabase
    .from("crew_users")
    .select("push_notifications_enabled")
    .eq("crew_member_id", member.id)
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark className="text-lg" />
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight">
                Settings
              </h1>
              <p className="text-sm text-text-muted">{member.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/crew"
              className="text-text-muted hover:text-text-primary"
            >
              My jobs
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/crew/login" });
              }}
            >
              <button
                type="submit"
                className="text-text-muted hover:text-text-primary"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <CrewSettingsForm
          initial={{
            ...member,
            push_notifications_enabled:
              crewUser?.push_notifications_enabled ?? true,
          }}
        />
      </main>

      <footer className="pb-8">
        <PoweredBy />
      </footer>
    </div>
  );
}
