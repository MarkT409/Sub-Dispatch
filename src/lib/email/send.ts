import {
  getLantanaLogoAttachment,
  type EmailPayload,
} from "@/lib/email/templates";

export async function sendBrandedEmail(
  to: string,
  payload: EmailPayload,
): Promise<{ sent: true } | { sent: false; reason: "email_not_configured" }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "email_not_configured" };
  }

  const from =
    process.env.EMAIL_FROM?.trim() ||
    "Sub-Dispatch <onboarding@resend.dev>";

  const logo = getLantanaLogoAttachment();
  const body: Record<string, unknown> = {
    from,
    to: [to],
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  };

  if (logo) {
    body.attachments = [
      {
        filename: logo.filename,
        content: logo.content,
        content_id: logo.content_id,
        content_type: logo.content_type,
      },
    ];
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Resend branded email failed:", text);
    throw new Error("Failed to send email");
  }

  return { sent: true };
}
