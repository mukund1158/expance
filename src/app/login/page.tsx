"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="spine bg-paper-raised rounded-r-xl border border-line p-6 shadow-sm">
          <p className="eyebrow">Your ledger</p>
          <h1 className="mt-1 mb-8 text-3xl font-bold tracking-tight">
            Expance
          </h1>

          <form action={formAction} className="space-y-4">
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
                autoComplete="current-password"
                required
                className="field"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-red">
                {error}
              </p>
            )}

            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? "Opening…" : "Open ledger"}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-ink-muted">
          Private app — accounts are created by the owner.
        </p>
      </div>
    </main>
  );
}
