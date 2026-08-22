"use client";

import Link from "next/link";
import { useActionState } from "react";
import { joinSpace, registerAndJoin } from "./actions";

export function JoinButton({
  token,
  spaceName,
}: {
  token: string;
  spaceName: string;
}) {
  const [error, formAction, pending] = useActionState(joinSpace, undefined);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Joining…" : `Join ${spaceName}`}
      </button>
      {error && (
        <p role="alert" className="text-sm font-medium text-red">
          {error}
        </p>
      )}
    </form>
  );
}

export function RegisterAndJoinForm({ token }: { token: string }) {
  const [error, formAction, pending] = useActionState(registerAndJoin, undefined);
  return (
    <>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <label htmlFor="name" className="label">
            Your name
          </label>
          <input id="name" name="name" type="text" autoComplete="name" required maxLength={60} className="field" />
        </div>
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field" />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="field" />
        </div>
        <div>
          <label htmlFor="confirm" className="label">
            Repeat password
          </label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} className="field" />
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-red">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Joining…" : "Create account & join"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/join/${token}`)}`}
          className="font-medium text-red"
        >
          Sign in to join
        </Link>
      </p>
    </>
  );
}
