"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

// Only same-site relative paths — never an absolute URL someone smuggled in.
function safeCallback(value: FormDataEntryValue | null): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/";
}

export async function login(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safeCallback(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password";
    }
    // signIn redirects by throwing — rethrow anything that isn't an auth failure.
    throw error;
  }
}
