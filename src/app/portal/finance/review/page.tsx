import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { Locked } from "@/components/portal/Locked";
import { PeriodPicker } from "@/components/portal/PeriodPicker";
import { xeroStatus } from "@/lib/portal/xero";
import { buildReview, periodChoices, type Kind } from "@/lib/finance/review";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "How we went — Team portal" };

const m$ = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
const pc = (n: number) => `${Math.round(n * 100)}%`;

/**
 * How a month or a week went, and why — in a sentence first, then the
 * figures behind it. See src/lib/finance/review.ts for how "why" is worked out.
 */
export default async function ReviewPage({ searchParams }: { searchParams: { k?: string; p?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const kind: Kind = searchParams.k === "week" ? "week" : "month";
  const { status, tenantName } = await xeroStatus();
  const choices = periodChoices();
  const options = kind === "week" ? choices.weeks : choices.months;
  const key = searchParams.p && options.some((o) => o.key === searchParams.p) ? searchParams.p : options[0].key;
  const r = status === "connected" ? await buildReview(kind, key) : null;
  const idx = options.findIndex((o) => o.key === key);
  const older = options[idx + 1]?.key;
  const newer = idx > 0 ? options[idx - 1].key : null;
  const unit = kind;

  // The bridge from a usual period's profit to this one.
  const bridge = r?.now && r.normal
    ? (() => {
        const sum = r.factors.reduce((a, f) => a + f.impact, 0);
        const other = r.now.net - r.normal.net - sum;
        const steps = [...r.factors.map((f) => ({ label: f.title, v: f.impact })), ...(Math.abs(other) >= 100 ? [{ label: "Other income & costs", v: other }] : [])];
        const max = Math.max(1, ...steps.map((s) => Math.abs(s.v)));
        return { steps, max };
      })()
    : null;

  return (
    <PortalShell user={user}>
      <FinanceHead
        title="How we went"
        lede={`A ${unit} at a time: what it made, against a usual ${unit}, and why — not enough work, a big job's materials, the overheads, or money that hasn't come in yet.`}
        xero={{ state: status, org: tenantName }}
      />

      <div className="pt-rev__bar">
        <nav className="pt-seg" aria-label="Month or week">
          <Link href="/portal/finance/review?k=month" className={`pt-seg__b${kind === "month" ? " is-on" : ""}`} aria-current={kind === "month" ? "page" : undefined}>Month</Link>
          <Link href="/portal/finance/review?k=week" className={`pt-seg__b${kind === "week" ? " is-on" : ""}`} aria-current={kind === "week" ? "page" : undefined}>Week</Link>
        </nav>
        <div className="pt-rev__nav">
          {older ? <Link className="pt-btn pt-btn--ghost pt-btn--sm" href={`/portal/finance/review?k=${kind}&p=${older}`} aria-label={`Previous ${unit}`}>←</Link> : <span />}
          <PeriodPicker label={kind === "month" ? "Which month" : "Which week"} value={key} options={options} hrefPrefix={`/portal/finance/review?k=${kind}&p=`} />
          {newer ? <Link className="pt-btn pt-btn--ghost pt-btn--sm" href={`/portal/finance/review?k=${kind}&p=${newer}`} aria-label={`Next ${unit}`}>→</Link> : <span />}
        </div>
      </div>

      {status !== "connected" ? (
        <div className="pt-note pt-note--warn"><strong>Xero isn&rsquo;t connected,</strong> so there&rsquo;s nothing to read the {unit} from. Connect it on the Finance overview.</div>
      ) : !r ? null : (
        <>
          <section className={`pt-panel pt-rev__verdict is-${r.tone}`} aria-labelledby="rev-h">
            <span className="pt-rev__eyebrow">{r.span.label}{r.partial ? ` · so far, ${r.daysGone} of ${r.daysTotal} days` : ""}</span>
            <h2 id="rev-h">{r.headline}</h2>
            {r.points.length > 0 && <ul>{r.points.map((p) => <li key={p}>{p}</li>)}</ul>}
          </section>

          {r.now && r.normal && (
            <>
              <div className="pt-rev__tiles">
                {r.factors.map((f) => (
                  <div key={f.key} className={`pt-rev__tile ${f.impact < -250 ? "is-bad" : f.impact > 250 ? "is-good" : ""}`}>
                    <span className="pt-rev__k">{f.title}</span>
                    <strong>{signed(f.impact)}</strong>
                    <span className="pt-rev__word">{f.impact < -250 ? "cost profit" : f.impact > 250 ? "added profit" : "about usual"}</span>
                    <span className="pt-rev__sub">{f.detail}</span>
                  </div>
                ))}
                {r.sales && (
                  <div className={`pt-rev__tile ${r.sales.total > 0 && r.sales.due / r.sales.total >= 0.3 ? "is-warn" : ""}`}>
                    <span className="pt-rev__k">Money in</span>
                    <strong>{m$(r.sales.paid)}</strong>
                    <span className="pt-rev__word">paid of {m$(r.sales.total)} invoiced</span>
                    <span className="pt-rev__bar2" aria-hidden="true"><i style={{ width: `${r.sales.total > 0 ? Math.min(100, (r.sales.paid / r.sales.total) * 100) : 0}%` }} /></span>
                    <span className="pt-rev__sub">{r.sales.due > 0 ? `${m$(r.sales.due)} still owed${r.sales.overdue > 0 ? `, ${m$(r.sales.overdue)} overdue` : ""}.` : "All of it paid."} Invoices dated in the {unit}, with GST.</span>
                  </div>
                )}
              </div>

              <div className="pt-two">
                <section className="pt-panel" aria-labelledby="rev-bridge">
                  <h2 id="rev-bridge" className="pt-panel__h">From a usual {unit} to this one</h2>
                  <p className="pt-panel__sub">Each part of the difference in profit, in dollars. They add up.</p>
                  {bridge && (
                    <div className="pt-rev__bridge">
                      <div className="pt-rev__brow is-end"><span>A usual {unit}&rsquo;s profit</span><strong>{m$(r.normal.net)}</strong></div>
                      {bridge.steps.map((s) => (
                        <div key={s.label} className={`pt-rev__brow ${s.v < 0 ? "is-down" : "is-up"}`}>
                          <span>{s.label}</span>
                          <span className="pt-rev__btrack" aria-hidden="true"><i style={{ width: `${(Math.abs(s.v) / bridge.max) * 100}%` }} /></span>
                          <strong>{signed(s.v)}</strong>
                        </div>
                      ))}
                      <div className="pt-rev__brow is-end"><span>This {unit}</span><strong>{m$(r.now.net)}</strong></div>
                    </div>
                  )}
                </section>

                <section className="pt-panel" aria-labelledby="rev-pl">
                  <h2 id="rev-pl" className="pt-panel__h">The profit &amp; loss</h2>
                  <p className="pt-panel__sub">From Xero, before GST. &ldquo;Usual&rdquo; is the average of the {kind === "month" ? "three months" : "four weeks"} before{r.partial ? ", cut to the days gone so far" : ""}.</p>
                  <div className="pt-fleet__wrap">
                    <table className="pt-rev__pl">
                      <thead><tr><th scope="col" /><th scope="col">This {unit}</th><th scope="col">Usual</th><th scope="col">Difference</th></tr></thead>
                      <tbody>
                        {([
                          ["Income", r.now.income, r.normal.income, 1],
                          ["Cost of sales", r.now.cogs, r.normal.cogs, -1],
                          ["Gross profit", r.now.income - r.now.cogs, r.normal.income - r.normal.cogs, 1],
                          ["Overheads", r.now.opex, r.normal.opex, -1],
                          ["Net profit", r.now.net, r.normal.net, 1],
                        ] as Array<[string, number, number, number]>).map(([label, a, b, good]) => {
                          const d = a - b;
                          const better = d * good > 0;
                          return (
                            <tr key={label} className={label === "Net profit" || label === "Gross profit" ? "is-total" : undefined}>
                              <th scope="row">{label}{label === "Gross profit" && r.now!.income > 0 ? <em> {pc((r.now!.income - r.now!.cogs) / r.now!.income)}</em> : null}</th>
                              <td>{m$(a)}</td>
                              <td>{m$(b)}</td>
                              <td className={Math.abs(d) < 250 ? "" : better ? "is-good" : "is-bad"}>{signed(d)}{Math.abs(d) >= 250 ? <span className="pt-sr">{better ? " better" : " worse"}</span> : null}</td>
                            </tr>
                          );
                        })}
                        {r.goal != null && (
                          <tr><th scope="row">Goal for the {unit}</th><td>{m$(r.goal)}</td><td /><td className={r.now.income >= r.goal ? "is-good" : "is-bad"}>{signed(r.now.income - r.goal)}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <div className="pt-two">
                <section className="pt-panel" aria-labelledby="rev-moved">
                  <h2 id="rev-moved" className="pt-panel__h">What moved</h2>
                  <p className="pt-panel__sub">The cost lines furthest from usual, either way.</p>
                  {r.moved.length ? (
                    <ul className="pt-rev__list">
                      {r.moved.map((x) => (
                        <li key={x.label}>
                          <span>{x.label}<em>{x.cogs ? "Cost of sales · " : "Overhead · "}{m$(x.now)} against a usual {m$(x.normal)}</em></span>
                          <strong className={x.diff > 0 ? "is-bad" : "is-good"}>{x.diff > 0 ? "up " : "down "}{m$(Math.abs(x.diff))}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="pt-todo__empty">Nothing moved by more than $250.</p>}
                </section>

                <section className="pt-panel" aria-labelledby="rev-bills">
                  <h2 id="rev-bills" className="pt-panel__h">Biggest bills</h2>
                  <p className="pt-panel__sub">Supplier bills dated in the {unit}, by who they were from, with GST. A big job&rsquo;s gear shows up here before its invoice does.</p>
                  {r.bills && r.bills.byContact.length ? (
                    <ul className="pt-rev__list">
                      {r.bills.byContact.slice(0, 6).map((c) => (
                        <li key={c.contact}><span>{c.contact}<em>{c.count} {c.count === 1 ? "bill" : "bills"}{c.due > 0 ? ` · ${m$(c.due)} still to pay` : ""}</em></span><strong>{m$(c.total)}</strong></li>
                      ))}
                    </ul>
                  ) : <p className="pt-todo__empty">{r.bills ? `No bills dated in the ${unit}.` : "Xero didn't send the bills."}</p>}
                </section>
              </div>

              <section className="pt-panel" aria-labelledby="rev-inv">
                <h2 id="rev-inv" className="pt-panel__h">Biggest invoices</h2>
                <p className="pt-panel__sub">Sales invoices dated in the {unit}, biggest first, and whether each has been paid.</p>
                {r.sales && r.sales.top.length ? (
                  <div className="pt-fleet__wrap">
                    <table className="pt-rev__pl pt-rev__inv">
                      <thead><tr><th scope="col">Customer</th><th scope="col">Invoice</th><th scope="col">Amount</th><th scope="col">Still owed</th></tr></thead>
                      <tbody>
                        {r.sales.top.map((i) => (
                          <tr key={`${i.number}-${i.contact}`}>
                            <th scope="row">{i.contact}</th>
                            <td>{i.number}</td>
                            <td>{m$(i.total)}</td>
                            <td className={i.due > 0 ? (i.overdue ? "is-bad" : "is-warn") : "is-good"}>{i.due > 0 ? `${m$(i.due)}${i.overdue ? " · overdue" : ""}` : "Paid"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="pt-todo__empty">{r.sales ? `No invoices dated in the ${unit}.` : "Xero didn't send the invoices."}</p>}
              </section>
            </>
          )}
        </>
      )}
    </PortalShell>
  );
}
