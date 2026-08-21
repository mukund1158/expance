"use client";

import { useActionState } from "react";
import { saveBudgets } from "./actions";

type Row = { categoryId: string | null; name: string; amount: string };

export function BudgetForm({
  spaceId,
  month,
  monthLabel,
  rows,
}: {
  spaceId: string;
  month: string; // YYYY-MM
  monthLabel: string;
  rows: Row[];
}) {
  const [error, formAction, pending] = useActionState(saveBudgets, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="month" value={month} />

      <div className="divide-y divide-line-soft rounded-xl border border-line bg-paper-raised">
        {rows.map((row) => {
          const field =
            row.categoryId === null ? "budget_overall" : `budget_${row.categoryId}`;
          return (
            <div key={field} className="flex items-center gap-3 p-3">
              <label
                htmlFor={field}
                className={`flex-1 text-sm ${
                  row.categoryId === null ? "font-semibold" : "font-medium"
                }`}
              >
                {row.name}
              </label>
              <input
                id={field}
                name={field}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="—"
                defaultValue={row.amount}
                className="field amount w-32 text-right"
              />
            </div>
          );
        })}
      </div>

      <p className="text-xs text-ink-muted">
        Budgets apply to {monthLabel}. Leave a field blank for no budget.
      </p>

      {error && (
        <p role="alert" className="text-sm font-medium text-red">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Save budgets"}
      </button>
    </form>
  );
}
