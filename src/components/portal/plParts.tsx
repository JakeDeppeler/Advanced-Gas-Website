/**
 * The pieces the profit & loss statement and its overview summary both need.
 *
 * No "use client" here on purpose: the full statement pulls these into the
 * client bundle, the overview summary renders them on the server.
 */

export type PLLine = { label: string; amount: number };
export type PLSection = { title: string; kind: "in" | "out" | "summary"; lines: PLLine[]; total: number };
export type PLDetail = {
  sections: PLSection[];
  income: number; costOfSales: number; grossProfit: number | null;
  operatingExpenses: number; netProfit: number;
};

export const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
export const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${money(Math.abs(n))}`;

export function pctChange(now: number, before: number): string | null {
  if (!before) return null;
  const p = ((now - before) / Math.abs(before)) * 100;
  if (!Number.isFinite(p)) return null;
  return `${p > 0 ? "+" : "−"}${Math.abs(Math.round(p))}%`;
}

/** Whether a movement is welcome depends on which side of the report it's on. */
export function toneFor(kind: "in" | "out", delta: number): "good" | "bad" | "flat" {
  if (Math.abs(delta) < 1) return "flat";
  return (kind === "in") === (delta > 0) ? "good" : "bad";
}

export type MoverRow = { section: string; kind: "in" | "out"; label: string; now: number; before: number };

/** Every account line across both periods, so one that vanished still shows up. */
export function mergeRows(now: PLDetail, before: PLDetail | null): MoverRow[] {
  const map = new Map<string, MoverRow>();
  for (const s of now.sections) {
    if (s.kind === "summary") continue;
    for (const l of s.lines) {
      map.set(`${s.title}|${l.label}`, { section: s.title, kind: s.kind, label: l.label, now: l.amount, before: 0 });
    }
  }
  for (const s of before?.sections ?? []) {
    if (s.kind === "summary") continue;
    for (const l of s.lines) {
      const k = `${s.title}|${l.label}`;
      const hit = map.get(k);
      if (hit) hit.before = l.amount;
      else map.set(k, { section: s.title, kind: s.kind, label: l.label, now: 0, before: l.amount });
    }
  }
  return [...map.values()];
}

/** Movers ranked by how far each line shifted, largest first. */
export function rankMovers(now: PLDetail, before: PLDetail | null): MoverRow[] {
  if (!before) return [];
  return mergeRows(now, before)
    .filter((r) => Math.abs(r.now - r.before) >= 1)
    .sort((a, b) => Math.abs(b.now - b.before) - Math.abs(a.now - a.before));
}

export function Delta({ kind, now, before }: { kind: "in" | "out"; now: number; before: number }) {
  const d = now - before;
  const p = pctChange(now, before);
  return (
    <span className={`pt-pl__delta is-${toneFor(kind, d)}`}>
      {signed(d)}{p ? <em> {p}</em> : null}
    </span>
  );
}

export function Mover({ row }: { row: MoverRow }) {
  const d = row.now - row.before;
  return (
    <div className={`pt-pl__mover is-${toneFor(row.kind, d)}`}>
      <div className="pt-pl__moverid">
        <strong>{row.label}</strong>
        <span>{row.section}</span>
      </div>
      <div className="pt-pl__moverfig">
        <span className="pt-pl__was">{money(row.before)} → {money(row.now)}</span>
        <Delta kind={row.kind} now={row.now} before={row.before} />
      </div>
    </div>
  );
}

/**
 * The headline figures. Plenty of service businesses book everything as an
 * operating expense and have no cost of sales at all; showing those two there
 * would just repeat money in.
 */
export function headlines(now: PLDetail, before: PLDetail | null) {
  const hasCostOfSales = now.costOfSales !== 0 || (before?.costOfSales ?? 0) !== 0;
  const gross = (d: PLDetail) => d.grossProfit ?? d.income - d.costOfSales;
  return [
    { label: "Money in", kind: "in" as const, now: now.income, before: before?.income ?? null },
    ...(hasCostOfSales ? [
      { label: "Cost of sales", kind: "out" as const, now: now.costOfSales, before: before?.costOfSales ?? null },
      { label: "Gross profit", kind: "in" as const, now: gross(now), before: before ? gross(before) : null },
    ] : []),
    { label: "Running costs", kind: "out" as const, now: now.operatingExpenses, before: before?.operatingExpenses ?? null },
    { label: "Net profit", kind: "in" as const, now: now.netProfit, before: before?.netProfit ?? null },
  ];
}

export type SpendLine = { label: string; section: string; amount: number; share: number };

/**
 * The largest money-out accounts, biggest first. When a period runs at a loss
 * this is the question actually being asked — not what changed, but where it
 * all went.
 */
export function topSpend(d: PLDetail, limit = 6): SpendLine[] {
  const out = d.sections
    .filter((s) => s.kind === "out")
    .flatMap((s) => s.lines.map((l) => ({ label: l.label, section: s.title, amount: l.amount })))
    .filter((l) => l.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const total = out.reduce((a, l) => a + l.amount, 0) || 1;
  return out.slice(0, limit).map((l) => ({ ...l, share: l.amount / total }));
}

export function SpendList({ lines }: { lines: SpendLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="pt-pl__spend">
      {lines.map((l) => (
        <div key={`${l.section}|${l.label}`} className="pt-pl__spendrow">
          <span className="pt-pl__spendlabel">{l.label}</span>
          <span className="pt-pl__spendbar" aria-hidden="true"><i style={{ width: `${Math.max(2, l.share * 100)}%` }} /></span>
          <span className="pt-pl__spendamt">{money(l.amount)}</span>
          <span className="pt-pl__spendpct">{Math.round(l.share * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
