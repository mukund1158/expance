import Link from "next/link";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { formatMoney, todayISO } from "@/lib/format";
import { RANGE_LABELS, resolveRange, type RangeKey } from "@/lib/dates";

// Presets that make sense for trends (no 7-day / custom noise here).
const PRESETS = [
  "this-month",
  "last-month",
  "last-3-months",
  "last-6-months",
  "this-year",
  "last-year",
] as const;
type Preset = (typeof PRESETS)[number];

function compactMoney(n: number, currency: "INR" | "USD"): string {
  const sym = currency === "INR" ? "₹" : "$";
  if (n >= 10_000_000) return `${sym}${(n / 10_000_000).toFixed(1)}cr`;
  if (n >= 100_000) return `${sym}${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `${sym}${(n / 1_000).toFixed(1)}k`;
  return `${sym}${Math.round(n)}`;
}

function BreakdownBars({
  rows,
  total,
  currency,
}: {
  rows: { label: string; value: number }[];
  total: number;
  currency: "INR" | "USD";
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{r.label}</span>
            <span className="amount shrink-0">
              {formatMoney(r.value, currency)}
              <span className="ml-1.5 text-xs text-ink-muted">
                {total > 0 ? Math.round((r.value / total) * 100) : 0}%
              </span>
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-line-soft">
            <div
              className="h-2 rounded-full bg-red"
              style={{ width: `${Math.max((r.value / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { space } = await requireMembership(id);
  const cur = space.baseCurrency;

  const rangeParam = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  const preset: Preset = PRESETS.includes(rangeParam as Preset)
    ? (rangeParam as Preset)
    : "last-6-months";
  const today = todayISO();
  const range = resolveRange(today, preset, undefined, undefined);

  const [entries, members, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        spaceId: id,
        deletedAt: null,
        date: {
          gte: new Date(`${range.from}T00:00:00.000Z`),
          lte: new Date(`${range.to}T00:00:00.000Z`),
        },
      },
      select: {
        date: true,
        type: true,
        amountBase: true,
        memberId: true,
        categoryId: true,
        paymentMethod: true,
      },
    }),
    prisma.spaceMember.findMany({
      where: { spaceId: id },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.category.findMany({
      where: { spaceId: id },
      select: { id: true, name: true },
    }),
  ]);

  // ---- Aggregate everything in one pass ----
  const monthKeys: string[] = [];
  {
    const end = range.to.slice(0, 7);
    const cursor = new Date(`${range.from.slice(0, 7)}-01T00:00:00.000Z`);
    while (cursor.toISOString().slice(0, 7) <= end) {
      monthKeys.push(cursor.toISOString().slice(0, 7));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }
  const monthly = new Map(
    monthKeys.map((k) => [k, { expense: 0, income: 0 }])
  );
  const byCategory = new Map<string, number>();
  const byMember = new Map<string, number>();
  const byMethod = new Map<string, number>();
  let spent = 0;
  let income = 0;

  for (const e of entries) {
    const amount = Number(e.amountBase);
    const monthEntry = monthly.get(e.date.toISOString().slice(0, 7));
    if (e.type === "INCOME") {
      income += amount;
      if (monthEntry) monthEntry.income += amount;
      continue;
    }
    spent += amount;
    if (monthEntry) monthEntry.expense += amount;
    byCategory.set(e.categoryId, (byCategory.get(e.categoryId) ?? 0) + amount);
    byMember.set(e.memberId, (byMember.get(e.memberId) ?? 0) + amount);
    byMethod.set(e.paymentMethod, (byMethod.get(e.paymentMethod) ?? 0) + amount);
  }

  const crossesYears =
    monthKeys.length > 0 &&
    monthKeys[0].slice(0, 4) !== monthKeys[monthKeys.length - 1].slice(0, 4);
  const monthLabel = (key: string) =>
    new Intl.DateTimeFormat("en-IN", {
      month: "short",
      ...(crossesYears ? { year: "2-digit" } : {}),
      timeZone: "UTC",
    }).format(new Date(`${key}-01T00:00:00.000Z`));

  const trend = monthKeys.map((k) => ({
    key: k,
    label: monthLabel(k),
    ...monthly.get(k)!,
  }));
  const trendMax = Math.max(...trend.map((t) => Math.max(t.expense, t.income)), 1);

  const categoryName = (cid: string) => categories.find((c) => c.id === cid)?.name ?? "?";
  const memberName = (uid: string) =>
    members.find((m) => m.userId === uid)?.user.name ?? "?";
  const METHOD_LABELS: Record<string, string> = {
    CREDIT_CARD: "Credit card",
    UPI: "UPI",
    CASH: "Cash",
    BANK: "Bank",
  };
  const toRows = (map: Map<string, number>, name: (k: string) => string) =>
    [...map.entries()]
      .map(([k, value]) => ({ label: name(k), value }))
      .sort((a, b) => b.value - a.value);

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-16">
      <header className="mb-4">
        <Link href={`/spaces/${id}`} className="text-sm text-ink-muted">
          ← {space.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Analytics</h1>
      </header>

      {/* Range presets — one scrollable line */}
      <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5">
        {PRESETS.map((key) => (
          <Link
            key={key}
            href={`/spaces/${id}/analytics?range=${key}`}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
              preset === key
                ? "border-red bg-red-tint text-red"
                : "border-line bg-paper-raised text-ink"
            }`}
          >
            {RANGE_LABELS[key as Exclude<RangeKey, "custom">]}
          </Link>
        ))}
      </div>

      {/* Headline numbers for the range */}
      <section className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-line bg-paper-raised p-3">
          <p className="text-xs text-ink-muted">Spent</p>
          <p className="amount mt-0.5 text-base font-semibold">
            {compactMoney(spent, cur)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-3">
          <p className="text-xs text-ink-muted">Income</p>
          <p className="amount mt-0.5 text-base font-semibold text-credit">
            {compactMoney(income, cur)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-3">
          <p className="text-xs text-ink-muted">Net</p>
          <p
            className={`amount mt-0.5 text-base font-semibold ${
              income - spent < 0 ? "text-red" : ""
            }`}
          >
            {compactMoney(income - spent, cur)}
          </p>
        </div>
      </section>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center">
          <p className="font-medium">Nothing to chart</p>
          <p className="mt-1 text-sm text-ink-muted">
            No entries in this period.
          </p>
        </div>
      ) : (
        <>
          {/* Month-by-month trend */}
          <section className="mb-6 rounded-xl border border-line bg-paper-raised p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="eyebrow">Month by month</h2>
              <div className="flex items-center gap-3 text-xs text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red" />
                  Spent
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-chart-income" />
                  Income
                </span>
              </div>
            </div>
            <div className="flex items-end gap-1 border-b border-line pb-px">
              {trend.map((t) => (
                <div key={t.key} className="flex flex-1 flex-col items-center">
                  <div className="flex h-28 w-full items-end justify-center gap-0.5">
                    <div
                      className="w-full max-w-4 rounded-t-[4px] bg-red"
                      style={{ height: `${Math.max((t.expense / trendMax) * 100, t.expense > 0 ? 2 : 0)}%` }}
                      aria-label={`${t.label} spent ${formatMoney(t.expense, cur)}`}
                    />
                    <div
                      className="w-full max-w-4 rounded-t-[4px] bg-chart-income"
                      style={{ height: `${Math.max((t.income / trendMax) * 100, t.income > 0 ? 2 : 0)}%` }}
                      aria-label={`${t.label} income ${formatMoney(t.income, cur)}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-1 pt-1.5">
              {trend.map((t) => (
                <div key={t.key} className="flex-1 text-center text-[10px] text-ink-muted">
                  {t.label}
                </div>
              ))}
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-ink-muted">
                View as table
              </summary>
              <table className="mt-2 w-full text-xs">
                <thead>
                  <tr className="text-left text-ink-muted">
                    <th className="py-1 font-medium">Month</th>
                    <th className="py-1 text-right font-medium">Spent</th>
                    <th className="py-1 text-right font-medium">Income</th>
                    <th className="py-1 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((t) => (
                    <tr key={t.key} className="border-t border-line-soft">
                      <td className="py-1">{t.label}</td>
                      <td className="amount py-1 text-right">
                        {formatMoney(t.expense, cur)}
                      </td>
                      <td className="amount py-1 text-right">
                        {formatMoney(t.income, cur)}
                      </td>
                      <td
                        className={`amount py-1 text-right ${
                          t.income - t.expense < 0 ? "text-red" : ""
                        }`}
                      >
                        {formatMoney(t.income - t.expense, cur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>

          {byCategory.size > 0 && (
            <section className="mb-6 rounded-xl border border-line bg-paper-raised p-4">
              <h2 className="eyebrow mb-3">Spending by category</h2>
              <BreakdownBars rows={toRows(byCategory, categoryName)} total={spent} currency={cur} />
            </section>
          )}

          {byMember.size > 1 && (
            <section className="mb-6 rounded-xl border border-line bg-paper-raised p-4">
              <h2 className="eyebrow mb-3">Spending by person</h2>
              <BreakdownBars rows={toRows(byMember, memberName)} total={spent} currency={cur} />
            </section>
          )}

          {byMethod.size > 0 && (
            <section className="mb-6 rounded-xl border border-line bg-paper-raised p-4">
              <h2 className="eyebrow mb-3">Spending by payment method</h2>
              <BreakdownBars
                rows={toRows(byMethod, (k) => METHOD_LABELS[k] ?? k)}
                total={spent}
                currency={cur}
              />
            </section>
          )}
        </>
      )}
    </main>
  );
}
