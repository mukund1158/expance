import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { todayISO } from "@/lib/format";
import { SettlementForm } from "../SettlementForm";
import { DeleteSettlementButton } from "./DeleteSettlementButton";

export default async function EditSettlementPage({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}) {
  const { id, sid } = await params;
  const { session, space } = await requireMembership(id);

  const [settlement, members] = await Promise.all([
    prisma.settlement.findFirst({
      where: { id: sid, spaceId: id, deletedAt: null },
    }),
    prisma.spaceMember.findMany({
      where: { spaceId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!settlement) notFound();

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-16">
      <header className="mb-6">
        <Link href={`/spaces/${id}`} className="text-sm text-ink-muted">
          ← {space.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Edit settlement
        </h1>
      </header>

      <SettlementForm
        spaceId={id}
        members={members.map((m) => ({ userId: m.user.id, name: m.user.name }))}
        defaultFromId={session.user.id}
        defaultToId={session.user.id}
        currencyLabel={space.baseCurrency}
        today={todayISO()}
        edit={{
          settlementId: settlement.id,
          fromUserId: settlement.fromUserId,
          toUserId: settlement.toUserId,
          amount: Number(settlement.amount).toString(),
          date: settlement.date.toISOString().slice(0, 10),
          note: settlement.note ?? "",
        }}
      />

      <DeleteSettlementButton settlementId={settlement.id} spaceId={id} />
    </main>
  );
}
