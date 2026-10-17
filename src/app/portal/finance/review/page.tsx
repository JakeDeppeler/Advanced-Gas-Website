import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { PeriodPicker } from "@/components/portal/PeriodPicker";
import { xeroStatus } from "@/lib/portal/xero";
import { buildReview, periodChoices, type Kind } from "@/lib/finance/review";
import { Bad, Btn, Card, Empty, Good, Grid, Group, Head, Kv, Pill, Row, Say, Tabs, Tile, Two, none, type Status } from "@/components/portal/kit/Kit";
import { Diff, XeroOff } from "@/components/portal/finance/Parts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "How we went · Team portal" };

const m$ = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
// Rounded before the sign is picked, so 30 cents either way reads "$0", not "−$0".
const signed = (n: number) => { const r = Math.round(n); return `${r > 0 ? "+" : r < 0 ? "−" : ""}$${Math.abs(r).toLocaleString("en-AU")}`; };
const pc = (n: number) => `${Math.round(n * 100)}%`;

/**
 * How a month or a week went, and why — in a sentence first, then the
 * figures behind it. See src/lib/finance/review.ts for how "why" is worked out.
 * Every difference here carries its sign and its colour from one place
 * (Diff), with costs read the other way round: a cost that fell helped.
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

  // A part of the difference that moved profit by less than this is "about usual".
  const NOISE = 250;
  const impactSt = (v: number): Status => (v < -NOISE ? { k: "bad", w: "Cost profit" } : v > NOISE ? { k: "good", w: "Added profit" } : none("About usual"));
  const href = (k: Kind, p?: string) => `/portal/finance/review?k=${k}${p ? `&p=${p}` : ""}`;

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="How we went" sub={`${options[idx]?.label ?? ""} · against a usual ${unit} · from Xero${tenantName ? ` · ${tenantName}` : ""}`} info={[
          ["Usual", `The average of the ${kind === "month" ? "three months" : "four weeks"} before${r?.partial ? ", cut to the days gone so far" : ""}.`],
          ["The work", "What more or less work than usual did to profit, at a usual margin."],
          ["Materials & subbies", "What a higher or lower share of sales going on cost of sales did to profit."],
          ["Overheads", "Running costs above or below usual. Lower is better, so it shows as profit added."],
        ]} />
        <div className="pk-rev-bar">
          <Tabs on={kind} label="Month or week" items={[
            { key: "month", label: "Month", href: href("month") },
            { key: "week", label: "Week", href: href("week") },
          ]} />
          <div className="pk-btns" style={{ alignItems: "center" }}>
            {older ? <Btn href={href(kind, older)} quiet>‹ Earlier</Btn> : null}
            <PeriodPicker label={kind === "month" ? "Which month" : "Which week"} value={key} options={options} hrefPrefix={`${href(kind)}&p=`} />
            {newer ? <Btn href={href(kind, newer)} quiet>Later ›</Btn> : null}
          </div>
        </div>

        {status !== "connected" ? <XeroOff state={status} what={`${unit} to read`} /> : !r ? null : !r.now || !r.normal ? (
          <Empty>Xero didn&rsquo;t return the {unit} or the ones before it, so there&rsquo;s nothing to compare. That isn&rsquo;t the same as nothing happening, reload in a minute.</Empty>
        ) : (
          <>
            <Say>
              {r.tone === "good" ? <Good>{r.headline}</Good> : r.tone === "bad" ? <Bad>{r.headline}</Bad> : r.headline}
            </Say>
            {r.partial && <p className="pk-note" style={{ marginTop: -10 }}>{r.span.label} so far: {r.daysGone} of {r.daysTotal} days, so &ldquo;usual&rdquo; is cut to the same days.</p>}

            <Grid cols={4}>
              {r.factors.map((f) => (
                <Tile key={f.key} label={f.title} st={impactSt(f.impact)} fig={signed(f.impact)} frac={bridge ? Math.abs(f.impact) / bridge.max : null} sub={f.detail} />
              ))}
              {r.sales && (
                <Tile label="Money in" st={r.sales.total > 0 && r.sales.due / r.sales.total >= 0.3 ? { k: "mid", w: "Lots owed" } : { k: "good", w: "Coming in" }}
                  fig={m$(r.sales.paid)} frac={r.sales.total > 0 ? r.sales.paid / r.sales.total : null}
                  sub={`paid of ${m$(r.sales.total)} invoiced${r.sales.due > 0 ? ` · ${m$(r.sales.due)} still owed${r.sales.overdue > 0 ? `, ${m$(r.sales.overdue)} overdue` : ""}` : ""}`} />
              )}
            </Grid>

            {r.points.length > 0 && (
              <Card title="Why" aside="biggest reason first">
                {r.points.map((p) => <Kv key={p} t={p} />)}
              </Card>
            )}

            <div className="pk-grid2">
              <Card title={`From a usual ${unit} to this one`} aside="each part of the difference in profit · they add up">
                {bridge && (
                  <div className="pk-where">
                    <div className="pk-where-r pk-rev-end"><span className="l">A usual {unit}&rsquo;s profit</span><span /><span className="v">{m$(r.normal.net)}</span></div>
                    {bridge.steps.map((st) => (
                      <div key={st.label} className="pk-where-r pk-rev-step">
                        <span className="l">{st.label}</span>
                        <span className={`b ${st.v < 0 ? "dn" : "up"}`} aria-hidden="true"><i style={{ width: `${(Math.abs(st.v) / bridge.max) * 100}%` }} /></span>
                        <span className="v"><Diff d={st.v} /></span>
                      </div>
                    ))}
                    <div className="pk-where-r pk-rev-end"><span className="l">This {unit}</span><span /><span className="v">{m$(r.now.net)}</span></div>
                  </div>
                )}
              </Card>

              <Card title="The profit & loss" aside="before GST">
                <div className="pk-tbl-wrap">
                  <table className="pk-tbl">
                    <thead><tr><th /><th>This {unit}</th><th>Usual</th><th>Difference</th></tr></thead>
                    <tbody>
                      {([
                        ["Income", r.now.income, r.normal.income, false],
                        ["Cost of sales", r.now.cogs, r.normal.cogs, true],
                        ["Gross profit", r.now.income - r.now.cogs, r.normal.income - r.normal.cogs, false],
                        ["Overheads", r.now.opex, r.normal.opex, true],
                        ["Net profit", r.now.net, r.normal.net, false],
                      ] as Array<[string, number, number, boolean]>).map(([label, a, b, cost]) => (
                        <tr key={label} style={label.endsWith("profit") ? { fontWeight: 700 } : undefined}>
                          <td>{label}{label === "Gross profit" && r.now!.income > 0 ? <span className="ks"> {pc((r.now!.income - r.now!.cogs) / r.now!.income)}</span> : null}</td>
                          <td>{m$(a)}</td>
                          <td>{m$(b)}</td>
                          <td>{Math.abs(a - b) < NOISE ? <span className="ks">about the same</span> : <Diff d={a - b} lowerIsBetter={cost} />}</td>
                        </tr>
                      ))}
                      {r.goal != null && (
                        <tr><td>Goal for the {unit} <span className="ks">before GST</span></td><td>{m$(r.goal)}</td><td /><td><Diff d={r.now.income - r.goal} /></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="pk-grid2">
              <div>
                <div className="pk-lh">What moved</div>
                {r.moved.length ? (
                  <Group>
                    {r.moved.map((x) => (
                      <Row key={x.label} title={x.label} sub={`${x.cogs ? "Cost of sales" : "Overhead"} · ${m$(x.now)} against a usual ${m$(x.normal)}`}
                        end={<Pill st={x.diff > 0 ? { k: "bad", w: `Up ${m$(x.diff)}`, s: "▲" } : { k: "good", w: `Down ${m$(-x.diff)}`, s: "▼" }} />} />
                    ))}
                  </Group>
                ) : <Empty>Nothing moved by more than $250.</Empty>}
              </div>
              <div>
                <div className="pk-lh">Biggest bills · with GST</div>
                {r.bills && r.bills.byContact.length ? (
                  <Group>
                    {r.bills.byContact.slice(0, 6).map((c) => (
                      <Row key={c.contact} title={c.contact} sub={`${c.count} ${c.count === 1 ? "bill" : "bills"}${c.due > 0 ? ` · ${m$(c.due)} still to pay` : " · paid"}`} end={<b>{m$(c.total)}</b>} />
                    ))}
                  </Group>
                ) : <Empty>{r.bills ? `No bills dated in the ${unit}.` : "Xero didn’t send the bills."}</Empty>}
              </div>
            </div>

            <Card title="Biggest invoices" aside={`dated in the ${unit} · with GST · whether each is paid`}>
              {r.sales && r.sales.top.length ? (
                <div className="pk-tbl-wrap">
                  <table className="pk-tbl">
                    <thead><tr><th>Customer</th><th>Invoice</th><th>Amount</th><th>Paid?</th></tr></thead>
                    <tbody>
                      {r.sales.top.map((i) => (
                        <tr key={`${i.number}-${i.contact}`}>
                          <td><b>{i.contact}</b></td>
                          <td>{i.number}</td>
                          <td>{m$(i.total)}</td>
                          <td><Pill st={i.due <= 0 ? { k: "good", w: "Paid" } : i.overdue ? { k: "bad", w: `${m$(i.due)} overdue` } : { k: "mid", w: `${m$(i.due)} owed` }} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty>{r.sales ? `No invoices dated in the ${unit}.` : "Xero didn’t send the invoices."}</Empty>}
            </Card>
          </>
        )}
      </div>
    </PortalShell>
  );
}
