import { readFileSync } from "fs";
import { join } from "path";
import type { CrewLocale } from "@/lib/i18n/crew-messages";
import { isCrewLocale } from "@/lib/i18n/crew-messages";

/** Site light palette — keep in sync with globals.css */
const C = {
  bg: "#f4f7fb",
  card: "#ffffff",
  ink: "#0a0f1a",
  secondary: "#334155",
  muted: "#64748b",
  border: "rgba(10,15,26,0.10)",
  lime: "#a3e635",
  amber: "#e5a020",
  black: "#0a0f1a",
} as const;

const LOGO_CID = "lantana-logo";
const LOGO_FILE = "lantana-email-logo.png";

type EmailCopy = {
  brandEyebrow: string;
  footerRoster: string;
  magic: {
    subject: string;
    preview: string;
    title: string;
    body: string;
    pasteHint: string;
    cta: string;
    footnote: string;
    text: (url: string) => string;
  };
  otp: {
    subject: (code: string) => string;
    preview: (code: string) => string;
    title: string;
    body: string;
    footnote: string;
    text: (code: string) => string;
  };
  job: {
    acceptHint: string;
    cta: string;
    text: (body: string, url: string) => string;
  };
};

const COPY: Record<CrewLocale, EmailCopy> = {
  en: {
    brandEyebrow: "Sub-Dispatch",
    footerRoster:
      "You’re receiving this because you’re on the crew roster.",
    magic: {
      subject: "Sign in to Sub-Dispatch",
      preview:
        "Your secure Sub-Dispatch sign-in link — expires in 20 minutes.",
      title: "Sign in to your schedule",
      body: `Tap the button below to open Sub-Dispatch. This link works once and expires in <strong style="color:${C.ink}">20 minutes</strong>.`,
      pasteHint: "Or paste this link into your browser:",
      cta: "Open schedule",
      footnote: "If you didn’t request this, you can ignore this email.",
      text: (url) =>
        `Sign in to Sub-Dispatch:\n\n${url}\n\nThis link expires in 20 minutes. If you didn’t request it, you can ignore this email.`,
    },
    otp: {
      subject: (code) => `${code} is your Sub-Dispatch sign-in code`,
      preview: (code) => `Your Sub-Dispatch code is ${code}`,
      title: "Your sign-in code",
      body: `Enter this code to finish signing in. It expires in <strong style="color:${C.ink}">10 minutes</strong>.`,
      footnote: "If you didn’t request this, you can ignore this email.",
      text: (code) =>
        `Your Sub-Dispatch sign-in code is ${code}. It expires in 10 minutes.\n\nIf you didn’t request this, you can ignore this email.`,
    },
    job: {
      acceptHint: "Accept or decline from your crew schedule.",
      cta: "Open schedule",
      text: (body, url) => `${body}\n\nOpen your schedule: ${url}`,
    },
  },
  es: {
    brandEyebrow: "Sub-Dispatch",
    footerRoster:
      "Recibes este correo porque estás en la lista de la cuadrilla.",
    magic: {
      subject: "Inicia sesión en Sub-Dispatch",
      preview:
        "Tu enlace seguro de Sub-Dispatch — caduca en 20 minutos.",
      title: "Entra a tu horario",
      body: `Toca el botón para abrir Sub-Dispatch. Este enlace funciona una vez y caduca en <strong style="color:${C.ink}">20 minutos</strong>.`,
      pasteHint: "O pega este enlace en tu navegador:",
      cta: "Abrir horario",
      footnote: "Si no pediste esto, puedes ignorar este correo.",
      text: (url) =>
        `Inicia sesión en Sub-Dispatch:\n\n${url}\n\nEste enlace caduca en 20 minutos. Si no lo pediste, ignora este correo.`,
    },
    otp: {
      subject: (code) => `${code} es tu código de Sub-Dispatch`,
      preview: (code) => `Tu código de Sub-Dispatch es ${code}`,
      title: "Tu código de acceso",
      body: `Ingresa este código para terminar de iniciar sesión. Caduca en <strong style="color:${C.ink}">10 minutos</strong>.`,
      footnote: "Si no pediste esto, puedes ignorar este correo.",
      text: (code) =>
        `Tu código de Sub-Dispatch es ${code}. Caduca en 10 minutos.\n\nSi no lo pediste, puedes ignorar este correo.`,
    },
    job: {
      acceptHint: "Acepta o rechaza desde el horario de la cuadrilla.",
      cta: "Abrir horario",
      text: (body, url) => `${body}\n\nAbre tu horario: ${url}`,
    },
  },
};

export function resolveEmailLocale(value: unknown): CrewLocale {
  return isCrewLocale(value) ? value : "en";
}

let logoBase64Cache: string | null = null;

