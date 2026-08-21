"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getFxRate } from "@/lib/fx";

const transactionSchema = z.object({
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

function parseForm(formData: FormData) {
  return transactionSchema.safeParse({
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
}

/**
 * Validates the entry against the space (membership, category, payer) and
 * computes the base-currency amount. Returns an error string or the row data.
 */
async function buildTransactionData(data: z.infer<typeof transactionSchema>) {
  const { session, space } = await requireMembership(data.spaceId);

  // The category must belong to this space and match the entry type.
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, spaceId: data.spaceId, kind: data.type },
  });
  if (!category) return { error: "Pick a category" as const };

  // Whoever paid/received must be a member of this space.
  const payer = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId: data.spaceId, userId: data.memberId } },
  });
  if (!payer) return { error: "Payer is not a member of this space" as const };

  let fxRate = 1;
  if (data.currency !== space.baseCurrency) {
    try {
      fxRate = await getFxRate(data.date, data.currency, space.baseCurrency);
    } catch {
      return {
        error:
          "Currency rate lookup failed — check your connection and try again" as const,
      };
    }
  }
  const amountBase = Math.round(data.amount * fxRate * 100) / 100;

  return {
    session,
    row: {
      type: data.type,
      amountOriginal: data.amount.toFixed(2),
      currency: data.currency,
      fxRate: fxRate.toFixed(6),
      amountBase: amountBase.toFixed(2),
      categoryId: category.id,
      memberId: data.memberId,
      paymentMethod: data.paymentMethod,
      date: new Date(`${data.date}T00:00:00.000Z`),
      note: data.note ?? null,
    },
  };
}

export async function addTransaction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input";
  }

  const result = await buildTransactionData(parsed.data);
  if ("error" in result) return result.error;

  await prisma.transaction.create({
    data: {
      ...result.row,
      spaceId: parsed.data.spaceId,
      createdById: result.session.user.id,
    },
  });

  revalidatePath(`/spaces/${parsed.data.spaceId}`);
  redirect(`/spaces/${parsed.data.spaceId}`);
}

export async function updateTransaction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const txId = formData.get("txId");
  if (typeof txId !== "string" || !txId) return "Missing entry id";

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input";
  }

  const result = await buildTransactionData(parsed.data);
  if ("error" in result) return result.error;

  // Scoped to the space so an id from another ledger can't be touched.
  const updated = await prisma.transaction.updateMany({
    where: { id: txId, spaceId: parsed.data.spaceId, deletedAt: null },
    data: result.row,
  });
  if (updated.count === 0) return "Entry not found";

  revalidatePath(`/spaces/${parsed.data.spaceId}`);
  redirect(`/spaces/${parsed.data.spaceId}`);
}

export async function deleteTransaction(formData: FormData): Promise<void> {
  const txId = formData.get("txId");
  const spaceId = formData.get("spaceId");
  if (typeof txId !== "string" || typeof spaceId !== "string") return;

  await requireMembership(spaceId);

  // Soft delete only — money records are never erased.
  await prisma.transaction.updateMany({
    where: { id: txId, spaceId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/spaces/${spaceId}`);
  redirect(`/spaces/${spaceId}`);
}
