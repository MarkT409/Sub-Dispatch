import type { Job } from "@/lib/admin-types";

export function jobGross(job: Pick<Job, "invoice_gross" | "quoted_amount">) {
  const value = job.invoice_gross ?? job.quoted_amount;
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(value);
}

export function sumJobGross(jobs: Pick<Job, "invoice_gross" | "quoted_amount">[]) {
  let total = 0;
  let priced = 0;
  for (const job of jobs) {
    const gross = jobGross(job);
    if (gross == null) continue;
    total += gross;
    priced += 1;
  }
  return { total, priced, unpriced: jobs.length - priced };
}

export function monthKeyFromDate(iso: string | null | undefined) {
  if (!iso) return null;
  const key = iso.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(key) ? key : null;
}

export function currentMonthKeyChicago() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

export function currentYearChicago() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
  }).format(new Date());
}
