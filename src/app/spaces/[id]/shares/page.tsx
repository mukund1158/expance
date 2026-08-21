import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { SharesForm } from "./SharesForm";

export default async function SharesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership, space } = await requireMembership(id);
  if (space.type !== "PROJECT" || membership.role !== "OWNER") notFound();

  const members = await prisma.spaceMember.findMany({
    where: { spaceId: id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-16">
      <header className="mb-6">
        <Link href={`/spaces/${id}`} className="text-sm text-ink-muted">
          ← {space.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Member shares</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Each member&apos;s share of expenses and profit. Changing shares
          recalculates the contribution balance for all entries.
        </p>
      </header>

      <SharesForm
        spaceId={id}
        rows={members.map((m) => ({
          memberId: m.id,
          name: m.user.name,
          share: Number(m.sharePercent),
        }))}
      />
    </main>
  );
}
