"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const addMemberSchema = z.object({
  spaceId: z.string().min(1),
  email: z.email("Enter a valid email"),
});

export async function addMember(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const parsed = addMemberSchema.safeParse({
    spaceId: formData.get("spaceId"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input";
  }
  const { spaceId, email } = parsed.data;

  const { membership, space } = await requireMembership(spaceId);
  if (membership.role !== "OWNER") {
    return "Only the space owner can add members";
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) {
    return "No account with that email. Accounts are created with the create-user script.";
  }

  const existing = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: user.id } },
  });
  if (existing) {
    return `${user.name} is already a member`;
  }

  await prisma.$transaction(async (tx) => {
    await tx.spaceMember.create({
      data: { spaceId, userId: user.id, role: "MEMBER" },
    });
    if (space.type === "PROJECT") {
      // Default to an equal split among all members (2 people -> 50/50).
      // Custom splits can be edited later; rounding to 2dp may leave the
      // total a paisa short for 3+ members, which is fine for percentages.
      const members = await tx.spaceMember.findMany({ where: { spaceId } });
      const equal = Math.floor(10000 / members.length) / 100;
      await tx.spaceMember.updateMany({
        where: { spaceId },
        data: { sharePercent: equal },
      });
    }
  });

  revalidatePath(`/spaces/${spaceId}`);
  return undefined;
}

export async function removeMember(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const spaceId = formData.get("spaceId");
  const targetUserId = formData.get("userId");
  if (typeof spaceId !== "string" || typeof targetUserId !== "string") {
    return "Invalid input";
  }

  const { session, membership, space } = await requireMembership(spaceId);
  if (membership.role !== "OWNER") return "Only the space owner can remove members";
  if (targetUserId === session.user.id) return "You can't remove yourself";

  const target = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: targetUserId } },
    include: { user: { select: { name: true } } },
  });
  if (!target) return "Not a member of this space";

  // A member with recorded money stays in history — they can't be removed
  // without corrupting balances.
  const [txCount, settlementCount] = await Promise.all([
    prisma.transaction.count({
      where: { spaceId, memberId: targetUserId, deletedAt: null },
    }),
    prisma.settlement.count({
      where: {
        spaceId,
        deletedAt: null,
        OR: [{ fromUserId: targetUserId }, { toUserId: targetUserId }],
      },
    }),
  ]);
  if (txCount > 0 || settlementCount > 0) {
    return `${target.user.name} has entries or settlements in this space and can't be removed`;
  }

  await prisma.$transaction(async (tx) => {
    await tx.spaceMember.delete({ where: { id: target.id } });
    if (space.type === "PROJECT") {
      const remaining = await tx.spaceMember.findMany({ where: { spaceId } });
      const equal = Math.floor(10000 / remaining.length) / 100;
      await tx.spaceMember.updateMany({
        where: { spaceId },
        data: { sharePercent: equal },
      });
    }
  });

  revalidatePath(`/spaces/${spaceId}`);
  return undefined;
}

export async function deleteSpace(formData: FormData): Promise<void> {
  const spaceId = formData.get("spaceId");
  if (typeof spaceId !== "string") return;

  const { membership } = await requireMembership(spaceId);
  if (membership.role !== "OWNER") return;

  // Soft delete: the ledger stays in the database, the space just disappears
  // from every member's app.
  await prisma.space.update({
    where: { id: spaceId },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/");
  redirect("/");
}
