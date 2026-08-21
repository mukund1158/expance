import { formatMoney } from "@/lib/format";

export type DonutSlice = { label: string; value: number };

const SLOT_VARS = [
  "var(--cat-1)",
  "var(--cat-2)",
  "var(--cat-3)",
  "var(--cat-4)",
  "var(--cat-5)",
  "var(--cat-6)",
];
const OTHER_VAR = "var(--cat-other)";
export const MAX_SLICES = SLOT_VARS.length;

const CX = 70;
const CY = 70;
const R_OUTER = 66;
const R_INNER = 42;
// A ~2px visual gap between segments, expressed as an angle at the outer edge.
const GAP_ANGLE = 2 / R_OUTER;

function point(r: number, angle: number): string {
  return `${(CX + r * Math.cos(angle)).toFixed(2)} ${(CY + r * Math.sin(angle)).toFixed(2)}`;
}

function arcPath(start: number, end: number): string {
  const large = end - start > Math.PI ? 1 : 0;
  return [
    `M ${point(R_OUTER, start)}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${point(R_OUTER, end)}`,
    `L ${point(R_INNER, end)}`,
    `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${point(R_INNER, start)}`,
    "Z",
  ].join(" ");
}

function compact(n: number, currency: "INR" | "USD"): string {
  const sym = currency === "INR" ? "₹" : "$";
  if (n >= 10_000_000) return `${sym}${(n / 10_000_000).toFixed(1)}cr`;
  if (n >= 100_000) return `${sym}${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `${sym}${(n / 1_000).toFixed(1)}k`;
  return `${sym}${Math.round(n)}`;
}

/**
 * Donut of expense share by category. Slices beyond the palette fold into
 * "Other". Identity is never color-alone: the legend carries every name,
 * amount and percentage.
 */
export function CategoryDonut({
  rows,
  total,
  currency,
}: {
  rows: DonutSlice[]; // sorted desc by value
  total: number;
  currency: "INR" | "USD";
}) {
  const visible = rows.slice(0, MAX_SLICES - 1);
  const rest = rows.slice(MAX_SLICES - 1);
  const slices = [...visible];
  if (rest.length === 1) slices.push(rest[0]);
  else if (rest.length > 1) {
    slices.push({
      label: `Other (${rest.length})`,
      value: rest.reduce((sum, r) => sum + r.value, 0),
    });
  }
  const colorOf = (i: number) =>
    rest.length > 1 && i === slices.length - 1 ? OTHER_VAR : SLOT_VARS[i];

  // Build segment angles, starting at 12 o'clock.
  let angle = -Math.PI / 2;
  const segments = slices.map((s, i) => {
    const sweep = (s.value / total) * Math.PI * 2;
    const seg = { ...s, color: colorOf(i), start: angle, end: angle + sweep };
    angle += sweep;
    return seg;
  });
  const gap = slices.length > 1 ? GAP_ANGLE / 2 : 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
      <svg
        width="140"
        height="140"
        viewBox="0 0 140 140"
        role="img"
        aria-label={`Spending share by category, ${formatMoney(total, currency)} total`}
        className="shrink-0"
      >
        {segments.length === 1 ? (
          <circle
            cx={CX}
            cy={CY}
            r={(R_OUTER + R_INNER) / 2}
            fill="none"
            stroke={segments[0].color}
            strokeWidth={R_OUTER - R_INNER}
          />
        ) : (
          segments.map((s) => {
            const start = s.start + gap;
            const end = Math.max(s.end - gap, start + 0.005);
            return <path key={s.label} d={arcPath(start, end)} fill={s.color} />;
          })
        )}
        <text
          x={CX}
          y={CY - 3}
          textAnchor="middle"
          className="amount fill-ink text-[15px] font-semibold"
        >
          {compact(total, currency)}
        </text>
        <text
          x={CX}
          y={CY + 13}
          textAnchor="middle"
          className="fill-ink-muted text-[9px]"
        >
          spent
        </text>
      </svg>

      <ul className="w-full space-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-baseline gap-2 font-medium">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 shrink-0 self-center rounded-sm"
                style={{ background: s.color }}
              />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="amount shrink-0">
              {formatMoney(s.value, currency)}
              <span className="ml-1.5 text-xs text-ink-muted">
                {Math.round((s.value / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
