import Link from "next/link";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CategoryManager } from "./CategoryManager";

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { space } = await requireMembership(id);

  const categories = await prisma.category.findMany({
    where: { spaceId: id },
    include: { _count: { select: { transactions: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-16">
      <header className="mb-6">
        <Link href={`/spaces/${id}`} className="text-sm text-ink-muted">
          ← {space.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Categories</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Rename any category. Categories used by entries can&apos;t be deleted.
        </p>
      </header>

      <CategoryManager
        spaceId={id}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind,
          inUse: c._count.transactions > 0,
        }))}
      />
    </main>
  );
}
