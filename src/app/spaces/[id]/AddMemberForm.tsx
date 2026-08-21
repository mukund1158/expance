"use client";

import { useActionState } from "react";
import { addMember } from "./actions";

export function AddMemberForm({ spaceId }: { spaceId: string }) {
  const [error, formAction, pending] = useActionState(addMember, undefined);

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="spaceId" value={spaceId} />
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="Member's email"
          aria-label="Member's email"
          className="field flex-1"
        />
        <button type="submit" disabled={pending} className="btn-primary shrink-0">
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red">
          {error}
        </p>
      )}
    </form>
  );
}
