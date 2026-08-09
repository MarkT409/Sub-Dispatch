import Link from "next/link";
import {
  CurrentMonthJobs,
  PreviousMonthsJobs,
  ThisWeekJobs,
} from "@/components/admin/JobsByMonth";
import { SyncSheetsButton } from "@/components/admin/SyncSheetsButton";
import { formatCurrency } from "@/lib/admin-format";
import {
  currentMonthKeyChicago,
  currentYearChicago,
  monthKeyFromDate,
  sumJobGross,
} from "@/lib/admin-metrics";
import { getAdminDataClient } from "@/lib/supabase/admin-data";
import { isVisibleLantanaJob, type Job } from "@/lib/admin-types";
import {
  addDaysIso,
  getCurrentBillingWeekRange,
} from "@/lib/sheets/job-board-parse";

export default async function AdminDashboardPage() {
  const supabase = await getAdminDataClient();
  const { start: weekStart, end: weekEnd } = getCurrentBillingWeekRange();
  const lastWeekStart = addDaysIso(weekStart, -7);
  const lastWeekEnd = addDaysIso(weekEnd, -7);
  const thisMonth = currentMonthKeyChicago();
  const thisYear = currentYearChicago();

  const [
    { data: weekBoardJobs },
    { data: jobs },
    { data: paymentsIn },
    { data: paymentsOut },
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, assigned_to, source")
      .eq("source", "google_sheets")
      .neq("status", "cancelled")
      .gte("work_date", weekStart)
      .lte("work_date", weekEnd),
    supabase
      .from("jobs")
      .select("*")
      .not("status", "eq", "cancelled")
      .order("work_date", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false }),
    supabase.from("payments_in").select("amount, received_at"),
    supabase.from("payments_out").select("amount, paid_at"),
  ]);

  const allJobs = ((jobs ?? []) as Job[]).filter(isVisibleLantanaJob);

  const inWeek = (job: Job, start: string, end: string) => {
    const d = job.work_date ?? job.start_date ?? "";
    return Boolean(d && d >= start && d <= end);
  };

  const weekJobs = allJobs.filter((job) => inWeek(job, weekStart, weekEnd));
  const lastWeekJobs = allJobs.filter((job) => inWeek(job, lastWeekStart, lastWeekEnd));
  const monthJobs = allJobs.filter((job) => {
    const key = monthKeyFromDate(job.work_date ?? job.start_date);
    return key === thisMonth;
  });
  const ytdJobs = allJobs.filter((job) => {
    const d = job.work_date ?? job.start_date ?? "";
    return d.startsWith(thisYear);
  });

  const weekGross = sumJobGross(weekJobs);
  const lastWeekGross = sumJobGross(lastWeekJobs);
  const monthGross = sumJobGross(monthJobs);
  const ytdGross = sumJobGross(ytdJobs);
  const allGross = sumJobGross(allJobs);

  const received = (paymentsIn ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const paidOut = (paymentsOut ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const net = received - paidOut;

  const monthReceived = (paymentsIn ?? [])
    .filter((p) => monthKeyFromDate(p.received_at) === thisMonth)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const monthPaidOut = (paymentsOut ?? [])
    .filter((p) => monthKeyFromDate(p.paid_at) === thisMonth)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const boardCount = (weekBoardJobs ?? []).filter((j) => isVisibleLantanaJob(j)).length;

  const workCards = [
    { label: "On the board", value: String(boardCount), hint: "This Sat–Fri week" },
    {
      label: "Last week gross",
      value: formatCurrency(lastWeekGross.total),
      hint: `Draw week ${lastWeekStart.slice(5)} – ${lastWeekEnd.slice(5)} · ${lastWeekJobs.length} lines`,
    },
    {
      label: "This week gross",
      value: formatCurrency(weekGross.total),
      hint:
        weekGross.unpriced > 0
          ? `${weekGross.priced} priced · ${weekGross.unpriced} open`
          : `${weekJobs.length} jobs`,
    },
    {
      label: "Month gross",
      value: formatCurrency(monthGross.total),
      hint:
        monthGross.unpriced > 0
          ? `${monthGross.priced} priced · ${monthGross.unpriced} open`
          : `${monthJobs.length} jobs`,
    },
  ];

  const cashCards = [
    {
      label: "YTD gross",
      value: formatCurrency(ytdGross.total),
      hint: `${thisYear} · ${ytdGross.priced} priced`,
    },
    {
      label: "Money received",
      value: formatCurrency(received),
      hint: `This month ${formatCurrency(monthReceived)}`,
    },
    {
      label: "Paid to crews",
      value: formatCurrency(paidOut),
      hint: `This month ${formatCurrency(monthPaidOut)}`,
    },
    {
      label: "Net cash",
      value: formatCurrency(net),
      hint:
        allGross.unpriced > 0
          ? `${allGross.unpriced} jobs still unpriced`
          : "Received − paid out",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-text-muted">Jobs, gross, and cash flow at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SyncSheetsButton source="all" label="Sync all" />
          <SyncSheetsButton source="board" weeks="all" label="Backfill board weeks" />
          <SyncSheetsButton source="invoices" label="Sync invoices" />
          <Link
            href="/admin/jobs"
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-navy-950 hover:bg-amber-400"
          >
            Add job
          </Link>
          <Link
            href="/admin/payments"
            className="rounded-full border border-border-default px-4 py-2 text-sm text-text-secondary hover:border-amber-500/40"
          >
            Log payment
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Work &amp; gross
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Cash &amp; year
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cashCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </div>
        </div>
      </div>

      <ThisWeekJobs jobs={allJobs} />
      <CurrentMonthJobs jobs={allJobs} />
      <PreviousMonthsJobs jobs={allJobs} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-raised p-5">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}
