"use client";

import Link from "next/link";
import type { WebLead } from "@/lib/portal/db";

const RANGES = [
  { d: 30, label: "30 days" },
  { d: 90, label: "90 days" },
  { d: 365, label: "12 months" },
];

const day = (iso: string) => iso.slice(0, 10);
const pretty = (p: string | null) => (!p || p === "/" ? "Home" : p.replace(/^\//, "").replace(/-/g, " "));

function rank<T extends string>(rows: { k: T }[], top = 8): { k: T; n: number; share: number }[] {
  const m = new Map<T, number>();
  for (const r of rows) m.set(r.k, (m.get(r.k) ?? 0) + 1);
  const total = rows.length || 1;
  return [...m.entries()]
    .map(([k, n]) => ({ k, n, share: n / total }))
    .sort((a, b) => b.n - a.n)
    .slice(0, top);
}

export function LeadsBoard({ leads, days }: { leads: WebLead[]; days: number }) {
  const quotes = leads.filter((l) => l.kind === "quote");
  const calls = leads.filter((l) => l.kind === "call");

  // A day at a time, so a quiet fortnight looks like a quiet fortnight.
  const byDay = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) byDay.set(day(new Date(Date.now() - i * 86_400_000).toISOString()), 0);
  for (const l of leads) {
    const k = day(l.createdAt);
    if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  const series = [...byDay.entries()];
  const peak = Math.max(1, ...series.map(([, n]) => n));
  const perWeek = leads.length / (days / 7);

  const pages = rank(leads.map((l) => ({ k: pretty(l.pagePath) })));
  const services = rank(quotes.filter((l) => l.service).map((l) => ({ k: l.service as string })));
  const sources = rank(leads.map((l) => ({ k: l.utm?.utm_source || "Direct or organic" })));

  return (
    <div className="pt-fin">
      <div className="pt-ov__tf pt-pl__tf">
        {RANGES.map((r) => (
          <Link key={r.d} href={`/portal/finance/leads?d=${r.d}`} scroll={false} className={`pt-ov__tfbtn${days === r.d ? " is-on" : ""}`}>{r.label}</Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="pt-note">
          <strong>Nothing recorded yet.</strong> Tracking went live just now, so this fills in as enquiries come through. Give it a
          few days before reading anything into it.
        </div>
      ) : (
        <>
          <div className="pt-cap__strip">
            <div className="pt-cap__stripcell"><span>Enquiries</span><strong>{leads.length}</strong><small>over {days} days</small></div>
            <div className="pt-cap__stripcell"><span>Quote requests</span><strong>{quotes.length}</strong><small>filled in the form</small></div>
            <div className="pt-cap__stripcell"><span>Phone taps</span><strong>{calls.length}</strong><small>tapped the number</small></div>
            <div className="pt-cap__stripcell"><span>A week</span><strong>{perWeek.toFixed(1)}</strong><small>on average</small></div>
          </div>

          <section className="pt-panel">
            <h2 className="pt-panel__h">Day by day</h2>
            <div className="pt-lead__bars">
              {series.map(([d, n]) => (
                <span key={d} className={`pt-lead__bar${n === 0 ? " is-none" : ""}`} style={{ height: `${(n / peak) * 100}%` }} title={`${d} · ${n}`} />
              ))}
            </div>
            <div className="pt-lead__axis"><span>{series[0]?.[0]}</span><span>{series[series.length - 1]?.[0]}</span></div>
          </section>

          <section className="pt-panel">
            <h2 className="pt-panel__h">Which pages bring them</h2>
            <p className="pt-panel__sub">The page the enquiry came from. This is the list that says which of seventy-odd pages earns anything.</p>
            <div className="pt-pl__spend">
              {pages.map((p) => (
                <div key={p.k} className="pt-pl__spendrow">
                  <span className="pt-pl__spendlabel">{p.k}</span>
                  <span className="pt-pl__spendbar" aria-hidden="true"><i style={{ width: `${Math.max(2, p.share * 100)}%` }} /></span>
                  <span className="pt-pl__spendamt">{p.n}</span>
                  <span className="pt-pl__spendpct">{Math.round(p.share * 100)}%</span>
                </div>
              ))}
            </div>
          </section>

          <div className="pt-fin__cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <section className="pt-panel" style={{ margin: 0 }}>
              <h2 className="pt-panel__h">What they want</h2>
              <div className="pt-pl__spend" style={{ marginTop: 12 }}>
                {services.length === 0 ? <div className="pf-empty">No quote requests yet.</div> : services.map((x) => (
                  <div key={x.k} className="pt-pl__spendrow">
                    <span className="pt-pl__spendlabel">{x.k}</span>
                    <span className="pt-pl__spendbar" aria-hidden="true"><i style={{ width: `${Math.max(2, x.share * 100)}%` }} /></span>
                    <span className="pt-pl__spendamt">{x.n}</span>
                    <span className="pt-pl__spendpct">{Math.round(x.share * 100)}%</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="pt-panel" style={{ margin: 0 }}>
              <h2 className="pt-panel__h">Where they came from</h2>
              <div className="pt-pl__spend" style={{ marginTop: 12 }}>
                {sources.map((x) => (
                  <div key={x.k} className="pt-pl__spendrow">
                    <span className="pt-pl__spendlabel">{x.k}</span>
                    <span className="pt-pl__spendbar" aria-hidden="true"><i style={{ width: `${Math.max(2, x.share * 100)}%` }} /></span>
                    <span className="pt-pl__spendamt">{x.n}</span>
                    <span className="pt-pl__spendpct">{Math.round(x.share * 100)}%</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
