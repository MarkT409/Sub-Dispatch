import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      crewUserId?: string;
      crewMemberId?: string;
      crewMemberName?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    crewUserId?: string;
    crewMemberId?: string;
    crewMemberName?: string;
  }
}
