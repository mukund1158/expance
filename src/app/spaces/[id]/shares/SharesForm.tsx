"use client";

import { useActionState, useState } from "react";
import { saveShares } from "./actions";

type Row = { memberId: string; name: string; share: number };

export function SharesForm({ spaceId, rows }: { spaceId: string; rows: Row[] }) {
  const [error, formAction, pending] = useActionState(saveShares, undefined);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.memberId, String(r.share)]))
  );

  const total = Object.values(values).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const balanced = Math.abs(total - 100) <= 0.02;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="spaceId" value={spaceId} />

      <div className="divide-y divide-line-soft rounded-xl border border-line bg-paper-raised">
        {rows.map((r) => (
          <div key={r.memberId} className="flex items-center gap-3 p-3">
            <label htmlFor={`share_${r.memberId}`} className="flex-1 text-sm font-medium">
              {r.name}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id={`share_${r.memberId}`}
                name={`share_${r.memberId}`}
                type="text"
                inputMode="decimal"
                required
                value={values[r.memberId] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [r.memberId]: e.target.value }))
                }
                className="field amount w-24 text-right"
              />
              <span className="text-sm text-ink-muted">%</span>
            </div>
          </div>
        ))}
      </div>

      <p
        className={`amount text-sm font-semibold ${balanced ? "text-credit" : "text-red"}`}
        role="status"
      >
        Total: {total.toFixed(2)}%{balanced ? "" : " — must be 100%"}
      </p>

      {error && (
        <p role="alert" className="text-sm font-medium text-red">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !balanced}
        className="btn-primary w-full"
      >
        {pending ? "Saving…" : "Save shares"}
      </button>
    </form>
  );
}
