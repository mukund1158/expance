"use client";

import { useActionState } from "react";
import { deleteSpace, removeMember } from "./actions";

export function RemoveMemberButton({
  spaceId,
  userId,
  name,
  isProject,
}: {
  spaceId: string;
  userId: string;
  name: string;
  isProject: boolean;
}) {
  const [error, formAction, pending] = useActionState(removeMember, undefined);

  return (
    <>
      <form
        action={formAction}
        onSubmit={(e) => {
          const msg = isProject
            ? `Remove ${name}? Remaining members' shares will be split equally.`
            : `Remove ${name} from this space?`;
          if (!confirm(msg)) e.preventDefault();
        }}
      >
        <input type="hidden" name="spaceId" value={spaceId} />
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          disabled={pending}
          aria-label={`Remove ${name}`}
          className="rounded-lg border border-line px-2 py-1 text-xs text-red"
        >
          Remove
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red">
          {error}
        </p>
      )}
    </>
  );
}

export function DeleteSpaceButton({
  spaceId,
  name,
}: {
  spaceId: string;
  name: string;
}) {
  return (
    <form
      action={deleteSpace}
      onSubmit={(e) => {
        if (
          !confirm(
            `Delete "${name}"? It disappears for every member. Its records stay in the database but the app will no longer show them.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="spaceId" value={spaceId} />
      <button
        type="submit"
        className="w-full rounded-lg border border-red py-2.5 text-sm font-semibold text-red"
      >
        Delete space
      </button>
    </form>
  );
}
