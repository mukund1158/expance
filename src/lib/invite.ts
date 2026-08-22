import { randomBytes } from "node:crypto";
import { headers } from "next/headers";

/** 32-char URL-safe token. Regenerating revokes every shared QR/link. */
export function newInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Absolute base URL of this deployment, derived from the request. */
export async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
