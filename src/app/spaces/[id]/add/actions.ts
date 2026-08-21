"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getFxRate } from "@/lib/fx";

const addTransactionSchema = z.object({
  spaceId: z.string().min(1),
  type: z.enum(["EXPENSE", "INCOME"]),
  amount: z.coerce
    .number()
    .positive("Amount must be more than zero")
    .max(999_999_999, "Amount too large")
    .refine((n) => Math.round(n * 100) === n * 100, "Max 2 decimal places"),
  currency: z.enum(["INR", "USD"]),
  categoryId: z.string().min(1, "Pick a category"),
  memberId: z.string().min(1),
  paymentMethod: z.enum(["CREDIT_CARD", "UPI", "CASH", "BANK"]),
  date: z.iso.date("Enter a valid date"),
  note: z.string().trim().max(500, "Note too long").optional(),
});

export async function addTransaction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const parsed = addTransactionSchema.safeParse({
    spaceId: formData.get("spaceId"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    categoryId: formData.get("categoryId"),
    memberId: formData.get("memberId"),
    paymentMethod: formData.get("paymentMethod"),
    date: formData.get("date"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input";
  }
  const data = parsed.data;

  const { session, space } = await requireMembership(data.spaceId);

  // The category must belong to this space and match the entry type.
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, spaceId: data.spaceId, kind: data.type },
  });
  if (!category) return "Pick a category";

  // Whoever paid/received must be a member of this space.
  const payer = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId: data.spaceId, userId: data.memberId } },
  });
  if (!payer) return "Payer is not a member of this space";

  let fxRate = 1;
  if (data.currency !== space.baseCurrency) {
    try {
      fxRate = await getFxRate(data.date, data.currency, space.baseCurrency);
    } catch {
      return "Currency rate lookup failed — check your connection and try again";
    }
  }
  const amountBase = Math.round(data.amount * fxRate * 100) / 100;

  await prisma.transaction.create({
    data: {
      spaceId: data.spaceId,
      type: data.type,
      amountOriginal: data.amount.toFixed(2),
      currency: data.currency,
      fxRate: fxRate.toFixed(6),
      amountBase: amountBase.toFixed(2),
      categoryId: category.id,
      memberId: data.memberId,
      paymentMethod: data.paymentMethod,
      date: new Date(`${data.date}T00:00:00.000Z`),
      note: data.note,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/spaces/${data.spaceId}`);
  redirect(`/spaces/${data.spaceId}`);
}
