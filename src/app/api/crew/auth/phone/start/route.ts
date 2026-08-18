import { NextResponse } from "next/server";
import { createServiceClient, hasServiceRoleEnv } from "@/lib/supabase/service";
import {
  findRosterByPhone,
  formatPhoneDisplay,
  toE164,
} from "@/lib/crew-phone-auth";
import {
  allowMagicLinkDevReveal,
  createCrewMagicLink,
  sendMagicLinkSms,
} from "@/lib/crew-magic-link";

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
    const { url, token } = await createCrewMagicLink(
      supabase,
      "phone",
      phoneE164,
    );
    const sms = await sendMagicLinkSms(phoneE164, url);
    const allowDev = !sms.sent && allowMagicLinkDevReveal();

    if (!sms.sent && !allowDev) {
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
      linkSent: sms.sent,
      ...(allowDev ? { devLink: url, devToken: token } : {}),
    });
  } catch (err) {
    console.error("phone magic link start failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send link" },
      { status: 500 },
    );
  }
}
