"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function saveShares(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const spaceId = formData.get("spaceId");
  if (typeof spaceId !== "string") return "Invalid input";

  const { membership, space } = await requireMembership(spaceId);
  if (membership.role !== "OWNER") return "Only the space owner can change shares";
  if (space.type !== "PROJECT") return "Shares apply to project spaces only";

  const members = await prisma.spaceMember.findMany({ where: { spaceId } });

  const updates: { id: string; share: number }[] = [];
  let total = 0;
  for (const m of members) {
    const raw = formData.get(`share_${m.id}`);
    const n = Number(raw);
    if (raw == null || !Number.isFinite(n) || n < 0 || n > 100) {
      return "Each share must be between 0 and 100";
    }
    const rounded = Math.round(n * 100) / 100;
    updates.push({ id: m.id, share: rounded });
    total += rounded;
  }
  // Allow a paisa of rounding slack (e.g. 33.33 x 3).
  if (Math.abs(total - 100) > 0.02) {
    return `Shares must add up to 100% (currently ${total.toFixed(2)}%)`;
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.spaceMember.update({
        where: { id: u.id },
        data: { sharePercent: u.share.toFixed(2) },
      })
    )
  );

  revalidatePath(`/spaces/${spaceId}`);
  redirect(`/spaces/${spaceId}`);
}
