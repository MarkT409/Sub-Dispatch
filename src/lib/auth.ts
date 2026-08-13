import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import { createServiceClient, hasServiceRoleEnv } from "@/lib/supabase/service";
import { getAdminEmails, isAdminEmail, type AppRole } from "@/lib/admin-auth";
import { resolveAppUser } from "@/lib/app-users";
import { env } from "@/lib/oauth-env";
import {
  ensureCrewMemberForPhone,
  findRosterByPhone,
  formatPhoneDisplay,
  toE164,
  upsertPhoneCrewUser,
  verifyPhoneOtp,
} from "@/lib/crew-phone-auth";
import {
  findAdminByPhone,
  syncAdminPhoneOnLogin,
} from "@/lib/admin-phone-auth";
import {
  ensureCrewMemberForEmail,
  findCrewByEmail,
  upsertEmailCrewUser,
  verifyEmailOtp,
} from "@/lib/email-otp";

const AUTH_INTENT_COOKIE = "auth_intent";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  const googleId = env("CREW_GOOGLE_CLIENT_ID", "AUTH_GOOGLE_ID");
  const googleSecret = env("CREW_GOOGLE_CLIENT_SECRET", "AUTH_GOOGLE_SECRET");
  if (googleId && googleSecret) {
    providers.push(
      Google({
        clientId: googleId,
        clientSecret: googleSecret,
      }),
    );
  }

  providers.push(
    Credentials({
      id: "phone",
      name: "Phone",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!hasServiceRoleEnv()) return null;

        const rawPhone = String(credentials?.phone ?? "").trim();
        const code = String(credentials?.code ?? "").trim();
        const phoneE164 = toE164(rawPhone);
        if (!phoneE164 || !/^\d{6}$/.test(code)) return null;

        const supabase = createServiceClient();
        const verified = await verifyPhoneOtp(supabase, phoneE164, code);
        if (!verified.ok) {
          console.log("Phone OTP failed:", verified.error);
          return null;
        }

        const match = await findRosterByPhone(supabase, rawPhone);
        if (!match) return null;

        const member = await ensureCrewMemberForPhone(supabase, match);
        if (!member) return null;

        const linked = await upsertPhoneCrewUser(
          supabase,
          member,
          phoneE164,
          match.email,
        );

        return {
          id: linked.crewUserId,
          name: linked.crewMemberName,
          email: match.email ?? undefined,
          phone: phoneE164,
          crewUserId: linked.crewUserId,
          crewMemberId: linked.crewMemberId,
          crewMemberName: linked.crewMemberName,
        };
      },
    }),
  );

  providers.push(
    Credentials({
      id: "admin-phone",
      name: "Admin Phone",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!hasServiceRoleEnv()) return null;

        const rawPhone = String(credentials?.phone ?? "").trim();
        const code = String(credentials?.code ?? "").trim();
        const phoneE164 = toE164(rawPhone);
        if (!phoneE164 || !/^\d{6}$/.test(code)) return null;

        const supabase = createServiceClient();
        const verified = await verifyPhoneOtp(supabase, phoneE164, code);
        if (!verified.ok) {
          console.log("Admin phone OTP failed:", verified.error);
          return null;
        }

        const match = await findAdminByPhone(supabase, rawPhone);
        if (!match) return null;

        await syncAdminPhoneOnLogin(supabase, match, rawPhone);

        // Phone-linked app_users may have no email yet
        if (match.appUserId && !match.email) {
          const isSuperAdmin = match.role === "super_admin";
          return {
            id: match.appUserId,
            name: match.name ?? formatPhoneDisplay(rawPhone),
            email: null,
            phone: phoneE164,
            authKind: "admin-phone" as const,
            isAdmin: true,
            isSuperAdmin,
            boardWrite: isSuperAdmin || match.board_write,
            role: match.role,
          };
        }

        if (!match.email) return null;

        const resolved = await resolveAppUser(
          supabase,
          match.email,
          match.name,
        );
        if (!resolved.isAdmin) return null;

        return {
          id: resolved.appUser?.id ?? match.email,
          name: match.name ?? match.email,
          email: match.email,
          phone: phoneE164,
          authKind: "admin-phone" as const,
          isAdmin: true,
          isSuperAdmin: resolved.isSuperAdmin,
          boardWrite: resolved.boardWrite,
          role: resolved.role,
        };
      },
    }),
  );

  providers.push(
    Credentials({
      id: "email",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!hasServiceRoleEnv()) return null;

        const rawEmail = String(credentials?.email ?? "").trim();
        const code = String(credentials?.code ?? "").trim();
        if (!rawEmail.includes("@") || !/^\d{6}$/.test(code)) return null;

        const supabase = createServiceClient();
        const verified = await verifyEmailOtp(supabase, rawEmail, code);
        if (!verified.ok) {
          console.log("Email OTP failed:", verified.error);
          return null;
        }

        const match = await findCrewByEmail(supabase, verified.email);
        if (!match) return null;

        const member = await ensureCrewMemberForEmail(supabase, match);
        if (!member) return null;

        const linked = await upsertEmailCrewUser(
          supabase,
          member,
          verified.email,
        );

        return {
          id: linked.crewUserId,
          name: linked.crewMemberName,
          email: verified.email,
          crewUserId: linked.crewUserId,
          crewMemberId: linked.crewMemberId,
          crewMemberName: linked.crewMemberName,
          authKind: "email" as const,
        };
      },
    }),
  );

  providers.push(
    Credentials({
      id: "admin-email",
      name: "Admin Email",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!hasServiceRoleEnv()) return null;

        const rawEmail = String(credentials?.email ?? "").trim();
        const code = String(credentials?.code ?? "").trim();
        if (!rawEmail.includes("@") || !/^\d{6}$/.test(code)) return null;

        const supabase = createServiceClient();
        const verified = await verifyEmailOtp(supabase, rawEmail, code);
        if (!verified.ok) {
          console.log("Admin email OTP failed:", verified.error);
          return null;
        }

        const resolved = await resolveAppUser(
          supabase,
          verified.email,
          null,
        );
        if (!resolved.isAdmin) return null;

        if (resolved.appUser?.id) {
          await supabase
            .from("app_users")
            .update({ last_login_at: new Date().toISOString() })
            .eq("id", resolved.appUser.id);
        }

        return {
          id: resolved.appUser?.id ?? verified.email,
          name: resolved.appUser?.name ?? verified.email,
          email: verified.email,
          authKind: "admin-email" as const,
          isAdmin: true,
          isSuperAdmin: resolved.isSuperAdmin,
          boardWrite: resolved.boardWrite,
          role: resolved.role,
        };
      },
    }),
  );

  return providers;
}

