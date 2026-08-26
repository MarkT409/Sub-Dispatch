import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, hasServiceRoleEnv } from "@/lib/supabase/service";
import { handleInboundCrewSms } from "@/lib/crew-sms-reply";

export const runtime = "nodejs";

function twiml(body: string) {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

function xmlResponse(xml: string, status = 200) {
  return new NextResponse(xml, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/** Validate Twilio request signature (X-Twilio-Signature). */
function isValidTwilioSignature(
  request: NextRequest,
  params: Record<string, string>,
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const signature = request.headers.get("x-twilio-signature");
  if (!authToken || !signature) return false;

  // Prefer the public site URL so signature matches what Twilio signed
  const publicBase =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "";
  const url = publicBase
    ? `${publicBase}${request.nextUrl.pathname}`
    : request.url;

  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);

  const expected = createHmac("sha1", authToken)
    .update(Buffer.from(sorted, "utf-8"))
    .digest("base64");

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Twilio Messaging webhook — crew replies YES/NO (or SI/NO) to accept/decline.
 * Configure in Twilio console:
 *   Phone number → Messaging → A message comes in →
 *   Webhook POST https://crew-dispatch.com/api/twilio/sms
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const params: Record<string, string> = {};
    form.forEach((value, key) => {
      params[key] = String(value);
    });

    const skipSig =
      process.env.TWILIO_SKIP_SIGNATURE_CHECK === "1" ||
      process.env.NODE_ENV === "development";

    if (!skipSig && !isValidTwilioSignature(request, params)) {
      console.error("twilio sms: invalid signature");
      return xmlResponse(twiml("Unauthorized"), 403);
    }

    if (!hasServiceRoleEnv()) {
      return xmlResponse(twiml("Service unavailable"), 503);
    }

    const from = params.From || "";
    const body = params.Body || "";
    if (!from) {
      return xmlResponse(twiml("Missing From"), 400);
    }

    const supabase = createServiceClient();
    const reply = await handleInboundCrewSms(supabase, { from, body });
    return xmlResponse(reply);
  } catch (err) {
    console.error("twilio sms webhook failed:", err);
    return xmlResponse(
      twiml("Sorry, something went wrong. Try again or open your schedule."),
      500,
    );
  }
}

/** Health check for Twilio console / ops. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST Twilio Messaging webhook here for YES/NO job replies.",
  });
}
