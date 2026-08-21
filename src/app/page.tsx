import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const memberships = await prisma.spaceMember.findMany({
    where: { userId: session.user.id, space: { deletedAt: null } },
    include: { space: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-lg p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expance</h1>
          <p className="text-sm text-neutral-500">Hi, {session.user.name}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Your spaces
        </h2>
        <Link
          href="/spaces/new"
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          + New space
        </Link>
      </div>

      {memberships.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
          No spaces yet. Create one for each project, and one for home.
        </p>
      ) : (
        <ul className="space-y-3">
          {memberships.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="font-medium">{m.space.name}</div>
              <div className="text-xs text-neutral-500">
                {m.space.type === "PROJECT" ? "Project" : "Personal"} ·{" "}
                {m.space.baseCurrency}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
