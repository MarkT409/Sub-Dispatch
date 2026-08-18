import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";
import { CrewSettingsForm } from "@/components/crew/CrewSettingsForm";
import { CrewMessagesBubble } from "@/components/crew/CrewMessagesBubble";
import { LanguagePicker } from "@/components/crew/LanguagePicker";
import { isCrewLocale } from "@/lib/i18n/crew-messages";
import { t } from "@/lib/i18n/crew-t";

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
    .select("id, name, email, phone, locale")
    .eq("id", session.user.crewMemberId)
    .single();

  if (!member) {
    redirect("/crew/login");
  }

  if (!isCrewLocale(member.locale)) {
    return <LanguagePicker memberName={member.name} />;
  }

  const locale = member.locale;

  const { data: crewUser } = await supabase
    .from("crew_users")
    .select("push_notifications_enabled")
    .eq("crew_member_id", member.id)
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="border-b border-border-default bg-bg-raised">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link href="/crew" className="shrink-0">
              <BrandMark className="text-lg sm:text-xl" />
            </Link>
            <div className="min-w-0 border-l border-border-subtle pl-3 sm:pl-4">
              <h1 className="font-display text-base font-bold tracking-tight text-text-primary sm:text-lg">
                {t(locale, "settingsTitle")}
              </h1>
              <p className="truncate text-xs text-text-muted sm:text-sm">
                {member.name}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 text-sm">
            <CrewMessagesBubble locale={locale} />
            <Link
              href="/crew"
              className="min-h-9 inline-flex items-center px-1 text-text-muted hover:text-text-primary"
            >
              {t(locale, "myJobs")}
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/crew/login" });
              }}
            >
              <button
                type="submit"
                className="min-h-9 inline-flex items-center px-1 text-text-muted hover:text-text-primary"
              >
                {t(locale, "signOut")}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6 sm:py-8">
        <CrewSettingsForm
          initial={{
            ...member,
            locale,
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
