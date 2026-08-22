"use server";

import { revalidatePath } from "next/cache";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { newInviteToken } from "@/lib/invite";

/** Replaces the invite token — every previously shared QR/link stops working. */
export async function regenerateInvite(formData: FormData): Promise<void> {
  const spaceId = formData.get("spaceId");
  if (typeof spaceId !== "string") return;

  const { membership } = await requireMembership(spaceId);
  if (membership.role !== "OWNER") return;

  await prisma.space.update({
    where: { id: spaceId },
    data: { inviteToken: newInviteToken() },
  });
  revalidatePath(`/spaces/${spaceId}/invite`);
}
