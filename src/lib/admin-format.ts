export function formatCurrency(amount: number | null | undefined) {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatWorkKind(kind: string | null | undefined) {
  const value = String(kind ?? "").trim().toLowerCase();
  if (!value || value === "unknown") return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function emptyToNull(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export function parseAmount(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}
