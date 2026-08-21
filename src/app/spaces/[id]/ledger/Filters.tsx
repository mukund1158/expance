"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RANGE_LABELS, type RangeKey } from "@/lib/dates";

type Member = { userId: string; name: string };

export function Filters({
  spaceId,
  members,
  rangeKey,
  from,
  to,
  member,
  type,
  today,
}: {
  spaceId: string;
  members: Member[];
  rangeKey: RangeKey;
  from: string;
  to: string;
  member?: string;
  type?: "EXPENSE" | "INCOME";
  today: string;
}) {
  const router = useRouter();
  const [customOpen, setCustomOpen] = useState(rangeKey === "custom");
  const [customFrom, setCustomFrom] = useState(rangeKey === "custom" ? from : "");
  const [customTo, setCustomTo] = useState(rangeKey === "custom" ? to : today);

  const navigate = (patch: {
    range?: string;
    from?: string;
    to?: string;
    member?: string;
    type?: string;
  }) => {
    const merged = {
      range: rangeKey as string,
      from: rangeKey === "custom" ? from : "",
      to: rangeKey === "custom" ? to : "",
      member: member ?? "",
      type: type ?? "",
      ...patch,
    };
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    router.push(`/spaces/${spaceId}/ledger?${q.toString()}`);
  };

  const presetKeys = Object.keys(RANGE_LABELS) as (keyof typeof RANGE_LABELS)[];

  return (
    <div className="mb-4 space-y-2">
      {/* One scrollable line of date presets */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {presetKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setCustomOpen(false);
              navigate({ range: key, from: "", to: "" });
            }}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
              rangeKey === key && !customOpen
                ? "border-red bg-red-tint text-red"
                : "border-line bg-paper-raised text-ink"
            }`}
          >
            {RANGE_LABELS[key]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
            rangeKey === "custom" || customOpen
              ? "border-red bg-red-tint text-red"
              : "border-line bg-paper-raised text-ink"
          }`}
        >
          Custom
        </button>
      </div>

      {/* One line: member + type dropdowns */}
      <div className="flex gap-2">
        {members.length > 1 && (
          <select
            aria-label="Filter by member"
            value={member ?? ""}
            onChange={(e) => navigate({ member: e.target.value })}
            className="field flex-1 px-2.5 py-1.5 text-sm"
          >
            <option value="">Everyone</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Filter by type"
          value={type ?? ""}
          onChange={(e) => navigate({ type: e.target.value })}
          className="field flex-1 px-2.5 py-1.5 text-sm"
        >
          <option value="">All entries</option>
          <option value="EXPENSE">Expenses</option>
          <option value="INCOME">Income</option>
        </select>
      </div>

      {/* Custom dates, only when opened */}
      {customOpen && (
        <div className="flex items-center gap-2">
          <input
            aria-label="From date"
            type="date"
            max={today}
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="field flex-1 px-2.5 py-1.5 text-sm"
          />
          <span className="text-xs text-ink-muted">to</span>
          <input
            aria-label="To date"
            type="date"
            max={today}
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="field flex-1 px-2.5 py-1.5 text-sm"
          />
          <button
            type="button"
            disabled={!customFrom || !customTo || customFrom > customTo}
            onClick={() =>
              navigate({ range: "custom", from: customFrom, to: customTo })
            }
            className="btn-primary px-3 py-1.5 text-sm"
          >
            Go
          </button>
        </div>
      )}
    </div>
  );
}
