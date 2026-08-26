import {
  CREW_MESSAGES,
  type CrewLocale,
  type CrewMessageKey,
} from "@/lib/i18n/crew-messages";

export type { CrewLocale, CrewMessageKey };

export function t(
  locale: CrewLocale,
  key: CrewMessageKey,
  vars?: Record<string, string | number>,
): string {
  let text = CREW_MESSAGES[locale][key] ?? CREW_MESSAGES.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function dateLocaleTag(locale: CrewLocale) {
  return locale === "es" ? "es-US" : "en-US";
}

export function formatDateLocale(
  iso: string | null | undefined,
  locale: CrewLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat(dateLocaleTag(locale), {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    ...options,
  }).format(date);
}

export function formatMonthLocale(yearMonth: string, locale: CrewLocale) {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) return yearMonth;
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(
    dateLocaleTag(locale),
    { month: "long", year: "numeric", timeZone: "UTC" },
  );
}

export function jobCountLabel(locale: CrewLocale, n: number) {
  return `${n} ${t(locale, n === 1 ? "jobSingular" : "jobPlural")}`;
}

export function weekCountLabel(locale: CrewLocale, n: number) {
  return `${n} ${t(locale, n === 1 ? "weekSingular" : "weekPlural")}`;
}
