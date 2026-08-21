"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const settlementSchema = z.object({
  spaceId: z.string().min(1),
  fromUserId: z.string().min(1, "Pick who paid"),
  toUserId: z.string().min(1, "Pick who received"),
  amount: z.coerce
    .number()
    .positive("Amount must be more than zero")
    .max(999_999_999, "Amount too large")
    .refine((n) => Math.round(n * 100) === n * 100, "Max 2 decimal places"),
  date: z.iso.date("Enter a valid date"),
  note: z.string().trim().max(500, "Note too long").optional(),
});

async function validateSettlement(formData: FormData) {
  const parsed = settlementSchema.safeParse({
    spaceId: formData.get("spaceId"),
    fromUserId: formData.get("fromUserId"),
    toUserId: formData.get("toUserId"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  if (data.fromUserId === data.toUserId) {
    return { error: "Payer and receiver must be different people" };
  }

  await requireMembership(data.spaceId);

  // Both sides must be members of this space.
  const memberCount = await prisma.spaceMember.count({
    where: {
      spaceId: data.spaceId,
      userId: { in: [data.fromUserId, data.toUserId] },
    },
  });
  if (memberCount !== 2) {
    return { error: "Both people must be members of this space" };
  }

  return {
    data: {
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      amount: data.amount.toFixed(2),
      date: new Date(`${data.date}T00:00:00.000Z`),
      note: data.note ?? null,
    },
    spaceId: data.spaceId,
  };
}

export async function recordSettlement(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const result = await validateSettlement(formData);
  if ("error" in result) return result.error;

  await prisma.settlement.create({
    data: { ...result.data, spaceId: result.spaceId },
  });

  revalidatePath(`/spaces/${result.spaceId}`);
  redirect(`/spaces/${result.spaceId}`);
}

export async function updateSettlement(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const settlementId = formData.get("settlementId");
  if (typeof settlementId !== "string" || !settlementId) return "Missing id";

  const result = await validateSettlement(formData);
  if ("error" in result) return result.error;

  const updated = await prisma.settlement.updateMany({
    where: { id: settlementId, spaceId: result.spaceId, deletedAt: null },
    data: result.data,
  });
  if (updated.count === 0) return "Settlement not found";

  revalidatePath(`/spaces/${result.spaceId}`);
  redirect(`/spaces/${result.spaceId}`);
}

export async function deleteSettlement(formData: FormData): Promise<void> {
  const settlementId = formData.get("settlementId");
  const spaceId = formData.get("spaceId");
  if (typeof settlementId !== "string" || typeof spaceId !== "string") return;

  await requireMembership(spaceId);

  await prisma.settlement.updateMany({
    where: { id: settlementId, spaceId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/spaces/${spaceId}`);
  redirect(`/spaces/${spaceId}`);
}