async function findCrewUser(
  provider: string,
  providerAccountId: string,
  email: string,
) {
  const supabase = createServiceClient();

  const { data: byProvider } = await supabase
    .from("crew_users")
    .select("*, crew_members!inner(*)")
    .eq("provider", provider)
    .eq("provider_account_id", providerAccountId)
    .maybeSingle();

  if (byProvider) return byProvider;

  if (!email) return null;

  const { data: byEmail } = await supabase
    .from("crew_users")
    .select("*, crew_members!inner(*)")
    .eq("email", email)
    .eq("provider", provider)
    .maybeSingle();

  return byEmail;
}

type PhoneAuthUser = {
  crewUserId?: string;
  crewMemberId?: string;
  crewMemberName?: string;
  phone?: string;
  authKind?: "admin-phone" | "admin-email" | "email";
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  boardWrite?: boolean;
  role?: AppRole | null;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: buildProviders(),
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/crew/login",
    signOut: "/crew/login",
    error: "/crew/login",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "phone" || account?.provider === "email") {
        return Boolean((user as PhoneAuthUser).crewMemberId);
      }

      if (
        account?.provider === "admin-phone" ||
        account?.provider === "admin-email"
      ) {
        return Boolean((user as PhoneAuthUser).isAdmin);
      }

      if (!account || !user.email) return false;

      const email = normalizeEmail(user.email);

      async function deny(reason: string) {
        console.log(`Sign-in denied (${reason}):`, email, {
          adminAllowlistCount: getAdminEmails().length,
        });
        const cookieStore = await cookies();
        const intent = cookieStore.get(AUTH_INTENT_COOKIE)?.value;
        if (intent === "admin") {
          return `/admin/login?error=unauthorized&email=${encodeURIComponent(email)}`;
        }
        return `/crew/login?error=AccessDenied&email=${encodeURIComponent(email)}`;
      }

      if (!hasServiceRoleEnv()) {
        if (isAdminEmail(email)) return true;
        console.error(
          "Sign-in denied: Supabase service role env is missing or still a placeholder",
        );
        return deny("supabase_env");
      }

      try {
        const supabase = createServiceClient();
        const resolved = await resolveAppUser(supabase, email, user.name);

        if (resolved.isAdmin) {
          if (resolved.appUser?.id) {
            await supabase
              .from("app_users")
              .update({ last_login_at: new Date().toISOString() })
              .eq("id", resolved.appUser.id);
          }
          return true;
        }

        const existingUser = await findCrewUser(
          account.provider,
          account.providerAccountId,
          email,
        );

        if (existingUser) {
          await supabase
            .from("crew_users")
            .update({ last_login_at: new Date().toISOString() })
            .eq("id", existingUser.id);
          return true;
        }

        const { data: crewMember, error: rosterError } = await supabase
          .from("crew_members")
          .select("*")
          .ilike("email", email)
          .eq("active", true)
          .maybeSingle();

        if (rosterError) {
          console.error("Crew roster lookup failed:", rosterError.message);
          return deny("roster_lookup");
        }

        if (!crewMember) {
          return deny("not_in_roster_or_admin_allowlist");
        }

        const { error: insertError } = await supabase.from("crew_users").insert({
          crew_member_id: crewMember.id,
          provider: account.provider,
          provider_account_id: account.providerAccountId,
          email,
          name: user.name || crewMember.name,
          avatar_url: user.image,
          last_login_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error("Failed to create crew_users row:", insertError.message);
          return deny("crew_user_insert");
        }

        return true;
      } catch (error) {
        console.error("Sign-in error:", error);
        return deny("exception");
      }
    },

    async jwt({ token, account, user }) {
      const phoneUser = user as PhoneAuthUser | undefined;

      if (
        phoneUser?.authKind === "admin-phone" ||
        phoneUser?.authKind === "admin-email"
      ) {
        if (user?.email) token.email = normalizeEmail(user.email);
        token.isAdmin = true;
        token.isSuperAdmin = Boolean(phoneUser.isSuperAdmin);
        token.boardWrite = Boolean(phoneUser.boardWrite);
        token.role = phoneUser.role ?? null;
        if (phoneUser.phone) token.phone = phoneUser.phone;
        delete token.crewUserId;
        delete token.crewMemberId;
        delete token.crewMemberName;
        return token;
      }

      if (phoneUser?.crewMemberId) {
        token.crewUserId = phoneUser.crewUserId;
        token.crewMemberId = phoneUser.crewMemberId;
        token.crewMemberName = phoneUser.crewMemberName;
        token.isAdmin = false;
        token.isSuperAdmin = false;
        token.boardWrite = false;
        token.role = null;
        if (user?.email) token.email = normalizeEmail(user.email);
        if (phoneUser.phone) token.phone = phoneUser.phone;
        return token;
      }

      const email = normalizeEmail(
        (user?.email || token.email || "") as string,
      );
      if (email) token.email = email;

      if (email && hasServiceRoleEnv()) {
        try {
          const supabase = createServiceClient();
          const resolved = await resolveAppUser(
            supabase,
            email,
            user?.name ?? (token.name as string | undefined),
          );

          token.isAdmin = resolved.isAdmin;
          token.isSuperAdmin = resolved.isSuperAdmin;
          token.boardWrite = resolved.boardWrite;
          token.role = resolved.role;

          if (
            account &&
            account.provider !== "phone" &&
            account.provider !== "admin-phone" &&
            account.provider !== "email" &&
            account.provider !== "admin-email"
          ) {
            const crewUser = await findCrewUser(
              account.provider,
              account.providerAccountId,
              email,
            );

            if (crewUser) {
              token.crewUserId = crewUser.id;
              token.crewMemberId = crewUser.crew_member_id;
              token.crewMemberName = crewUser.crew_members.name;
            }
          }
        } catch (error) {
          console.error("JWT role/crew lookup failed:", error);
          if (token.isAdmin === undefined) {
            token.isAdmin = isAdminEmail(email);
          }
        }
      } else if (email && token.isAdmin === undefined) {
        token.isAdmin = isAdminEmail(email);
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string) || session.user.email;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
        session.user.boardWrite = Boolean(token.boardWrite);
        session.user.role = token.role ?? null;
        if (token.crewUserId) {
          session.user.crewUserId = token.crewUserId as string;
          session.user.crewMemberId = token.crewMemberId as string;
          session.user.crewMemberName = token.crewMemberName as string;
        }
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
  },
});
