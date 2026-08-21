"use client";

import { useActionState } from "react";
import { recordSettlement } from "./actions";

type Member = { userId: string; name: string };

export function SettlementForm({
  spaceId,
  members,
  defaultFromId,
  defaultToId,
  currencyLabel,
  today,
}: {
  spaceId: string;
  members: Member[];
  defaultFromId: string;
  defaultToId: string;
  currencyLabel: string;
  today: string;
}) {
  const [error, formAction, pending] = useActionState(
    recordSettlement,
    undefined
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="spaceId" value={spaceId} />

      <fieldset>
        <legend className="label">Paid by</legend>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <label key={m.userId} className="chip">
              <input
                type="radio"
                name="fromUserId"
                value={m.userId}
                defaultChecked={m.userId === defaultFromId}
                className="sr-only"
              />
              {m.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Received by</legend>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <label key={m.userId} className="chip">
              <input
                type="radio"
                name="toUserId"
                value={m.userId}
                defaultChecked={m.userId === defaultToId}
                className="sr-only"
              />
              {m.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="amount" className="label">
          Amount ({currencyLabel})
        </label>
        <input
          id="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          required
          placeholder="0"
          className="field amount py-3 text-3xl font-semibold"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date" className="label">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={today}
            max={today}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="note" className="label">
            Note <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            id="note"
            name="note"
            type="text"
            maxLength={500}
            placeholder="UPI transfer…"
            className="field"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full py-3">
        {pending ? "Saving…" : "Record settlement"}
      </button>
    </form>
  );
}
