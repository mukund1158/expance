import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { todayISO } from "@/lib/format";
import { TransactionForm } from "../../add/TransactionForm";
import { DeleteButton } from "./DeleteButton";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string; txId: string }>;
}) {
  const { id, txId } = await params;
  const { session, space } = await requireMembership(id);

  const [tx, categories, members] = await Promise.all([
    prisma.transaction.findFirst({
      where: { id: txId, spaceId: id, deletedAt: null },
    }),
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
  if (!tx) notFound();

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-16">
      <header className="mb-6">
        <Link href={`/spaces/${id}`} className="text-sm text-ink-muted">
          ← {space.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Edit entry</h1>
      </header>

      <TransactionForm
        spaceId={id}
        categories={categories}
        members={members.map((m) => ({ userId: m.user.id, name: m.user.name }))}
        selfId={session.user.id}
        baseCurrency={space.baseCurrency}
        today={todayISO()}
        edit={{
          txId: tx.id,
          type: tx.type,
          amount: Number(tx.amountOriginal).toString(),
          currency: tx.currency,
          categoryId: tx.categoryId,
          memberId: tx.memberId,
          paymentMethod: tx.paymentMethod,
          date: tx.date.toISOString().slice(0, 10),
          note: tx.note ?? "",
          hasReceipt: Boolean(tx.receiptPath),
        }}
      />

      <DeleteButton txId={tx.id} spaceId={id} />
    </main>
  );
}
