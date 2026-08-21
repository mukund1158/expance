"use client";

import Link from "next/link";
import { useActionState } from "react";
import { changePassword } from "./actions";

export default function AccountPage() {
  const [error, formAction, pending] = useActionState(changePassword, undefined);

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-16">
      <header className="mb-6">
        <Link href="/" className="text-sm text-ink-muted">
          ← All spaces
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Account</h1>
      </header>

      <section className="rounded-xl border border-line bg-paper-raised p-4">
        <h2 className="eyebrow mb-4">Change password</h2>
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="current" className="label">
              Current password
            </label>
            <input
              id="current"
              name="current"
              type="password"
              autoComplete="current-password"
              required
              className="field"
            />
          </div>
          <div>
            <label htmlFor="next" className="label">
              New password
            </label>
            <input
              id="next"
              name="next"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="label">
              Repeat new password
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
            {pending ? "Saving…" : "Change password"}
          </button>
        </form>
      </section>
    </main>
  );
}
