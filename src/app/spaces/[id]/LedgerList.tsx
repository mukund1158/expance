import Link from "next/link";
import { formatDay, formatMoney } from "@/lib/format";

export type LedgerEntry = {
  id: string;
  type: "EXPENSE" | "INCOME";
  amountBase: { toString(): string };
  amountOriginal: { toString(): string };
  currency: "INR" | "USD";
  paymentMethod: string;
  date: Date;
  note: string | null;
  category: { name: string };
  member: { name: string };
};

export function LedgerList({
  spaceId,
  entries,
  currency,
}: {
  spaceId: string;
  entries: LedgerEntry[];
  currency: "INR" | "USD";
}) {
  const byDay = new Map<string, LedgerEntry[]>();
  for (const t of entries) {
    const key = t.date.toISOString().slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(t);
    byDay.set(key, list);
  }

  return (
    <div className="space-y-5">
      {[...byDay.entries()].map(([day, list]) => (
        <div key={day}>
          <p className="mb-1.5 text-xs font-semibold text-ink-muted">
            {formatDay(list[0].date)}
          </p>
          <ul className="divide-y divide-line-soft rounded-xl border border-line bg-paper-raised">
            {list.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/spaces/${spaceId}/tx/${t.id}`}
                  className="flex items-center gap-3 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t.note || t.category.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {t.category.name} · {t.member.name} ·{" "}
                      {t.paymentMethod.replace("_", " ").toLowerCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`amount text-sm font-semibold ${
                        t.type === "INCOME" ? "text-credit" : ""
                      }`}
                    >
                      {t.type === "INCOME" ? "+" : "−"}
                      {formatMoney(t.amountBase, currency)}
                    </p>
                    {t.currency !== currency && (
                      <p className="amount text-xs text-ink-muted">
                        {formatMoney(t.amountOriginal, t.currency)}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
