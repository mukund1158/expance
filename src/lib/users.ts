import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const registrationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Name too long"),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string(),
});

/** Creates an account. Returns the user or a user-facing error string. */
export async function createAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ userId: string } | { error: string }> {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists — sign in instead" };
  }
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash: await bcrypt.hash(input.password, 12),
    },
  });
  return { userId: user.id };
}
