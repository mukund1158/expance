"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSpaceSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Name too long"),
  type: z.enum(["PROJECT", "PERSONAL"]),
  baseCurrency: z.enum(["INR", "USD"]),
});

// Every new space starts with editable defaults so the add-expense flow
// works immediately instead of on an empty category list.
const DEFAULT_CATEGORIES = {
  PROJECT: {
    EXPENSE: ["Hosting", "Domains", "Tools & Software", "Marketing & Ads", "Services", "Other"],
    INCOME: ["Product Revenue", "Other Income"],
  },
  PERSONAL: {
    EXPENSE: ["Groceries", "Food & Dining", "Transport", "Utilities & Bills", "Shopping", "Health", "Entertainment", "Other"],
    INCOME: ["Salary", "Other Income"],
  },
} as const;

export async function createSpace(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parsed = createSpaceSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    baseCurrency: formData.get("baseCurrency"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input";
  }
  const { name, type, baseCurrency } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const space = await tx.space.create({
      data: { name, type, baseCurrency },
    });
    await tx.spaceMember.create({
      data: {
        spaceId: space.id,
        userId: session.user.id,
        role: "OWNER",
        // Creator holds 100% until more members are added.
        sharePercent: 100,
      },
    });
    await tx.category.createMany({
      data: (["EXPENSE", "INCOME"] as const).flatMap((kind) =>
        DEFAULT_CATEGORIES[type][kind].map((catName) => ({
          spaceId: space.id,
          name: catName,
          kind,
        }))
      ),
    });
  });

  redirect("/");
}
