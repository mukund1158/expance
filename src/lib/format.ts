const formatters: Record<string, Intl.NumberFormat> = {
  // en-IN gives Indian digit grouping: ₹1,23,456.00
  INR: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
};

export function formatMoney(
  value: number | string | { toString(): string },
  currency: "INR" | "USD"
): string {
  const n = Number(value.toString());
  return (formatters[currency] ?? formatters.INR).format(n);
}

export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC", // @db.Date values are midnight UTC — keep the calendar day stable
  }).format(date);
}

export function todayISO(): string {
  // Date in IST — entering an expense at 1am should not land on yesterday.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}
