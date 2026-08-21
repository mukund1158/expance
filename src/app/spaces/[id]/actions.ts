"use server";

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
