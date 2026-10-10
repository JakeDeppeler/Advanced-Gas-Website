"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveGrowth } from "@/app/portal/finance/capacity/actions";
import { markupPerVan, type Growth, type Markup } from "@/lib/portal/growthTypes";

const m0 = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

/**
 * The other half of how the business makes money. The hour is priced to cover
 * every wage and every overhead; what the crew installs is marked up on top,
 * and that markup is the profit. So Planning needs two things per van: how
 * much it buys, and what it's marked up by.
 *
 * Xero files materials and units together, so its figure is offered as a
 * starting point to split, never filled in on its own.
 */
export function MarkupEditor({ growth, xeroBought, xeroAccount, vans }: {
  growth: Growth;
  /** Materials and units bought in the last twelve months, from Xero's cost of sales. */
  xeroBought: number | null;
  xeroAccount: string | null;
  vans: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [m, setM] = useState<Markup>(growth.markup);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = JSON.stringify(m) !== JSON.stringify(growth.markup);
  const perVanXero = xeroBought != null && vans > 0 ? xeroBought / vans : null;

  const f = (k: keyof Markup, label: string, hint: string, pre: string, post: string) => (
    <label className="pt-nums__f" htmlFor={`mk-${k}`}>
      <span>{label}<em>{hint}</em></span>
      <span className="pt-calc__field">
        {pre && <span className="pt-calc__post">{pre}</span>}
        <input id={`mk-${k}`} type="number" min={0} step="any" value={m[k] || ""} placeholder="0"
          onChange={(e) => setM({ ...m, [k]: Math.max(0, Number(e.target.value) || 0) })} />
        {post && <span className="pt-calc__post">{post}</span>}
      </span>
    </label>
  );

  return (
    <div className="pt-nums">
      <section className="pt-panel" aria-labelledby="mk-h">
        <h2 id="mk-h" className="pt-panel__h">Markup on materials and units</h2>
        <p className="pt-panel__sub">
          The hourly rate covers every wage and overhead, so whatever the crew installs is marked up on top as profit. Set what one van buys in a year, at cost, and the markup you put on it.
        </p>
        {perVanXero != null && (
          <p className="pt-nums__hint">
            Xero: <strong>{m0(xeroBought as number)}</strong> bought in the last 12 months{xeroAccount ? ` under “${xeroAccount}”` : ""}, materials and units together — about <strong>{m0(perVanXero)}</strong> for each of the {vans} vans. Split that between the two boxes below.
          </p>
        )}
        <div className="pt-nums__grid pt-nums__grid--two">
          {f("materialsPerVan", "Materials a van buys", "a year, at cost", "$", "")}
          {f("materialsPct", "Markup on materials", "on top of cost", "", "%")}
          {f("unitsPerVan", "Units a van installs", "a year, at cost", "$", "")}
          {f("unitsPct", "Markup on units", "on top of cost", "", "%")}
        </div>
        <p className="pt-nums__sum">
          <span><strong>{m0(markupPerVan(m))}</strong> profit a year from one busy van&rsquo;s materials and units</span>
          <span><strong>{m0(markupPerVan(m) / 46)}</strong> a working week</span>
        </p>
        <div className="pt-nums__acts">
          <button type="button" className="pt-btn pt-btn--navy" disabled={!dirty || pending}
            onClick={() => start(async () => {
              const r = await saveGrowth({ ...growth, markup: m });
              setMsg(r.ok ? { ok: true, text: "Saved. Planning uses these now." } : { ok: false, text: r.error ?? "Couldn't save." });
              if (r.ok) router.refresh();
            })}>
            {pending ? "Saving…" : "Save the markups"}
          </button>
          {msg && <span className={`pt-nums__msg ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</span>}
        </div>
      </section>
    </div>
  );
}
