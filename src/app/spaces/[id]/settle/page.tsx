import Link from "next/link";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { todayISO } from "@/lib/format";
import { SettlementForm } from "./SettlementForm";

export default async function SettlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, space } = await requireMembership(id);

  const members = await prisma.spaceMember.findMany({
    where: { spaceId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Default receiver: the first member who isn't the signed-in user.
  const other = members.find((m) => m.user.id !== session.user.id);

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-16">
      <header className="mb-6">
        <Link href={`/spaces/${id}`} className="text-sm text-ink-muted">
          ← {space.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Record settlement
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Money paid between members to balance contributions. It won&apos;t
          appear as an expense — only in the contribution balance.
        </p>
      </header>

      <SettlementForm
        spaceId={id}
        members={members.map((m) => ({ userId: m.user.id, name: m.user.name }))}
        defaultFromId={session.user.id}
        defaultToId={other?.user.id ?? session.user.id}
        currencyLabel={space.baseCurrency}
        today={todayISO()}
      />
    </main>
  );
}
