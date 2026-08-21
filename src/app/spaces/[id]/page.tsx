import Link from "next/link";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { formatDay, formatMoney, todayISO } from "@/lib/format";
import { AddMemberForm } from "./AddMemberForm";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, membership, space } = await requireMembership(id);

  const monthStart = new Date(`${todayISO().slice(0, 7)}-01T00:00:00.000Z`);

  const [members, transactions, settlements, monthTotals] = await Promise.all([
    prisma.spaceMember.findMany({
      where: { spaceId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.findMany({
      where: { spaceId: id, deletedAt: null },
      include: {
        category: { select: { name: true } },
        member: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.settlement.findMany({
      where: { spaceId: id, deletedAt: null },
      select: { fromUserId: true, toUserId: true, amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { spaceId: id, deletedAt: null, date: { gte: monthStart } },
      _sum: { amountBase: true },
    }),
  ]);

  const cur = space.baseCurrency;
  const monthSpent = Number(
    monthTotals.find((t) => t.type === "EXPENSE")?._sum.amountBase ?? 0
  );
  const monthIncome = Number(
    monthTotals.find((t) => t.type === "INCOME")?._sum.amountBase ?? 0
  );

  // Contribution balance (project spaces): what each member has paid vs the
  // share they're responsible for, adjusted by settlements. Positive = is owed.
  const allExpenses = await prisma.transaction.groupBy({
    by: ["memberId"],
    where: { spaceId: id, deletedAt: null, type: "EXPENSE" },
    _sum: { amountBase: true },
  });
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

  // Group the ledger by day.
  const byDay = new Map<string, typeof transactions>();
  for (const t of transactions) {
    const key = t.date.toISOString().slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(t);
    byDay.set(key, list);
  }

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-28">
      <header className="mb-6">
        <Link href="/" className="text-sm text-ink-muted">
          ← All spaces
        </Link>
        <div className="spine mt-2 rounded-r-xl border border-line bg-paper-raised p-4">
          <p className="eyebrow">
            {space.type === "PROJECT" ? "Project" : "Personal"} · {cur}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{space.name}</h1>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-paper-raised p-4">
          <p className="eyebrow">Spent this month</p>
          <p className="amount mt-1 text-xl font-semibold">
            {formatMoney(monthSpent, cur)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-4">
          <p className="eyebrow">Income this month</p>
          <p className="amount mt-1 text-xl font-semibold text-credit">
            {formatMoney(monthIncome, cur)}
          </p>
        </div>
      </section>

      {space.type === "PROJECT" && members.length > 1 && (
        <section className="mb-6 rounded-xl border border-line bg-paper-raised p-4">
          <h2 className="eyebrow mb-3">Contribution balance</h2>
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
        </section>
      )}

      <section className="mb-8">
        <h2 className="eyebrow mb-3">Ledger</h2>
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="font-medium">No entries yet</p>
            <p className="mt-1 text-sm text-ink-muted">
              Add the first expense or income below.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {[...byDay.entries()].map(([day, list]) => (
              <div key={day}>
                <p className="mb-1.5 text-xs font-semibold text-ink-muted">
                  {formatDay(list[0].date)}
                </p>
                <ul className="divide-y divide-line-soft rounded-xl border border-line bg-paper-raised">
                  {list.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {t.note || t.category.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-muted">
                          {t.category.name} · {t.member.name} ·{" "}
                          {t.paymentMethod.replace("_", " ").toLowerCase()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`amount text-sm font-semibold ${
                            t.type === "INCOME" ? "text-credit" : ""
                          }`}
                        >
                          {t.type === "INCOME" ? "+" : "−"}
                          {formatMoney(t.amountBase, cur)}
                        </p>
                        {t.currency !== cur && (
                          <p className="amount text-xs text-ink-muted">
                            {formatMoney(t.amountOriginal, t.currency)}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-3">Members</h2>
        <ul className="divide-y divide-line-soft rounded-xl border border-line bg-paper-raised">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between p-3 text-sm">
              <span className="font-medium">
                {m.user.name}
                {m.user.id === session.user.id && (
                  <span className="ml-1.5 text-xs text-ink-muted">(you)</span>
                )}
              </span>
              <span className="text-xs text-ink-muted">
                {m.role === "OWNER" ? "Owner" : "Member"}
                {space.type === "PROJECT" && ` · ${Number(m.sharePercent)}%`}
              </span>
            </li>
          ))}
        </ul>
        {membership.role === "OWNER" && <AddMemberForm spaceId={id} />}
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
