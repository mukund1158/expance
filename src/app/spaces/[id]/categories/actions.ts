"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const nameSchema = z.string().trim().min(1, "Name is required").max(40, "Name too long");

export async function addCategory(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const spaceId = formData.get("spaceId");
  const kind = formData.get("kind");
  const name = nameSchema.safeParse(formData.get("name"));
  if (typeof spaceId !== "string") return "Invalid input";
  if (kind !== "EXPENSE" && kind !== "INCOME") return "Invalid input";
  if (!name.success) return name.error.issues[0].message;

  await requireMembership(spaceId);

  const exists = await prisma.category.findFirst({
    where: { spaceId, kind, name: name.data },
  });
  if (exists) return `"${name.data}" already exists`;

  await prisma.category.create({
    data: { spaceId, kind, name: name.data },
  });
  revalidatePath(`/spaces/${spaceId}/categories`);
  return undefined;
}

export async function renameCategory(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const spaceId = formData.get("spaceId");
  const categoryId = formData.get("categoryId");
  const name = nameSchema.safeParse(formData.get("name"));
  if (typeof spaceId !== "string" || typeof categoryId !== "string") {
    return "Invalid input";
  }
  if (!name.success) return name.error.issues[0].message;

  await requireMembership(spaceId);

  const category = await prisma.category.findFirst({
    where: { id: categoryId, spaceId },
  });
  if (!category) return "Category not found";

  const clash = await prisma.category.findFirst({
    where: { spaceId, kind: category.kind, name: name.data, id: { not: categoryId } },
  });
  if (clash) return `"${name.data}" already exists`;

  await prisma.category.update({
    where: { id: categoryId },
    data: { name: name.data },
  });
  revalidatePath(`/spaces/${spaceId}/categories`);
  revalidatePath(`/spaces/${spaceId}`);
  return undefined;
}

export async function deleteCategory(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const spaceId = formData.get("spaceId");
  const categoryId = formData.get("categoryId");
  if (typeof spaceId !== "string" || typeof categoryId !== "string") {
    return "Invalid input";
  }

  await requireMembership(spaceId);

  const category = await prisma.category.findFirst({
    where: { id: categoryId, spaceId },
    include: { _count: { select: { transactions: true, budgets: true } } },
  });
  if (!category) return "Category not found";

  // Entries keep their history — a category in use can be renamed, not removed.
  if (category._count.transactions > 0) {
    return `"${category.name}" is used by ${category._count.transactions} ${
      category._count.transactions === 1 ? "entry" : "entries"
    } — rename it instead`;
  }
  if (category._count.budgets > 0) {
    await prisma.budget.deleteMany({ where: { categoryId } });
  }
  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath(`/spaces/${spaceId}/categories`);
  return undefined;
}
