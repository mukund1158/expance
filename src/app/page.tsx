import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Landing } from "./Landing";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) return <Landing />;
  const passwordChanged = (await searchParams).password === "changed";

  const memberships = await prisma.spaceMember.findMany({
    where: { userId: session.user.id, space: { deletedAt: null } },
    include: { space: { include: { _count: { select: { members: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-16">
      <header className="mb-10 flex items-start justify-between">
        <div>
          <p className="eyebrow">Expance</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {session.user.name}&apos;s ledgers
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/account" className="btn-quiet">
            Account
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="btn-quiet">
              Sign out
            </button>
          </form>
        </div>
      </header>

      {passwordChanged && (
        <p className="mb-4 rounded-xl border border-line bg-paper-raised p-3 text-sm font-medium text-credit">
          Password changed.
        </p>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="eyebrow">Spaces</h2>
        <Link href="/spaces/new" className="btn-primary px-3 py-1.5 text-sm">
          + New space
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center">
          <p className="font-medium">Start your first book</p>
          <p className="mt-1 text-sm text-ink-muted">
            Create a space for each project, and one for home.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {memberships.map((m) => (
            <li key={m.id}>
              <Link
                href={`/spaces/${m.space.id}`}
                className="spine block rounded-r-xl border border-line bg-paper-raised p-4 shadow-sm transition-colors hover:border-ink-muted"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-lg font-semibold tracking-tight">
                    {m.space.name}
                  </span>
                  <span className="amount text-xs text-ink-muted">
                    {m.space.baseCurrency}
                  </span>
                </div>
                <div className="mt-1 text-xs text-ink-muted">
                  {m.space.type === "PROJECT" ? "Project" : "Personal"} ·{" "}
                  {m.space._count.members}{" "}
                  {m.space._count.members === 1 ? "member" : "members"}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
