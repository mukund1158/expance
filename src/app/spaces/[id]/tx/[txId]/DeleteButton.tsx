"use client";

import { deleteTransaction } from "../../add/actions";

export function DeleteButton({
  txId,
  spaceId,
}: {
  txId: string;
  spaceId: string;
}) {
  return (
    <form
      action={deleteTransaction}
      onSubmit={(e) => {
        if (!confirm("Delete this entry? It will disappear from all totals.")) {
          e.preventDefault();
        }
      }}
      className="mt-3"
    >
      <input type="hidden" name="txId" value={txId} />
      <input type="hidden" name="spaceId" value={spaceId} />
      <button
        type="submit"
        className="w-full rounded-lg border border-red py-2.5 text-sm font-semibold text-red"
      >
        Delete entry
      </button>
    </form>
  );
}
