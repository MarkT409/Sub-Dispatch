import { NextResponse } from "next/server";
import { createServiceClient, hasServiceRoleEnv } from "@/lib/supabase/service";
import {
  createPhoneOtp,
  findRosterByPhone,
  formatPhoneDisplay,
  isTwilioConfigured,
  sendOtpSms,
  toE164,
} from "@/lib/crew-phone-auth";

export async function POST(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { error: "Server is not configured for phone login yet." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const raw = String(body?.phone ?? "").trim();
  const phoneE164 = toE164(raw);

  if (!phoneE164) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit US phone number." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const match = await findRosterByPhone(supabase, raw);

  if (!match) {
    return NextResponse.json(
      {
        error:
          "That number isn’t on the crew roster yet. Ask a supervisor to add your phone under Crew.",
      },
      { status: 404 },
    );
  }

  try {
    const { code } = await createPhoneOtp(supabase, phoneE164);
    const sms = await sendOtpSms(phoneE164, code);

    const allowDevCode =
      !sms.sent &&
      (process.env.CREW_PHONE_OTP_DEV === "1" ||
        process.env.NODE_ENV === "development");

    if (!sms.sent && !allowDevCode) {
      return NextResponse.json(
        {
          error:
            "Text messaging is not configured. Set TWILIO_* env vars, or CREW_PHONE_OTP_DEV=1 for testing.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      phoneDisplay: formatPhoneDisplay(match.phone),
      name: match.name,
      smsSent: sms.sent,
      ...(allowDevCode ? { devCode: code } : {}),
    });
  } catch (err) {
    console.error("phone OTP start failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send code" },
      { status: 500 },
    );
  }
}
