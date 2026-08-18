import { NextResponse } from "next/server";
import { createServiceClient, hasServiceRoleEnv } from "@/lib/supabase/service";
import { findCrewByEmail, isValidEmail } from "@/lib/email-otp";
import {
  allowMagicLinkDevReveal,
  createCrewMagicLink,
  sendMagicLinkEmail,
} from "@/lib/crew-magic-link";

export async function POST(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { error: "Server is not configured for email login yet." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const raw = String(body?.email ?? "").trim();

  if (!isValidEmail(raw)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const match = await findCrewByEmail(supabase, raw);

  if (!match) {
    return NextResponse.json(
      {
        error:
          "That email isn’t on the crew roster yet. Ask a supervisor to add your email under Crew.",
      },
      { status: 404 },
    );
  }

  try {
    const { url, token } = await createCrewMagicLink(
      supabase,
      "email",
      match.email,
    );
    const mail = await sendMagicLinkEmail(match.email, url, match.locale);
    const allowDev = !mail.sent && allowMagicLinkDevReveal();

    if (!mail.sent && !allowDev) {
      return NextResponse.json(
        {
          error:
            "Email sending is not configured. Set RESEND_API_KEY (and optional EMAIL_FROM), or EMAIL_OTP_DEV=1 for testing.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      email: match.email,
      name: match.name,
      linkSent: mail.sent,
      ...(allowDev ? { devLink: url, devToken: token } : {}),
    });
  } catch (err) {
    console.error("crew email magic link start failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send link" },
      { status: 500 },
    );
  }
}
