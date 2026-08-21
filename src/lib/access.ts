import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Every space page and action goes through this: signed in, AND a member of
 * the space. Non-members get a 404 (not a 403) so space ids leak nothing.
 */
export async function requireMembership(spaceId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: session.user.id } },
    include: { space: true },
  });
  if (!membership || membership.space.deletedAt) notFound();

  return { session, membership, space: membership.space };
}
