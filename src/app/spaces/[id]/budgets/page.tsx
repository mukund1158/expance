import Link from "next/link";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { todayISO } from "@/lib/format";
import { BudgetForm } from "./BudgetForm";

export default async function BudgetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { space } = await requireMembership(id);

  const month = todayISO().slice(0, 7); // YYYY-MM
  const monthDate = new Date(`${month}-01T00:00:00.000Z`);
  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthDate);

  const [categories, budgets] = await Promise.all([
    prisma.category.findMany({
      where: { spaceId: id, kind: "EXPENSE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.budget.findMany({
      where: { spaceId: id, month: monthDate },
    }),
  ]);

  const amountFor = (categoryId: string | null) => {
    const b = budgets.find((x) => x.categoryId === categoryId);
    return b ? Number(b.amount).toString() : "";
  };

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-16">
      <header className="mb-6">
        <Link href={`/spaces/${id}`} className="text-sm text-ink-muted">
          ← {space.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Budgets</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Monthly limits in {space.baseCurrency}, tracked as the month goes —
          not after it&apos;s over.
        </p>
      </header>

      <BudgetForm
        spaceId={id}
        month={month}
        monthLabel={monthLabel}
        rows={[
          { categoryId: null, name: "Overall (whole month)", amount: amountFor(null) },
          ...categories.map((c) => ({
            categoryId: c.id,
            name: c.name,
            amount: amountFor(c.id),
          })),
        ]}
      />
    </main>
  );
}
