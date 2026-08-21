"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";

/**
 * Saves this month's budgets. One numeric field per expense category named
 * budget_<categoryId>, plus budget_overall. Blank clears that budget.
 */
export async function saveBudgets(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const spaceId = formData.get("spaceId");
  const monthStr = formData.get("month");
  if (typeof spaceId !== "string" || typeof monthStr !== "string") {
    return "Invalid input";
  }
  if (!/^\d{4}-\d{2}$/.test(monthStr)) return "Invalid month";
  const month = new Date(`${monthStr}-01T00:00:00.000Z`);

  await requireMembership(spaceId);

  const categories = await prisma.category.findMany({
    where: { spaceId, kind: "EXPENSE" },
    select: { id: true },
  });

  const entries: { categoryId: string | null; raw: FormDataEntryValue | null }[] =
    [
      { categoryId: null, raw: formData.get("budget_overall") },
      ...categories.map((c) => ({
        categoryId: c.id,
        raw: formData.get(`budget_${c.id}`),
      })),
    ];

  for (const { raw } of entries) {
    if (raw == null || String(raw).trim() === "") continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 999_999_999) {
      return "Budget amounts must be positive numbers";
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const { categoryId, raw } of entries) {
      const trimmed = raw == null ? "" : String(raw).trim();
      // The unique index doesn't cover NULL categoryId in MySQL, so match
      // the overall budget explicitly instead of relying on upsert.
      const existing = await tx.budget.findFirst({
        where: { spaceId, categoryId, month },
      });
      if (trimmed === "") {
        if (existing) await tx.budget.delete({ where: { id: existing.id } });
        continue;
      }
      const amount = Number(trimmed).toFixed(2);
      if (existing) {
        await tx.budget.update({ where: { id: existing.id }, data: { amount } });
      } else {
        await tx.budget.create({
          data: { spaceId, categoryId, month, amount },
        });
      }
    }
  });

  revalidatePath(`/spaces/${spaceId}`);
  redirect(`/spaces/${spaceId}`);
}

/** Copies last month's budgets into an empty current month. */
export async function copyLastMonthBudgets(formData: FormData): Promise<void> {
  const spaceId = formData.get("spaceId");
  const monthStr = formData.get("month");
  if (typeof spaceId !== "string" || typeof monthStr !== "string") return;
  if (!/^\d{4}-\d{2}$/.test(monthStr)) return;

  await requireMembership(spaceId);

  const month = new Date(`${monthStr}-01T00:00:00.000Z`);
  const prev = new Date(month);
  prev.setUTCMonth(prev.getUTCMonth() - 1);

  const [current, previous] = await Promise.all([
    prisma.budget.count({ where: { spaceId, month } }),
    prisma.budget.findMany({ where: { spaceId, month: prev } }),
  ]);
  if (current > 0 || previous.length === 0) return;

  await prisma.budget.createMany({
    data: previous.map((b) => ({
      spaceId,
      categoryId: b.categoryId,
      month,
      amount: b.amount,
    })),
  });

  revalidatePath(`/spaces/${spaceId}/budgets`);
  revalidatePath(`/spaces/${spaceId}`);
}
