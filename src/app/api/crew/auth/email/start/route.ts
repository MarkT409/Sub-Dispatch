import { NextResponse } from "next/server";
import { createServiceClient, hasServiceRoleEnv } from "@/lib/supabase/service";
import {
  allowEmailOtpDevCode,
  createEmailOtp,
  findCrewByEmail,
  isValidEmail,
  sendOtpEmail,
} from "@/lib/email-otp";

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
    const { code, email } = await createEmailOtp(supabase, match.email);
    const mail = await sendOtpEmail(email, code);
    const allowDev = !mail.sent && allowEmailOtpDevCode();

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
      email,
      name: match.name,
      emailSent: mail.sent,
      ...(allowDev ? { devCode: code } : {}),
    });
  } catch (err) {
    console.error("crew email OTP start failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send code" },
      { status: 500 },
    );
  }
}
