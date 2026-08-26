import { isAdminEmail } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { createServiceClient, hasServiceRoleEnv } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { AppRole } from "@/lib/admin-auth";

type SessionUser = {
  email?: string | null;
  id?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  boardWrite?: boolean;
  role?: AppRole | null;
  crewMemberId?: string;
};

type SessionLike = {
  user?: SessionUser;
  expires?: string;
};

type Authed = {
  supabase: ReturnType<typeof createServiceClient>;
  user: { email: string; id: string };
  session: SessionLike;
  errorResponse: null;
};

type Denied = {
  supabase: null;
  user: null;
  session: null;
  errorResponse: NextResponse;
};

function denied(status = 401, message = "Unauthorized"): Denied {
  return {
    supabase: null,
    user: null,
    session: null,
    errorResponse: NextResponse.json({ error: message }, { status }),
  };
}

async function getAdminSession(): Promise<Authed | Denied> {
  if (!hasServiceRoleEnv()) {
    return denied(503, "Service role is not configured");
  }

  const session = (await auth()) as SessionLike | null;
  if (session?.user?.email && session.user.isAdmin) {
    return {
      supabase: createServiceClient(),
      user: {
        email: session.user.email,
        id: session.user.id ?? session.user.email,
      },
      session,
      errorResponse: null,
    };
  }

  if (session?.user?.email && isAdminEmail(session.user.email)) {
    return {
      supabase: createServiceClient(),
      user: {
        email: session.user.email,
        id: session.user.id ?? session.user.email,
      },
      session,
      errorResponse: null,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user?.email && isAdminEmail(user.email)) {
      return {
        supabase: createServiceClient(),
        user: { email: user.email, id: user.id },
        session: {
          user: {
            email: user.email,
            isAdmin: true,
            isSuperAdmin: false,
            boardWrite: false,
          },
          expires: "",
        },
        errorResponse: null,
      };
    }
  } catch {
    // Missing Supabase env
  }

  return denied();
}

export async function requireAdmin() {
  return getAdminSession();
}

export async function requireBoardWriter() {
  const result = await getAdminSession();
  if (result.errorResponse) return result;

  const canWrite =
    result.session.user?.isSuperAdmin || result.session.user?.boardWrite;
  if (!canWrite) {
    return denied(403, "Board write permission required");
  }
  return result;
}

export async function requireSuperAdmin() {
  const result = await getAdminSession();
  if (result.errorResponse) return result;

  if (!result.session.user?.isSuperAdmin) {
    return denied(403, "Super admin permission required");
  }
  return result;
}

/** Authenticated admin or crew member (for shared board read). */
export async function requireBoardViewer() {
  if (!hasServiceRoleEnv()) {
    return denied(503, "Service role is not configured");
  }

  const session = (await auth()) as SessionLike | null;
  if (!session?.user) {
    return denied();
  }

  const email = session.user.email?.trim() || null;
  const isAdmin =
    Boolean(session.user.isAdmin) ||
    (email ? isAdminEmail(email) : false);
  const isCrew = Boolean(session.user.crewMemberId);

  if (!isAdmin && !isCrew) {
    return denied();
  }

  const id =
    session.user.id ||
    session.user.crewMemberId ||
    email ||
    "crew";

  return {
    supabase: createServiceClient(),
    user: {
      email: email || `${id}@crew.local`,
      id,
    },
    session,
    canWrite: Boolean(session.user.isSuperAdmin || session.user.boardWrite),
    errorResponse: null as null,
  };
}
