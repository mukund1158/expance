import Link from "next/link";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { todayISO } from "@/lib/format";
import { TransactionForm } from "./TransactionForm";

export default async function AddEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, space } = await requireMembership(id);

  const [categories, members] = await Promise.all([
    prisma.category.findMany({
      where: { spaceId: id },
      select: { id: true, name: true, kind: true },
      orderBy: { name: "asc" },
    }),
    prisma.spaceMember.findMany({
      where: { spaceId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-16">
      <header className="mb-6">
        <Link href={`/spaces/${id}`} className="text-sm text-ink-muted">
          ← {space.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">New entry</h1>
      </header>

      <TransactionForm
        spaceId={id}
        categories={categories}
        members={members.map((m) => ({ userId: m.user.id, name: m.user.name }))}
        selfId={session.user.id}
        baseCurrency={space.baseCurrency}
        today={todayISO()}
      />
    </main>
  );
}
