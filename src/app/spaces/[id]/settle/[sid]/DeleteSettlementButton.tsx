"use client";

import { deleteSettlement } from "../actions";

export function DeleteSettlementButton({
  settlementId,
  spaceId,
}: {
  settlementId: string;
  spaceId: string;
}) {
  return (
    <form
      action={deleteSettlement}
      onSubmit={(e) => {
        if (!confirm("Delete this settlement? The contribution balance will change.")) {
          e.preventDefault();
        }
      }}
      className="mt-3"
    >
      <input type="hidden" name="settlementId" value={settlementId} />
      <input type="hidden" name="spaceId" value={spaceId} />
      <button
        type="submit"
        className="w-full rounded-lg border border-red py-2.5 text-sm font-semibold text-red"
      >
        Delete settlement
      </button>
    </form>
  );
}
