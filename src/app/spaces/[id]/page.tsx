import Link from "next/link";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { formatDay, formatMoney, todayISO } from "@/lib/format";
import { LedgerList } from "./LedgerList";
import { SpaceMenu } from "./SpaceMenu";

function BreakdownBars({
  rows,
  currency,
}: {
  rows: { label: string; value: number }[];
  currency: "INR" | "USD";
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{r.label}</span>
            <span className="amount shrink-0">{formatMoney(r.value, currency)}</span>
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

export default async function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership, space } = await requireMembership(id);

  const today = todayISO();
  const monthKey = today.slice(0, 7);
  const monthStart = new Date(`${monthKey}-01T00:00:00.000Z`);
  const sevenDaysAgo = new Date(`${today}T00:00:00.000Z`);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthStart);

  const monthExpenseWhere = {
    spaceId: id,
    deletedAt: null,
    type: "EXPENSE" as const,
    date: { gte: monthStart },
  };

  const [
    members,
    transactions,
    settlements,
    monthTotals,
    monthByMember,
    monthByCategory,
    creditCardMonth,
    monthBudgets,
    allExpenses,
    allTimeTotals,
  ] = await Promise.all([
    prisma.spaceMember.findMany({
      where: { spaceId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.findMany({
      where: { spaceId: id, deletedAt: null, date: { gte: sevenDaysAgo } },
      include: {
        category: { select: { name: true } },
        member: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.settlement.findMany({
      where: { spaceId: id, deletedAt: null },
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { spaceId: id, deletedAt: null, date: { gte: monthStart } },
      _sum: { amountBase: true },
    }),
    prisma.transaction.groupBy({
      by: ["memberId"],
      where: monthExpenseWhere,
      _sum: { amountBase: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: monthExpenseWhere,
      _sum: { amountBase: true },
    }),
    prisma.transaction.aggregate({
      where: { ...monthExpenseWhere, paymentMethod: "CREDIT_CARD" },
      _sum: { amountBase: true },
    }),
    prisma.budget.findMany({
      where: { spaceId: id, month: monthStart },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.transaction.groupBy({
      by: ["memberId"],
      where: { spaceId: id, deletedAt: null, type: "EXPENSE" },
      _sum: { amountBase: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { spaceId: id, deletedAt: null },
      _sum: { amountBase: true },
    }),
  ]);

  const categories = await prisma.category.findMany({
    where: { spaceId: id },
    select: { id: true, name: true },
  });
  const categoryName = (cid: string) =>
    categories.find((c) => c.id === cid)?.name ?? "?";
  const memberName = (uid: string) =>
    members.find((m) => m.userId === uid)?.user.name ?? "?";

  const cur = space.baseCurrency;
  const monthSpent = Number(
    monthTotals.find((t) => t.type === "EXPENSE")?._sum.amountBase ?? 0
  );
  const monthIncome = Number(
    monthTotals.find((t) => t.type === "INCOME")?._sum.amountBase ?? 0
  );
  const ccSpent = Number(creditCardMonth._sum.amountBase ?? 0);

  const memberBars = monthByMember
    .map((r) => ({
      label: memberName(r.memberId),
      value: Number(r._sum.amountBase ?? 0),
    }))
    .sort((a, b) => b.value - a.value);
  const categoryBars = monthByCategory
    .map((r) => ({
      label: categoryName(r.categoryId),
      value: Number(r._sum.amountBase ?? 0),
    }))
    .sort((a, b) => b.value - a.value);

  // Spent per category this month, for budget meters.
  const spentByCategory = new Map(
    monthByCategory.map((r) => [r.categoryId, Number(r._sum.amountBase ?? 0)])
  );
  const budgetRows = monthBudgets
    .map((b) => ({
      label: b.category?.name ?? "Overall",
      budget: Number(b.amount),
      spent: b.category ? (spentByCategory.get(b.category.id) ?? 0) : monthSpent,
      overall: !b.category,
    }))
    .sort((a, b) => Number(b.overall) - Number(a.overall) || b.budget - a.budget);

  // All-time profit (project spaces): income minus expenses, split by share.
  const allTimeIncome = Number(
    allTimeTotals.find((t) => t.type === "INCOME")?._sum?.amountBase ?? 0
  );
  const allTimeExpense = Number(
    allTimeTotals.find((t) => t.type === "EXPENSE")?._sum?.amountBase ?? 0
  );
  const profit = allTimeIncome - allTimeExpense;

  // Contribution balance (project spaces): what each member has paid vs the
  // share they're responsible for, adjusted by settlements. Positive = is owed.
  const totalExpenses = allExpenses.reduce(
    (sum, row) => sum + Number(row._sum.amountBase ?? 0),
    0
  );
  const balances = members.map((m) => {
    const paid = Number(
      allExpenses.find((r) => r.memberId === m.userId)?._sum.amountBase ?? 0
    );
    const owedShare = (Number(m.sharePercent) / 100) * totalExpenses;
    const settled = settlements.reduce((sum, s) => {
      if (s.fromUserId === m.userId) return sum + Number(s.amount);
      if (s.toUserId === m.userId) return sum - Number(s.amount);
      return sum;
    }, 0);
    return { member: m, net: paid - owedShare + settled };
  });

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-28">
      <header className="mb-6">
        <Link href="/" className="text-sm text-ink-muted">
          ← All spaces
        </Link>
        <div className="spine mt-2 flex items-start justify-between gap-3 rounded-r-xl border border-line bg-paper-raised p-4">
          <div>
            <p className="eyebrow">
              {space.type === "PROJECT" ? "Project" : "Personal"} · {cur}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{space.name}</h1>
          </div>
          <SpaceMenu
            spaceId={id}
            spaceName={space.name}
            isOwner={membership.role === "OWNER"}
          />
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-paper-raised p-4">
          <p className="eyebrow">Spent · {monthLabel.split(" ")[0]}</p>
          <p className="amount mt-1 text-xl font-semibold">
            {formatMoney(monthSpent, cur)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-4">
          <p className="eyebrow">Income · {monthLabel.split(" ")[0]}</p>
          <p className="amount mt-1 text-xl font-semibold text-credit">
            {formatMoney(monthIncome, cur)}
          </p>
        </div>
        <div className="col-span-2 flex items-baseline justify-between rounded-xl border border-line bg-paper-raised px-4 py-3">
          <p className="eyebrow">On credit card this month</p>
          <p className="amount font-semibold">{formatMoney(ccSpent, cur)}</p>
        </div>
      </section>

      {space.type === "PERSONAL" && (
        <section className="mb-6 rounded-xl border border-line bg-paper-raised p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="eyebrow">Budgets · {monthLabel}</h2>
            <Link href={`/spaces/${id}/budgets`} className="btn-quiet">
              {budgetRows.length === 0 ? "Set budgets" : "Edit"}
            </Link>
          </div>
          {budgetRows.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Set monthly limits to see problems on the 18th, not the 31st.
            </p>
          ) : (
            <ul className="space-y-3">
              {budgetRows.map((b) => {
                const over = b.spent > b.budget;
                const pct = Math.min((b.spent / b.budget) * 100, 100);
                return (
                  <li key={b.label}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className={`truncate ${b.overall ? "font-semibold" : "font-medium"}`}>
                        {b.label}
                      </span>
                      <span className="amount shrink-0 text-xs">
                        {over ? (
                          <strong className="text-red">
                            over by {formatMoney(b.spent - b.budget, cur)}
                          </strong>
                        ) : (
                          <>
                            {formatMoney(b.spent, cur)}{" "}
                            <span className="text-ink-muted">
                              of {formatMoney(b.budget, cur)}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-line-soft">
                      <div
                        className={`h-2 rounded-full ${over ? "bg-red" : "bg-ink-muted"}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {memberBars.length > 0 && members.length > 1 && (
        <section className="mb-6 rounded-xl border border-line bg-paper-raised p-4">
          <h2 className="eyebrow mb-3">Who spent · {monthLabel}</h2>
          <BreakdownBars rows={memberBars} currency={cur} />
        </section>
      )}

      {categoryBars.length > 0 && (
        <section className="mb-6 rounded-xl border border-line bg-paper-raised p-4">
          <h2 className="eyebrow mb-3">By category · {monthLabel}</h2>
          <BreakdownBars rows={categoryBars} currency={cur} />
        </section>
      )}

      {space.type === "PROJECT" && (
        <section className="mb-6 rounded-xl border border-line bg-paper-raised p-4">
          <h2 className="eyebrow mb-3">Profit · all time</h2>
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-ink-muted">
              {formatMoney(allTimeIncome, cur)} in −{" "}
              {formatMoney(allTimeExpense, cur)} out
            </p>
            <p
              className={`amount text-xl font-semibold ${
                profit > 0 ? "text-credit" : profit < 0 ? "text-red" : ""
              }`}
            >
              {formatMoney(profit, cur)}
            </p>
          </div>
          {members.length > 1 && (
            <ul className="mt-3 space-y-1.5 border-t border-line-soft pt-3">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-baseline justify-between text-sm"
                >
                  <span className="font-medium">
                    {m.user.name}
                    <span className="ml-1.5 text-xs text-ink-muted">
                      {Number(m.sharePercent)}%
                    </span>
                  </span>
                  <span className="amount">
                    {formatMoney((profit * Number(m.sharePercent)) / 100, cur)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {space.type === "PROJECT" && members.length > 1 && (
        <section className="mb-6 rounded-xl border border-line bg-paper-raised p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="eyebrow">Contribution balance</h2>
            <Link href={`/spaces/${id}/settle`} className="btn-quiet">
              Settle up
            </Link>
          </div>
          <ul className="space-y-2">
            {balances.map(({ member, net }) => (
              <li
                key={member.id}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="font-medium">
                  {member.user.name}
                  <span className="ml-1.5 text-xs text-ink-muted">
                    {Number(member.sharePercent)}%
                  </span>
                </span>
                <span
                  className={`amount font-semibold ${
                    net >= 0.005 ? "text-credit" : net <= -0.005 ? "text-red" : "text-ink-muted"
                  }`}
                >
                  {Math.abs(net) < 0.005
                    ? "settled"
                    : net > 0
                      ? `is owed ${formatMoney(net, cur)}`
                      : `owes ${formatMoney(-net, cur)}`}
                </span>
              </li>
            ))}
          </ul>
          {settlements.length > 0 && (
            <div className="mt-4 border-t border-line-soft pt-3">
              <p className="eyebrow mb-2">Recent settlements</p>
              <ul className="space-y-1.5">
                {settlements.slice(0, 3).map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/spaces/${id}/settle/${s.id}`}
                      className="flex items-baseline justify-between gap-3 text-xs text-ink-muted"
                    >
                      <span>
                        {s.fromUser.name} → {s.toUser.name} · {formatDay(s.date)}
                      </span>
                      <span className="amount">{formatMoney(s.amount, cur)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="eyebrow">Ledger · last 7 days</h2>
          <Link href={`/spaces/${id}/ledger`} className="btn-quiet">
            View all
          </Link>
        </div>
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="font-medium">Nothing in the last 7 days</p>
            <p className="mt-1 text-sm text-ink-muted">
              Add an entry below, or open View all for older ones.
            </p>
          </div>
        ) : (
          <LedgerList spaceId={id} entries={transactions} currency={cur} />
        )}
      </section>

      <Link
        href={`/spaces/${id}/add`}
        className="btn-primary fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full px-6 py-3 shadow-lg"
      >
        + Add entry
      </Link>
    </main>
  );
}
