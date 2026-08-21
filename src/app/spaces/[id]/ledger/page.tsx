import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { formatDay, formatMoney, todayISO } from "@/lib/format";
import { RANGE_LABELS, resolveRange } from "@/lib/dates";
import { LedgerList } from "../LedgerList";
import { Filters } from "./Filters";

const MAX_ENTRIES = 300;

export default async function LedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { space } = await requireMembership(id);

  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const today = todayISO();
  const range = resolveRange(today, one(sp.range), one(sp.from), one(sp.to));
  const memberFilter = one(sp.member);
  const typeParam = one(sp.type);
  const typeFilter =
    typeParam === "EXPENSE" || typeParam === "INCOME" ? typeParam : undefined;

  const members = await prisma.spaceMember.findMany({
    where: { spaceId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  // Ignore a member param that isn't actually in this space.
  const member = members.find((m) => m.userId === memberFilter)?.userId;

  const where: Prisma.TransactionWhereInput = {
    spaceId: id,
    deletedAt: null,
    date: {
      gte: new Date(`${range.from}T00:00:00.000Z`),
      lte: new Date(`${range.to}T00:00:00.000Z`),
    },
    ...(member ? { memberId: member } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
  };

  const [entries, totals, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        category: { select: { name: true } },
        member: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: MAX_ENTRIES,
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where,
      _sum: { amountBase: true },
    }),
    prisma.transaction.count({ where }),
  ]);

  const cur = space.baseCurrency;
  const spent = Number(
    totals.find((t) => t.type === "EXPENSE")?._sum?.amountBase ?? 0
  );
  const income = Number(
    totals.find((t) => t.type === "INCOME")?._sum?.amountBase ?? 0
  );

  const rangeTitle =
    range.key === "custom"
      ? `${formatDay(new Date(`${range.from}T00:00:00.000Z`))} – ${formatDay(new Date(`${range.to}T00:00:00.000Z`))}`
      : RANGE_LABELS[range.key];

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-16">
      <header className="mb-4">
        <Link href={`/spaces/${id}`} className="text-sm text-ink-muted">
          ← {space.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Ledger</h1>
      </header>

      <Filters
        spaceId={id}
        members={members.map((m) => ({ userId: m.userId, name: m.user.name }))}
        rangeKey={range.key}
        from={range.from}
        to={range.to}
        member={member}
        type={typeFilter}
        today={today}
      />

      {/* Totals for the selection */}
      <section className="mb-6 rounded-xl border border-line bg-paper-raised p-4">
        <p className="eyebrow mb-3">
          {rangeTitle}
          {member ? ` · ${members.find((m) => m.userId === member)?.user.name}` : ""}
          {` · ${totalCount} ${totalCount === 1 ? "entry" : "entries"}`}
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-ink-muted">Spent</p>
            <p className="amount mt-0.5 text-sm font-semibold">
              {formatMoney(spent, cur)}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Income</p>
            <p className="amount mt-0.5 text-sm font-semibold text-credit">
              {formatMoney(income, cur)}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Net</p>
            <p
              className={`amount mt-0.5 text-sm font-semibold ${
                income - spent < 0 ? "text-red" : ""
              }`}
            >
              {formatMoney(income - spent, cur)}
            </p>
          </div>
        </div>
      </section>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center">
          <p className="font-medium">Nothing here</p>
          <p className="mt-1 text-sm text-ink-muted">
            No entries match these filters.
          </p>
        </div>
      ) : (
        <>
          <LedgerList spaceId={id} entries={entries} currency={cur} />
          {totalCount > MAX_ENTRIES && (
            <p className="mt-4 text-center text-xs text-ink-muted">
              Showing the {MAX_ENTRIES} most recent of {totalCount} entries —
              narrow the dates to see the rest.
            </p>
          )}
        </>
      )}
    </main>
  );
}
