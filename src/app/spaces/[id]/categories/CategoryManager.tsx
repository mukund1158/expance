"use client";

import { useActionState } from "react";
import { addCategory, deleteCategory, renameCategory } from "./actions";

type Category = {
  id: string;
  name: string;
  kind: "EXPENSE" | "INCOME";
  inUse: boolean;
};

function CategoryRow({ spaceId, category }: { spaceId: string; category: Category }) {
  const [renameError, renameAction, renaming] = useActionState(renameCategory, undefined);
  const [deleteError, deleteAction, deleting] = useActionState(deleteCategory, undefined);
  const error = renameError ?? deleteError;

  return (
    <li className="p-3">
      <div className="flex items-center gap-2">
        <form action={renameAction} className="flex flex-1 items-center gap-2">
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="categoryId" value={category.id} />
          <input
            name="name"
            type="text"
            required
            maxLength={40}
            defaultValue={category.name}
            aria-label={`Rename ${category.name}`}
            className="field flex-1 px-2.5 py-1.5 text-sm"
          />
          <button type="submit" disabled={renaming} className="btn-quiet shrink-0">
            {renaming ? "…" : "Rename"}
          </button>
        </form>
        {category.inUse ? (
          <span className="shrink-0 text-xs text-ink-muted">in use</span>
        ) : (
          <form
            action={deleteAction}
            onSubmit={(e) => {
              if (!confirm(`Delete category "${category.name}"?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="spaceId" value={spaceId} />
            <input type="hidden" name="categoryId" value={category.id} />
            <button
              type="submit"
              disabled={deleting}
              className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-sm text-red"
              aria-label={`Delete ${category.name}`}
            >
              ✕
            </button>
          </form>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red">
          {error}
        </p>
      )}
    </li>
  );
}

function AddForm({ spaceId, kind }: { spaceId: string; kind: "EXPENSE" | "INCOME" }) {
  const [error, formAction, pending] = useActionState(addCategory, undefined);
  return (
    <form action={formAction} className="mt-2">
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="kind" value={kind} />
      <div className="flex gap-2">
        <input
          name="name"
          type="text"
          required
          maxLength={40}
          placeholder={kind === "EXPENSE" ? "New expense category" : "New income category"}
          className="field flex-1 px-2.5 py-1.5 text-sm"
        />
        <button type="submit" disabled={pending} className="btn-primary shrink-0 px-3 py-1.5 text-sm">
          {pending ? "…" : "Add"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red">
          {error}
        </p>
      )}
    </form>
  );
}

export function CategoryManager({
  spaceId,
  categories,
}: {
  spaceId: string;
  categories: Category[];
}) {
  return (
    <div className="space-y-8">
      {(["EXPENSE", "INCOME"] as const).map((kind) => (
        <section key={kind}>
          <h2 className="eyebrow mb-3">
            {kind === "EXPENSE" ? "Expense categories" : "Income categories"}
          </h2>
          <ul className="divide-y divide-line-soft rounded-xl border border-line bg-paper-raised">
            {categories
              .filter((c) => c.kind === kind)
              .map((c) => (
                <CategoryRow key={c.id} spaceId={spaceId} category={c} />
              ))}
          </ul>
          <AddForm spaceId={spaceId} kind={kind} />
        </section>
      ))}
    </div>
  );
}
