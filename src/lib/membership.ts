import { prisma } from "@/lib/prisma";
import type { SpaceType } from "@/generated/prisma/enums";

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
    if (spaceType === "PROJECT") {
      const members = await tx.spaceMember.findMany({ where: { spaceId } });
      const equal = Math.floor(10000 / members.length) / 100;
      await tx.spaceMember.updateMany({
        where: { spaceId },
        data: { sharePercent: equal },
      });
    }
  });
}
