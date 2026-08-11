import { isLantanaJob } from "@/lib/sheets/worker-map";

export type JobType = "incoming" | "outgoing";
export type JobStatus = "lead" | "scheduled" | "in_progress" | "complete" | "cancelled";
export type WorkKind = "rough" | "trim" | "service" | "unknown";
export type JobSource = "manual" | "google_sheets" | "invoice";

export type CrewMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  default_rate: number | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Job = {
  id: string;
  title: string;
  client: string | null;
  job_type: JobType;
  status: JobStatus;
  site_address: string | null;
  start_date: string | null;
  end_date: string | null;
  work_date: string | null;
  crew_lead: string | null;
  assigned_to: string | null;
  work_kind: WorkKind | null;
  plan_name: string | null;
  plan_sqft: string | null;
  quoted_amount: number | null;
  invoice_gross: number | null;
  invoice_payout: number | null;
  invoice_profit: number | null;
  invoice_row_key: string | null;
  invoice_week: string | null;
  notes: string | null;
  sheets_row_key: string | null;
  sheets_week: string | null;
  source: JobSource;
  created_at: string;
  updated_at: string;
};

/** Jobs created only from the DRAW sheet pull (not board / InvoiceTemplate). */
export function isDrawOnlyJob(job: Pick<Job, "source"> & { invoice_row_key?: string | null }) {
  return job.source === "invoice" && Boolean(job.invoice_row_key?.startsWith("draw:"));
}

/**
 * Jobs that belong on the Lantana admin Jobs list.
 * Board jobs must be Leo/Jesus/Gilbert/Lantana.
 * Invoice / DRAW rows are already Lantana-only from sheet sync.
 */
export function isVisibleLantanaJob(
  job: Pick<Job, "source" | "assigned_to"> & { invoice_row_key?: string | null },
) {
  if (job.source === "manual" || job.source === "invoice") return true;
  return isLantanaJob(job.assigned_to);
}

export type PaymentIn = {
  id: string;
  job_id: string | null;
  amount: number;
  received_at: string;
  method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentOut = {
  id: string;
  job_id: string | null;
  crew_member_id: string | null;
  amount: number;
  paid_at: string;
  method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const JOB_STATUSES: JobStatus[] = [
  "lead",
  "scheduled",
  "in_progress",
  "complete",
  "cancelled",
];

export const JOB_TYPES: JobType[] = ["incoming", "outgoing"];

export const WORK_KINDS: WorkKind[] = ["rough", "trim", "service", "unknown"];
