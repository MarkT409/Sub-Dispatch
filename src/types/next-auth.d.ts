import { DefaultSession } from "next-auth";
import type { AppRole } from "@/lib/admin-auth";

declare module "next-auth" {
  interface Session {
    user: {
      isAdmin?: boolean;
      isSuperAdmin?: boolean;
      boardWrite?: boolean;
      role?: AppRole | null;
      crewUserId?: string;
      crewMemberId?: string;
      crewMemberName?: string;
    } & DefaultSession["user"];
  }

  interface User {
    phone?: string;
    crewUserId?: string;
    crewMemberId?: string;
    crewMemberName?: string;
    authKind?: "admin-phone" | "admin-email" | "email" | "magic";
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    boardWrite?: boolean;
    role?: AppRole | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    boardWrite?: boolean;
    role?: AppRole | null;
    crewUserId?: string;
    crewMemberId?: string;
    crewMemberName?: string;
    phone?: string;
  }
}
