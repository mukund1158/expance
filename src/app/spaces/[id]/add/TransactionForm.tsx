"use client";

import { useActionState, useState } from "react";
import { addTransaction, updateTransaction } from "./actions";

type Category = { id: string; name: string; kind: "EXPENSE" | "INCOME" };
type Member = { userId: string; name: string };

export type TransactionEditValues = {
  txId: string;
  type: "EXPENSE" | "INCOME";
  amount: string;
  currency: "INR" | "USD";
  categoryId: string;
  memberId: string;
  paymentMethod: "CREDIT_CARD" | "UPI" | "CASH" | "BANK";
  date: string;
  note: string;
  hasReceipt: boolean;
};

const PAYMENT_METHODS = [
  { value: "UPI", label: "UPI" },
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank" },
] as const;

export function TransactionForm({
  spaceId,
  categories,
  members,
  selfId,
  baseCurrency,
  today,
  edit,
}: {
  spaceId: string;
  categories: Category[];
  members: Member[];
  selfId: string;
  baseCurrency: "INR" | "USD";
  today: string;
  edit?: TransactionEditValues;
}) {
  const [error, formAction, pending] = useActionState(
    edit ? updateTransaction : addTransaction,
    undefined
  );
  const [type, setType] = useState<"EXPENSE" | "INCOME">(
    edit?.type ?? "EXPENSE"
  );

  const visibleCategories = categories.filter((c) => c.kind === type);
  const checkedCategoryId =
    edit && edit.type === type ? edit.categoryId : visibleCategories[0]?.id;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="spaceId" value={spaceId} />
      {edit && <input type="hidden" name="txId" value={edit.txId} />}

      {/* Expense / income toggle — a ledger has two sides */}
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-line">
        {(["EXPENSE", "INCOME"] as const).map((t) => (
          <label
            key={t}
            className={`cursor-pointer py-2.5 text-center text-sm font-semibold transition-colors ${
              type === t
                ? t === "INCOME"
                  ? "bg-credit text-on-red"
                  : "bg-red text-on-red"
                : "bg-paper-raised text-ink-muted"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={t}
              checked={type === t}
              onChange={() => setType(t)}
              className="sr-only"
            />
            {t === "EXPENSE" ? "Expense" : "Income"}
          </label>
        ))}
      </div>

      {/* Amount — the star of the screen */}
      <div>
        <label htmlFor="amount" className="label">
          Amount
        </label>
        <div className="flex gap-2">
          <input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            required
            placeholder="0"
            defaultValue={edit?.amount}
            className="field amount flex-1 py-3 text-3xl font-semibold"
            autoFocus={!edit}
          />
          <div className="flex flex-col justify-center gap-1.5">
            {(["INR", "USD"] as const).map((c) => (
              <label key={c} className="chip justify-center px-3 py-1 text-xs">
                <input
                  type="radio"
                  name="currency"
                  value={c}
                  defaultChecked={c === (edit?.currency ?? baseCurrency)}
                  className="sr-only"
                />
                {c === "INR" ? "₹ INR" : "$ USD"}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Category */}
      <fieldset>
        <legend className="label">Category</legend>
        <div className="flex flex-wrap gap-2" key={type}>
          {visibleCategories.map((c) => (
            <label key={c.id} className="chip">
              <input
                type="radio"
                name="categoryId"
                value={c.id}
                defaultChecked={c.id === checkedCategoryId}
                className="sr-only"
              />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Who paid / received */}
      <fieldset>
        <legend className="label">
          {type === "EXPENSE" ? "Paid by" : "Received by"}
        </legend>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <label key={m.userId} className="chip">
              <input
                type="radio"
                name="memberId"
                value={m.userId}
                defaultChecked={m.userId === (edit?.memberId ?? selfId)}
                className="sr-only"
              />
              {m.name}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Payment method */}
      <fieldset>
        <legend className="label">Method</legend>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((p) => (
            <label key={p.value} className="chip">
              <input
                type="radio"
                name="paymentMethod"
                value={p.value}
                defaultChecked={p.value === (edit?.paymentMethod ?? "UPI")}
                className="sr-only"
              />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

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
            defaultValue={edit?.date ?? today}
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
            placeholder="What was it?"
            defaultValue={edit?.note}
            className="field"
          />
        </div>
      </div>

      <div>
        <label htmlFor="receipt" className="label">
          Receipt <span className="font-normal text-ink-muted">(optional photo)</span>
        </label>
        {edit?.hasReceipt && (
          <div className="mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image */}
            <img
              src={`/api/receipts/${edit.txId}`}
              alt="Current receipt"
              className="max-h-44 rounded-lg border border-line"
            />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="removeReceipt" />
              Remove this receipt
            </label>
          </div>
        )}
        <input
          id="receipt"
          name="receipt"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-paper-raised file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink"
        />
        {edit?.hasReceipt && (
          <p className="mt-1 text-xs text-ink-muted">
            Choosing a new photo replaces the current one.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full py-3">
        {pending ? "Saving…" : edit ? "Save changes" : "Save entry"}
      </button>
    </form>
  );
}
