"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addUserToSpace } from "@/lib/membership";
import { createAccount, registrationSchema } from "@/lib/users";

async function findInvitedSpace(token: unknown) {
  if (typeof token !== "string" || !token) return null;
  return prisma.space.findFirst({
    where: { inviteToken: token, deletedAt: null },
  });
}

/** Signed-in user taps "Join". */
export async function joinSpace(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const space = await findInvitedSpace(formData.get("token"));
  if (!space) return "This invite is no longer valid";

  const existing = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId: space.id, userId: session.user.id } },
  });
  if (!existing) {
    await addUserToSpace(space.id, session.user.id, space.type);
    revalidatePath(`/spaces/${space.id}`);
  }
  redirect(`/spaces/${space.id}`);
}

/** New person from a QR scan: create the account and join in one step. */
export async function registerAndJoin(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const space = await findInvitedSpace(formData.get("token"));
  if (!space) return "This invite is no longer valid";

  const parsed = registrationSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input";
  }
  if (parsed.data.password !== parsed.data.confirm) {
    return "Passwords don't match";
  }

  const result = await createAccount(parsed.data);
  if ("error" in result) return result.error;

  await addUserToSpace(space.id, result.userId, space.type);
  revalidatePath(`/spaces/${space.id}`);

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: `/spaces/${space.id}`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Account created — please sign in";
    }
    throw error; // the success redirect
  }
}
