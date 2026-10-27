const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

export const formatINR = (n: number) => inr.format(n);

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Accepts "YYYY-MM-DD" (parsed as a local date) or an ISO timestamp.
export function formatDate(value: string) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return dateFmt.format(d);
}

export const formatRoute = (from: string | null, to: string | null) =>
  from || to ? `${from ?? "—"} → ${to ?? "—"}` : null;

const dayFmt = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "short",
});

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "Today", "Yesterday", or "Monday, 26 Oct" for a "YYYY-MM-DD" date. */
export function formatDay(value: string) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (value === isoDay(today)) return "Today";
  if (value === isoDay(yesterday)) return "Yesterday";
  return dayFmt.format(new Date(`${value}T00:00:00`));
}

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
