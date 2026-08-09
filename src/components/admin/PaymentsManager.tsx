"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/admin-format";
import type { CrewMember, Job, PaymentIn, PaymentOut } from "@/lib/admin-types";

const PAYMENT_METHODS = ["Zelle", "ACH", "Check", "Cash", "Other"] as const;

type PaymentInRow = PaymentIn & { jobs?: { title: string } | null };
type PaymentOutRow = PaymentOut & {
  jobs?: { title: string } | null;
  crew_members?: { name: string } | null;
};

export function PaymentsManager({
  jobs,
  crew,
  initialIn,
  initialOut,
}: {
  jobs: Job[];
  crew: CrewMember[];
  initialIn: PaymentInRow[];
  initialOut: PaymentOutRow[];
}) {
  const router = useRouter();
  const [paymentsIn, setPaymentsIn] = useState(initialIn);
  const [paymentsOut, setPaymentsOut] = useState(initialOut);
  const [tab, setTab] = useState<"in" | "out">("out");
  const [saving, setSaving] = useState(false);
  const [outCrewId, setOutCrewId] = useState("");
  const [outMethod, setOutMethod] = useState<string>("Zelle");

  const selectedCrew = crew.find((c) => c.id === outCrewId) ?? null;
  const zelleHint = selectedCrew
    ? [selectedCrew.phone, selectedCrew.email].filter(Boolean).join(" · ") || null
    : null;

  async function handleCreateIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/payments-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: formData.get("amount"),
          job_id: formData.get("job_id") || null,
          received_at: formData.get("received_at"),
          method: formData.get("method"),
          notes: formData.get("notes"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error ?? "Could not save payment");
        return;
      }
      setPaymentsIn((prev) => [result.payment, ...prev]);
      event.currentTarget.reset();
      toast.success("Payment received logged");
      router.refresh();
    } catch {
      toast.error("Could not save payment");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateOut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const formData = new FormData(event.currentTarget);
    const method = String(formData.get("method") || "Zelle");
    let notes = String(formData.get("notes") || "").trim();
    if (method === "Zelle" && zelleHint && selectedCrew) {
      const stamp = `Zelle → ${selectedCrew.name} (${zelleHint})`;
      if (!notes.includes(stamp)) {
        notes = notes ? `${notes}\n${stamp}` : stamp;
      }
    }

    try {
      const response = await fetch("/api/admin/payments-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: formData.get("amount"),
          job_id: formData.get("job_id") || null,
          crew_member_id: formData.get("crew_member_id") || null,
          paid_at: formData.get("paid_at"),
          method,
          notes: notes || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error ?? "Could not save payout");
        return;
      }
      setPaymentsOut((prev) => [result.payment, ...prev]);
      event.currentTarget.reset();
      setOutCrewId("");
      setOutMethod("Zelle");
      toast.success("Crew payout logged");
      router.refresh();
    } catch {
      toast.error("Could not save payout");
    } finally {
      setSaving(false);
    }
  }

  async function deleteIn(id: string) {
    if (!confirm("Delete this payment?")) return;
    const response = await fetch(`/api/admin/payments-in/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete");
      return;
    }
    setPaymentsIn((prev) => prev.filter((p) => p.id !== id));
    toast.success("Deleted");
    router.refresh();
  }

  async function deleteOut(id: string) {
    if (!confirm("Delete this payout?")) return;
    const response = await fetch(`/api/admin/payments-out/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete");
      return;
    }
    setPaymentsOut((prev) => prev.filter((p) => p.id !== id));
    toast.success("Deleted");
    router.refresh();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Payments</h1>
        <p className="mt-1 text-text-muted">
          Log money in from clients and Zelle / other payouts to crews. Sending still happens in your
          bank app — this keeps the books.
        </p>
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === "in"} onClick={() => setTab("in")}>
          Money in
        </TabButton>
        <TabButton active={tab === "out"} onClick={() => setTab("out")}>
          Money out
        </TabButton>
      </div>

      {tab === "in" ? (
        <>
          <form
            onSubmit={handleCreateIn}
            className="grid gap-4 rounded-xl border border-border-default bg-bg-raised p-6 md:grid-cols-2"
          >
            <Input label="Amount" name="amount" type="number" step="0.01" required />
            <Input label="Received date" name="received_at" type="date" defaultValue={today} required />
            <JobSelect jobs={jobs} />
            <MethodSelect name="method" defaultValue="ACH" />
            <div className="md:col-span-2">
              <label className="block text-sm text-text-muted">Notes</label>
              <textarea
                name="notes"
                rows={2}
                className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-navy-950 disabled:opacity-70 md:col-span-2 md:w-fit"
            >
              {saving ? "Saving…" : "Log payment received"}
            </button>
          </form>

          <PaymentTable
            empty="No incoming payments yet."
            rows={paymentsIn.map((p) => ({
              id: p.id,
              primary: formatCurrency(p.amount),
              secondary: p.jobs?.title ?? "No job linked",
              date: formatDate(p.received_at),
              method: p.method ?? "—",
            }))}
            onDelete={deleteIn}
          />
        </>
      ) : (
        <>
          <form
            onSubmit={handleCreateOut}
            className="grid gap-4 rounded-xl border border-border-default bg-bg-raised p-6 md:grid-cols-2"
          >
            <Input label="Amount" name="amount" type="number" step="0.01" required />
            <Input label="Paid date" name="paid_at" type="date" defaultValue={today} required />
            <JobSelect jobs={jobs} />
            <div>
              <label className="block text-sm text-text-muted">Crew member</label>
              <select
                name="crew_member_id"
                value={outCrewId}
                onChange={(e) => setOutCrewId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {crew
                  .filter((c) => c.active)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <MethodSelect name="method" value={outMethod} onChange={setOutMethod} />
            {outMethod === "Zelle" && (
              <div className="rounded-lg border border-border-subtle bg-bg-form px-3 py-2 text-sm text-text-secondary md:col-span-2">
                {selectedCrew && zelleHint ? (
                  <>
                    Send Zelle to <span className="font-medium text-text-primary">{selectedCrew.name}</span>
                    : {zelleHint}
                    <span className="mt-1 block text-xs text-text-muted">
                      Open your bank app → Zelle, then log the payout here.
                    </span>
                  </>
                ) : selectedCrew ? (
                  <>
                    No phone/email on {selectedCrew.name} yet — add it under Crew so Zelle recipients
                    show up here.
                  </>
                ) : (
                  <>Select a crew member to see their Zelle phone/email from the Crew list.</>
                )}
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm text-text-muted">Notes</label>
              <textarea
                name="notes"
                rows={2}
                className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-navy-950 disabled:opacity-70 md:col-span-2 md:w-fit"
            >
              {saving ? "Saving…" : "Log Zelle / crew payout"}
            </button>
          </form>

          <PaymentTable
            empty="No crew payouts yet."
            rows={paymentsOut.map((p) => ({
              id: p.id,
              primary: formatCurrency(p.amount),
              secondary: `${p.crew_members?.name ?? "Unassigned"} · ${p.jobs?.title ?? "No job"}`,
              date: formatDate(p.paid_at),
              method: p.method ?? "—",
            }))}
            onDelete={deleteOut}
          />
        </>
      )}
    </div>
  );
}

function MethodSelect({
  name,
  defaultValue = "Zelle",
  value,
  onChange,
}: {
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const controlled = value != null && onChange != null;
  return (
    <div>
      <label className="block text-sm text-text-muted">Method</label>
      <select
        name={name}
        {...(controlled
          ? {
              value,
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value),
            }
          : { defaultValue })}
        className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm"
      >
        {PAYMENT_METHODS.map((method) => (
          <option key={method} value={method}>
            {method}
          </option>
        ))}
      </select>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm ${
        active
          ? "bg-amber-500/15 font-medium text-amber-700 dark:text-amber-400"
          : "border border-border-default text-text-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function Input(props: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-text-muted">{props.label}</label>
      <input
        name={props.name}
        type={props.type ?? "text"}
        step={props.step}
        required={props.required}
        placeholder={props.placeholder}
        defaultValue={props.defaultValue}
        className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm"
      />
    </div>
  );
}

function JobSelect({ jobs }: { jobs: Job[] }) {
  return (
    <div>
      <label className="block text-sm text-text-muted">Related job</label>
      <select
        name="job_id"
        className="mt-1.5 w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm"
      >
        <option value="">None</option>
        {jobs.map((job) => (
          <option key={job.id} value={job.id}>
            {job.title}
          </option>
        ))}
      </select>
    </div>
  );
}

function PaymentTable({
  rows,
  empty,
  onDelete,
}: {
  rows: { id: string; primary: string; secondary: string; date: string; method: string }[];
  empty: string;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-bg-raised">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-bg-form text-text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Details</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Method</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-text-muted">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border-subtle">
                  <td className="px-5 py-3 font-medium">{row.primary}</td>
                  <td className="px-5 py-3 text-text-secondary">{row.secondary}</td>
                  <td className="px-5 py-3 text-text-muted">{row.date}</td>
                  <td className="px-5 py-3 text-text-secondary">{row.method}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      className="text-xs text-red-600 dark:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
