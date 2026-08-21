// USD -> INR reference rates from the Frankfurter API (ECB data, no API key).
// The rate is fetched once per transaction and stored permanently on the row,
// so historical reports never change when rates move.

const FX_API = "https://api.frankfurter.dev/v1";

/**
 * Rate for converting `from` currency into `to` currency on a given date.
 * Weekends/holidays return the last available business-day rate.
 * Throws on network/API failure — callers should let the user enter a rate
 * manually rather than silently guessing one.
 */
export async function getFxRate(
  date: string, // YYYY-MM-DD
  from: string,
  to: string
): Promise<number> {
  if (from === to) return 1;

  const res = await fetch(`${FX_API}/${date}?base=${from}&symbols=${to}`, {
    // Historical rates are immutable — cache them.
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) {
    throw new Error(`FX rate lookup failed: ${res.status}`);
  }
  const data = (await res.json()) as { rates?: Record<string, number> };
  const rate = data.rates?.[to];
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`FX rate missing for ${from} -> ${to} on ${date}`);
  }
  return rate;
}
