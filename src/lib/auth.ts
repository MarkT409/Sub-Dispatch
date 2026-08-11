import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Microsoft from "next-auth/providers/microsoft-entra-id";
import GitHub from "next-auth/providers/github";
import { createClient } from "@/lib/supabase/service";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.CREW_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.CREW_GOOGLE_CLIENT_SECRET!,
    }),
    Apple({
      clientId: process.env.CREW_APPLE_CLIENT_ID!,
      clientSecret: process.env.CREW_APPLE_CLIENT_SECRET!,
    }),
    Microsoft({
      clientId: process.env.CREW_MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.CREW_MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.CREW_MICROSOFT_TENANT_ID || "common",
    }),
    GitHub({
      clientId: process.env.CREW_GITHUB_CLIENT_ID!,
      clientSecret: process.env.CREW_GITHUB_CLIENT_SECRET!,
    }),
  ],
  
  pages: {
    signIn: "/crew/login",
    signOut: "/crew/login",
    error: "/crew/login",
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !user.email) return false;

      try {
        const supabase = createClient();

        // Check if crew user exists
        const { data: existingUser } = await supabase
          .from("crew_users")
          .select("*, crew_members!inner(*)")
          .eq("provider", account.provider)
          .eq("provider_account_id", account.providerAccountId)
          .single();

        if (existingUser) {
          // Update last login
          await supabase
            .from("crew_users")
            .update({ last_login_at: new Date().toISOString() })
            .eq("id", existingUser.id);

          return true;
        }

        // Check if there's a crew member with this email
        const { data: crewMember } = await supabase
          .from("crew_members")
          .select("*")
          .eq("email", user.email)
          .eq("active", true)
          .single();

        if (!crewMember) {
          // Email not in crew roster - deny access
          console.log("Sign-in denied: email not in crew roster", user.email);
          return false;
        }

        // Create crew user record
        await supabase.from("crew_users").insert({
          crew_member_id: crewMember.id,
          provider: account.provider,
          provider_account_id: account.providerAccountId,
          email: user.email,
          name: user.name || crewMember.name,
          avatar_url: user.image,
          last_login_at: new Date().toISOString(),
        });

        return true;
      } catch (error) {
        console.error("Sign-in error:", error);
        return false;
      }
    },

    async jwt({ token, account, profile }) {
      if (account) {
        // Fetch crew user info on initial sign-in
        const supabase = createClient();
        const { data: crewUser } = await supabase
          .from("crew_users")
          .select("*, crew_members!inner(*)")
          .eq("provider", account.provider)
          .eq("provider_account_id", account.providerAccountId)
          .single();

        if (crewUser) {
          token.crewUserId = crewUser.id;
          token.crewMemberId = crewUser.crew_member_id;
          token.crewMemberName = crewUser.crew_members.name;
        }
      }
      return token;
    },

    async session({ session, token }) {
      // Add crew info to session
      if (token.crewUserId) {
        session.user.crewUserId = token.crewUserId as string;
        session.user.crewMemberId = token.crewMemberId as string;
        session.user.crewMemberName = token.crewMemberName as string;
      }
      return session;
    },
  },
  
  session: {
    strategy: "jwt",
  },
});