export function getLantanaLogoAttachment(): {
  filename: string;
  content: string;
  content_id: string;
  content_type: string;
} | null {
  try {
    if (!logoBase64Cache) {
      const path = join(process.cwd(), "public", LOGO_FILE);
      logoBase64Cache = readFileSync(path).toString("base64");
    }
    return {
      filename: LOGO_FILE,
      content: logoBase64Cache,
      content_id: LOGO_CID,
      content_type: "image/png",
    };
  } catch (err) {
    console.error("email logo load failed:", err);
    return null;
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(options: {
  locale: CrewLocale;
  preview: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  footnote?: string;
}) {
  const copy = COPY[options.locale];
  const preview = escapeHtml(options.preview);
  const title = escapeHtml(options.title);
  const cta = options.cta
    ? `<tr>
        <td style="padding:8px 28px 28px">
          <a href="${escapeHtml(options.cta.href)}"
             style="display:inline-block;background:${C.lime};color:${C.black};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:10px;letter-spacing:0.01em">
            ${escapeHtml(options.cta.label)}
          </a>
        </td>
      </tr>`
    : "";
  const footnote = options.footnote
    ? `<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${C.muted}">${escapeHtml(options.footnote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="${options.locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <!--[if mso]><style>body,table,td{font-family:Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${C.bg}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preview}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:28px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border:1px solid ${C.border};border-radius:16px;overflow:hidden">
          <tr>
            <td align="center" style="background:${C.black};padding:26px 28px">
              <img src="cid:${LOGO_CID}" width="96" height="122" alt="Lantana Electric"
                   style="display:block;width:96px;height:auto;max-width:96px;border:0;outline:none" />
            </td>
          </tr>
          <tr>
            <td style="height:3px;background:${C.amber};font-size:0;line-height:0">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px">
              <p style="margin:0 0 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C.amber}">
                ${escapeHtml(copy.brandEyebrow)}
              </p>
              <h1 style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.25;font-weight:800;color:${C.ink}">
                ${title}
              </h1>
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:${C.secondary}">
                ${options.bodyHtml}
              </div>
            </td>
          </tr>
          ${cta}
          <tr>
            <td style="padding:${options.cta ? "0" : "8px"} 28px 28px">
              ${footnote}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 22px;border-top:1px solid ${C.border};background:#f8fafc">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.5;color:${C.muted};text-align:center">
                Lantana Electric · Sub-Dispatch<br />
                ${escapeHtml(copy.footerRoster)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type EmailPayload = {
  subject: string;
  text: string;
  html: string;
};

export function magicLinkEmail(
  url: string,
  localeRaw: CrewLocale | string | null | undefined = "en",
): EmailPayload {
  const locale = resolveEmailLocale(localeRaw);
  const copy = COPY[locale].magic;
  const safeUrl = escapeHtml(url);
  return {
    subject: copy.subject,
    text: copy.text(url),
    html: layout({
      locale,
      preview: copy.preview,
      title: copy.title,
      bodyHtml: `<p style="margin:0 0 12px">${copy.body}</p>
<p style="margin:0;font-size:13px;color:${C.muted}">${escapeHtml(copy.pasteHint)}<br /><a href="${safeUrl}" style="color:${C.amber};word-break:break-all">${safeUrl}</a></p>`,
      cta: { label: copy.cta, href: url },
      footnote: copy.footnote,
    }),
  };
}

export function otpEmail(
  code: string,
  localeRaw: CrewLocale | string | null | undefined = "en",
): EmailPayload {
  const locale = resolveEmailLocale(localeRaw);
  const copy = COPY[locale].otp;
  const safe = escapeHtml(code);
  return {
    subject: copy.subject(code),
    text: copy.text(code),
    html: layout({
      locale,
      preview: copy.preview(code),
      title: copy.title,
      bodyHtml: `<p style="margin:0 0 18px">${copy.body}</p>
<p style="margin:0;text-align:center">
  <span style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:28px;font-weight:800;letter-spacing:0.28em;color:${C.ink};background:#eef2f7;border:1px solid ${C.border};border-radius:12px;padding:14px 20px 14px 28px">${safe}</span>
</p>`,
      footnote: copy.footnote,
    }),
  };
}

export function jobAlertEmail(options: {
  title: string;
  body: string;
  scheduleUrl: string;
  locale?: CrewLocale | string | null;
}): EmailPayload {
  const locale = resolveEmailLocale(options.locale);
  const copy = COPY[locale].job;
  const title = options.title;
  const body = options.body;
  return {
    subject: title,
    text: copy.text(body, options.scheduleUrl),
    html: layout({
      locale,
      preview: body,
      title,
      bodyHtml: `<p style="margin:0 0 12px">${escapeHtml(body)}</p>
<p style="margin:0;font-size:13px;color:${C.muted}">${escapeHtml(copy.acceptHint)}</p>`,
      cta: { label: copy.cta, href: options.scheduleUrl },
    }),
  };
}
