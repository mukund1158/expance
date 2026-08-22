"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { deleteSpace } from "./actions";

const itemClass =
  "block w-full px-4 py-2.5 text-left text-sm font-medium text-ink hover:bg-line-soft";

export function SpaceMenu({
  spaceId,
  spaceName,
  isOwner,
}: {
  spaceId: string;
  spaceName: string;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Space menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-line bg-paper-raised px-2.5 py-1 text-lg leading-none text-ink"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1.5 w-44 overflow-hidden rounded-xl border border-line bg-paper-raised shadow-lg">
          <Link href={`/spaces/${spaceId}/members`} className={itemClass} onClick={() => setOpen(false)}>
            Members
          </Link>
          <Link href={`/spaces/${spaceId}/categories`} className={itemClass} onClick={() => setOpen(false)}>
            Categories
          </Link>
          <Link href={`/spaces/${spaceId}/analytics`} className={itemClass} onClick={() => setOpen(false)}>
            Analytics
          </Link>
          {isOwner && (
            <form
              action={deleteSpace}
              onSubmit={(e) => {
                if (
                  !confirm(
                    `Delete "${spaceName}"? It disappears for every member. Its records stay in the database but the app will no longer show them.`
                  )
                ) {
                  e.preventDefault();
                }
              }}
              className="border-t border-line-soft"
            >
              <input type="hidden" name="spaceId" value={spaceId} />
              <button type="submit" className={`${itemClass} text-red hover:bg-red-tint`}>
                Delete space
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
