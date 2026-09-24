import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { SpaceType } from "@/generated/prisma/enums";

/**
 * Splits 100% equally across a project's members, oldest first. The rounding
 * remainder goes to the first member so shares always total exactly 100
 * (3 people -> 33.34 / 33.33 / 33.33, never 99.99).
 */
export async function resplitSharesEqually(
  tx: Prisma.TransactionClient,
  spaceId: string
): Promise<void> {
  const members = await tx.spaceMember.findMany({
    where: { spaceId },
    orderBy: { createdAt: "asc" },
  });
  if (members.length === 0) return;
  const base = Math.floor(10000 / members.length); // in hundredths of a percent
  const remainder = 10000 - base * members.length;
  for (const [i, m] of members.entries()) {
    const hundredths = base + (i === 0 ? remainder : 0);
    await tx.spaceMember.update({
      where: { id: m.id },
      data: { sharePercent: (hundredths / 100).toFixed(2) },
    });
  }
}

/**
 * Adds a user to a space as MEMBER. For projects, all members' shares are
 * re-split equally (2 people -> 50/50); custom splits can be edited after.
 */
export async function addUserToSpace(
  spaceId: string,
  userId: string,
  spaceType: SpaceType
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.spaceMember.create({
      data: { spaceId, userId, role: "MEMBER" },
    });
    if (spaceType === "PROJECT") await resplitSharesEqually(tx, spaceId);
  });
}
