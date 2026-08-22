import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JoinButton, RegisterAndJoinForm } from "./JoinForms";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  const space = await prisma.space.findFirst({
    where: { inviteToken: token, deletedAt: null },
    include: { _count: { select: { members: true } } },
  });

  if (!space) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-xl border border-dashed border-line p-8 text-center">
          <p className="font-medium">This invite is no longer valid</p>
          <p className="mt-1 text-sm text-ink-muted">
            The QR may have been regenerated. Ask for a new one.
          </p>
          <Link href="/" className="btn-quiet mt-4 inline-flex">
            Go to Expance
          </Link>
        </div>
      </main>
    );
  }

  // Already a member? Straight in.
  if (session?.user) {
    const membership = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: { spaceId: space.id, userId: session.user.id },
      },
    });
    if (membership) redirect(`/spaces/${space.id}`);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="spine bg-paper-raised rounded-r-xl border border-line p-6 shadow-sm">
          <p className="eyebrow">You&apos;re invited to</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{space.name}</h1>
          <p className="mt-1 mb-6 text-sm text-ink-muted">
            {space.type === "PROJECT" ? "Project" : "Personal"} space ·{" "}
            {space._count.members}{" "}
            {space._count.members === 1 ? "member" : "members"} · on Expance
          </p>

          {session?.user ? (
            <>
              <p className="mb-4 text-sm text-ink-muted">
                Joining as <strong className="text-ink">{session.user.name}</strong>
              </p>
              <JoinButton token={token} spaceName={space.name} />
            </>
          ) : (
            <RegisterAndJoinForm token={token} />
          )}
        </div>
      </div>
    </main>
  );
}
