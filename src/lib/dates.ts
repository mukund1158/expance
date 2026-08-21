// Date-range presets for ledger filtering. All math runs on the IST calendar
// date (YYYY-MM-DD strings), matching how transaction dates are stored.

export type RangeKey =
  | "last-7-days"
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "last-6-months"
  | "this-year"
  | "last-year"
  | "custom";

export const RANGE_LABELS: Record<Exclude<RangeKey, "custom">, string> = {
  "this-month": "This month",
  "last-month": "Last month",
  "last-7-days": "Last 7 days",
  "last-3-months": "Last 3 months",
  "last-6-months": "Last 6 months",
  "this-year": "This year",
  "last-year": "Last year",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Resolves a preset (or custom from/to) into an inclusive ISO date range.
 * Falls back to this-month when params are missing or malformed.
 */
export function resolveRange(
  today: string, // todayISO()
  range: string | undefined,
  from: string | undefined,
  to: string | undefined
): { key: RangeKey; from: string; to: string } {
  const year = today.slice(0, 4);
  const month = today.slice(0, 7);

  switch (range) {
    case "last-7-days":
      return { key: range, from: shiftDays(today, -6), to: today };
    case "last-month": {
      const firstOfThis = `${month}-01`;
      const lastOfPrev = shiftDays(firstOfThis, -1);
      return { key: range, from: `${lastOfPrev.slice(0, 7)}-01`, to: lastOfPrev };
    }
    case "last-3-months":
    case "last-6-months": {
      // Whole calendar months: N-1 previous months plus the current one.
      const back = range === "last-3-months" ? 2 : 5;
      const start = new Date(`${month}-01T00:00:00.000Z`);
      start.setUTCMonth(start.getUTCMonth() - back);
      return { key: range, from: start.toISOString().slice(0, 10), to: today };
    }
    case "this-year":
      return { key: range, from: `${year}-01-01`, to: today };
    case "last-year": {
      const prev = String(Number(year) - 1);
      return { key: range, from: `${prev}-01-01`, to: `${prev}-12-31` };
    }
    case "custom": {
      if (from && to && ISO_DATE.test(from) && ISO_DATE.test(to) && from <= to) {
        return { key: "custom", from, to };
      }
      break; // malformed custom -> default
    }
  }
  return { key: "this-month", from: `${month}-01`, to: today };
}
