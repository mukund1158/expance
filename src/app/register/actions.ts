"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { createAccount, registrationSchema } from "@/lib/users";

export async function register(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
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

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Account created — please sign in";
    }
    throw error; // the success redirect
  }
}
