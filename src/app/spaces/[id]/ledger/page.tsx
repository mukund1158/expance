import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { formatDay, formatMoney, todayISO } from "@/lib/format";
import { RANGE_LABELS, resolveRange } from "@/lib/dates";
import { LedgerList } from "../LedgerList";

const MAX_ENTRIES = 300;

const chipBase =
  "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors";
const chipIdle = "border-line bg-paper-raised text-ink";
const chipActive = "border-red bg-red-tint text-red";

function chip(active: boolean) {
  return `${chipBase} ${active ? chipActive : chipIdle}`;
}

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

  // Link that changes one filter and keeps the rest.
  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      range: range.key,
      from: range.key === "custom" ? range.from : undefined,
      to: range.key === "custom" ? range.to : undefined,
      member,
      type: typeFilter,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return `/spaces/${id}/ledger${s ? `?${s}` : ""}`;
  };

  const rangeTitle =
    range.key === "custom"
      ? `${formatDay(new Date(`${range.from}T00:00:00.000Z`))} – ${formatDay(new Date(`${range.to}T00:00:00.000Z`))}`
      : RANGE_LABELS[range.key];

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-16">
      <header className="mb-5">
        <Link href={`/spaces/${id}`} className="text-sm text-ink-muted">
          ← {space.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Ledger</h1>
      </header>

      {/* Date range */}
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(RANGE_LABELS) as (keyof typeof RANGE_LABELS)[]).map(
          (key) => (
            <Link
              key={key}
              href={href({ range: key, from: undefined, to: undefined })}
              className={chip(range.key === key)}
            >
              {RANGE_LABELS[key]}
            </Link>
          )
        )}
      </div>

      {/* Custom range */}
      <details className="mb-3" open={range.key === "custom"}>
        <summary
          className={`${chip(range.key === "custom")} cursor-pointer list-none`}
        >
          Custom dates
        </summary>
        <form method="GET" className="mt-3 flex items-end gap-2">
          <input type="hidden" name="range" value="custom" />
          {member && <input type="hidden" name="member" value={member} />}
          {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
          <div className="flex-1">
            <label htmlFor="from" className="label">
              From
            </label>
            <input
              id="from"
              name="from"
              type="date"
              required
              max={today}
              defaultValue={range.key === "custom" ? range.from : ""}
              className="field"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="to" className="label">
              To
            </label>
            <input
              id="to"
              name="to"
              type="date"
              required
              max={today}
              defaultValue={range.key === "custom" ? range.to : ""}
              className="field"
            />
          </div>
          <button type="submit" className="btn-primary shrink-0">
            Apply
          </button>
        </form>
      </details>

      {/* Member + type filters */}
      {members.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <Link href={href({ member: undefined })} className={chip(!member)}>
            Everyone
          </Link>
          {members.map((m) => (
            <Link
              key={m.userId}
              href={href({ member: m.userId })}
              className={chip(member === m.userId)}
            >
              {m.user.name}
            </Link>
          ))}
        </div>
      )}
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href={href({ type: undefined })} className={chip(!typeFilter)}>
          All entries
        </Link>
        <Link
          href={href({ type: "EXPENSE" })}
          className={chip(typeFilter === "EXPENSE")}
        >
          Expenses
        </Link>
        <Link
          href={href({ type: "INCOME" })}
          className={chip(typeFilter === "INCOME")}
        >
          Income
        </Link>
      </div>

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
