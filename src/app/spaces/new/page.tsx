"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createSpace } from "./actions";

export default function NewSpacePage() {
  const [error, formAction, pending] = useActionState(createSpace, undefined);

  return (
    <main className="mx-auto w-full max-w-lg p-5">
      <header className="mb-8">
        <Link href="/" className="text-sm text-ink-muted">
          ← All spaces
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">New space</h1>
        <p className="mt-1 text-sm text-ink-muted">
          A space is a separate ledger — one per project, or one for home.
        </p>
      </header>

      <form action={formAction} className="space-y-6">
        <div>
          <label htmlFor="name" className="label">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={60}
            placeholder="NoonLaunch, Home…"
            className="field"
          />
        </div>

        <fieldset>
          <legend className="label">Type</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="cursor-pointer rounded-xl border border-line bg-paper-raised p-4 has-checked:border-red has-checked:bg-red-tint">
              <input type="radio" name="type" value="PROJECT" defaultChecked className="sr-only" />
              <div className="font-semibold">Project</div>
              <div className="mt-0.5 text-xs text-ink-muted">
                Who paid what, profit split
              </div>
            </label>
            <label className="cursor-pointer rounded-xl border border-line bg-paper-raised p-4 has-checked:border-red has-checked:bg-red-tint">
              <input type="radio" name="type" value="PERSONAL" className="sr-only" />
              <div className="font-semibold">Personal</div>
              <div className="mt-0.5 text-xs text-ink-muted">
                Budgets, household spending
              </div>
            </label>
          </div>
        </fieldset>

        <div>
          <label htmlFor="baseCurrency" className="label">
            Base currency
          </label>
          <select id="baseCurrency" name="baseCurrency" defaultValue="INR" className="field">
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
          </select>
          <p className="mt-1.5 text-xs text-ink-muted">
            All totals use this currency. Entries in other currencies are
            converted at that day&apos;s rate.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-red">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Creating…" : "Create space"}
        </button>
      </form>
    </main>
  );
}
