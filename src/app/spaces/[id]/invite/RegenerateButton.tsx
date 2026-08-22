"use client";

import { regenerateInvite } from "./actions";

export function RegenerateButton({ spaceId }: { spaceId: string }) {
  return (
    <form
      action={regenerateInvite}
      onSubmit={(e) => {
        if (
          !confirm(
            "Generate a new QR? Every QR and link shared so far will stop working."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="spaceId" value={spaceId} />
      <button type="submit" className="btn-quiet w-full justify-center py-2.5">
        Regenerate QR (revoke old ones)
      </button>
    </form>
  );
}
