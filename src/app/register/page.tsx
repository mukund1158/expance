"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "./actions";

export default function RegisterPage() {
  const [error, formAction, pending] = useActionState(register, undefined);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="spine bg-paper-raised rounded-r-xl border border-line p-6 shadow-sm">
          <p className="eyebrow">Start your ledger</p>
          <h1 className="mt-1 mb-8 text-3xl font-bold tracking-tight">
            Create account
          </h1>

          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="name" className="label">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                maxLength={60}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="field"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="label">
                Repeat password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="field"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-red">
                {error}
              </p>
            )}

            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? "Creating…" : "Create account"}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-red">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
