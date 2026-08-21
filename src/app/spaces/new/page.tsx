"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createSpace } from "./actions";

const inputClass =
  "w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100";

export default function NewSpacePage() {
  const [error, formAction, pending] = useActionState(createSpace, undefined);

  return (
    <main className="mx-auto max-w-lg p-6">
      <header className="mb-8">
        <Link href="/" className="text-sm text-neutral-500">
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-bold">New space</h1>
        <p className="text-sm text-neutral-500">
          A space is a separate ledger — one per project, or one for home.
        </p>
      </header>

      <form action={formAction} className="space-y-5">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={60}
            placeholder="NoonLaunch, Home…"
            className={inputClass}
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Type</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="cursor-pointer rounded-xl border border-neutral-300 p-4 has-checked:border-neutral-900 has-checked:bg-neutral-50 dark:border-neutral-700 dark:has-checked:border-neutral-100 dark:has-checked:bg-neutral-900">
              <input type="radio" name="type" value="PROJECT" defaultChecked className="sr-only" />
              <div className="font-medium">Project</div>
              <div className="text-xs text-neutral-500">
                Contribution balance, profit split
              </div>
            </label>
            <label className="cursor-pointer rounded-xl border border-neutral-300 p-4 has-checked:border-neutral-900 has-checked:bg-neutral-50 dark:border-neutral-700 dark:has-checked:border-neutral-100 dark:has-checked:bg-neutral-900">
              <input type="radio" name="type" value="PERSONAL" className="sr-only" />
              <div className="font-medium">Personal</div>
              <div className="text-xs text-neutral-500">
                Budgets, household spending
              </div>
            </label>
          </div>
        </fieldset>

        <div>
          <label htmlFor="baseCurrency" className="mb-1 block text-sm font-medium">
            Base currency
          </label>
          <select id="baseCurrency" name="baseCurrency" defaultValue="INR" className={inputClass}>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
          </select>
          <p className="mt-1 text-xs text-neutral-500">
            All reports use this currency. Entries in other currencies are
            converted at that day&apos;s rate.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-neutral-900 py-2.5 font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {pending ? "Creating…" : "Create space"}
        </button>
      </form>
    </main>
  );
}
