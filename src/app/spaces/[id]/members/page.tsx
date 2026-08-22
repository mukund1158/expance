import Link from "next/link";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { AddMemberForm } from "../AddMemberForm";
import { RemoveMemberButton } from "../ManageButtons";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, membership, space } = await requireMembership(id);
  const isOwner = membership.role === "OWNER";

  const members = await prisma.spaceMember.findMany({
    where: { spaceId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-16">
      <header className="mb-6">
        <Link href={`/spaces/${id}`} className="text-sm text-ink-muted">
          ← {space.name}
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          {isOwner && (
            <div className="flex gap-2">
              {space.type === "PROJECT" && (
                <Link href={`/spaces/${id}/shares`} className="btn-quiet">
                  Edit shares
                </Link>
              )}
              <Link href={`/spaces/${id}/invite`} className="btn-quiet">
                Invite QR
              </Link>
            </div>
          )}
        </div>
      </header>

      <ul className="divide-y divide-line-soft rounded-xl border border-line bg-paper-raised">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 p-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium">
                {m.user.name}
                {m.user.id === session.user.id && (
                  <span className="ml-1.5 text-xs text-ink-muted">(you)</span>
                )}
              </p>
              <p className="truncate text-xs text-ink-muted">{m.user.email}</p>
            </div>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-ink-muted">
                {m.role === "OWNER" ? "Owner" : "Member"}
                {space.type === "PROJECT" && ` · ${Number(m.sharePercent)}%`}
              </span>
              {isOwner && m.user.id !== session.user.id && (
                <RemoveMemberButton
                  spaceId={id}
                  userId={m.user.id}
                  name={m.user.name}
                  isProject={space.type === "PROJECT"}
                />
              )}
            </span>
          </li>
        ))}
      </ul>

      {isOwner && (
        <div className="mt-5">
          <h2 className="eyebrow mb-1">Add by email</h2>
          <p className="mb-2 text-xs text-ink-muted">
            For people who already have an Expance account. Otherwise share the
            invite QR — it creates their account too.
          </p>
          <AddMemberForm spaceId={id} />
        </div>
      )}
    </main>
  );
}
