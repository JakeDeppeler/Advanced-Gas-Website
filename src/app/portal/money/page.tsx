import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { latestBoard } from "@/lib/portal/office";
import { getGoals } from "@/lib/portal/goals";
import { xeroStatus } from "@/lib/portal/xero";
import { owedInvoices, type OwedInvoice, type Segment } from "@/lib/portal/run/money";
import { money, pc, plural } from "@/lib/portal/run/month";
import { BENCH } from "@/lib/portal/benchmarks";
import { Bad, Btn, Card, Grid, Head, KpiHead, Kv, Lh, Note, Say, Tabs, Tile, status } from "@/components/portal/kit/Kit";
import Link from "next/link";
import { moneyFlow } from "@/lib/portal/run/flow";
import { FlowChart } from "@/components/portal/money/FlowChart";
import { InvoiceTable } from "@/components/portal/money/InvoiceTable";
import { XeroOff } from "@/components/portal/finance/Parts";
import { ArTable } from "@/components/portal/ArTable";
import { TERMS, arReport, pastTerms } from "@/lib/portal/ar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Owed to us · Team portal" };

const sum = (l: OwedInvoice[]) => l.reduce((a, i) => a + i.amountDue, 0);

/**
 * Profit & finance › Owed to us: every unpaid invoice — ServiceTitan's from
 * 17 September, when it became the ledger, and Xero's from before — split
 * into real estate and domestic, bucketed by how late it is, oldest first.
 * Where each comes from, and why, is on owedInvoices and ST_LEDGER_FROM.
 */
export default async function OwedPage({ searchParams }: { searchParams: { seg?: string; r?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Owed to us" forWhom="managers" />;

  const seg: Segment | "all" = searchParams.seg === "realestate" || searchParams.seg === "domestic" ? searchParams.seg : "all";
  const span: 6 | 12 = searchParams.r === "12" ? 12 : 6;
  const [{ status: xs }, owed, board, goals, flow] = await Promise.all([xeroStatus(), owedInvoices().catch(() => null), latestBoard(), getGoals(), moneyFlow(span).catch(() => null)]);
  const all = owed?.list ?? null;
  const m = board?.metrics ?? null;
  const count = (k: Segment | "all") => (all ?? []).filter((i) => k === "all" || i.segment === k).length;
  const late = (k: Segment | "all") => (all ?? []).some((i) => (k === "all" || i.segment === k) && i.daysOver > 0);

  const list = (all ?? []).filter((i) => seg === "all" || i.segment === seg);
  // Three different kinds of money out: the balance on jobs not done yet (a
  // deposit taken, the rest owed once the work's finished), invoices not due
  // yet, and invoices past their due date.
  const work = list.filter((i) => i.stage === "work").sort((a, b) => b.amountDue - a.amountDue);
  const billed = list.filter((i) => i.stage === "billed");
  const over = billed.filter((i) => i.daysOver > 0).sort((a, b) => b.daysOver - a.daysOver);
  const notDue = billed.filter((i) => i.daysOver <= 0).sort((a, b) => b.daysOver - a.daysOver);
  const tot = sum(list), b1 = sum(over.filter((i) => i.daysOver <= 30)), b2 = sum(over.filter((i) => i.daysOver > 30));
  // Rapport's four columns of age, with not-due-yet in front of them: the
  // money on terms is the bar the others should be shrinking into.
  const AGES: Array<[string, string, number, number]> = [["Not due", "Not due yet", -1e9, 0], ["1–30", "1–30 days late", 1, 30], ["31–60", "31–60 days late", 31, 60], ["61–90", "61–90 days late", 61, 90], ["90+", "Over 90 days late", 91, 1e9]];
  const ages = AGES.map(([short, label, lo, hi]) => { const l = billed.filter((i) => i.daysOver >= lo && i.daysOver <= hi); return { short, label, value: sum(l), n: l.length, lo }; });
  const ageMax = Math.max(1, ...ages.map((a) => a.value));
  const oldest = over.filter((i) => i.daysOver > 30);
  const flowIn = flow ? flow.reduce((a, f) => a + (f.collected ?? 0), 0) : null;
  const flowOut = flow ? flow.reduce((a, f) => a + f.invoiced, 0) : 0;
  const paid = flow?.some((f) => f.collected != null) ?? false;
  const q = (r: 6 | 12) => { const u = new URLSearchParams(); if (seg !== "all") u.set("seg", seg); if (r === 12) u.set("r", "12"); const t = u.toString(); return `/portal/money${t ? `?${t}` : ""}`; };
  const segHref = (k: string) => { const u = new URLSearchParams(); if (k !== "all") u.set("seg", k); if (span === 12) u.set("r", "12"); const t = u.toString(); return `/portal/money${t ? `?${t}` : ""}`; };
  const byName = list.filter((i) => i.by === "name").length;

  return (
    <PortalShell user={user}>
      <div className="pk">
        <KpiHead title={<>Owed<br />to us</>} kpis={[
          { icon: "card", fig: m?.paidMonth != null ? money(m.paidMonth) : "", label: "Collected this month" },
          { icon: "doc", fig: money(sum(notDue)), label: "Invoiced, not yet due" },
          { icon: "clock", fig: money(b1 + b2), label: "Overdue", badge: over.length ? `${over.length} late` : undefined, tone: "down" },
        ]} />
        <Head title="" sub="ServiceTitan from 17 September · Xero before it" info={[
          ["Where it comes from", "Since 17 September ServiceTitan holds the invoices and the payments, and sends Xero a daily journal, so Xero has no invoice to show as owing. Before that date, Xero’s unpaid invoices are the record."],
          ["Work not done yet", "ServiceTitan opens a job's invoice the day it's booked. Until the job is finished, the balance after any deposit isn't owed yet, so it's counted here and never as overdue."],
          ["Overdue", "An invoiced, finished job past the date the customer agreed to pay. The longer it sits, the less likely it gets paid."],
          ["Real estate", "Jobs in a Real Estate business unit in ServiceTitan, or, where the invoice isn’t there, a customer whose name is an agency’s. Everything else, homeowners, builders, commercial, is Domestic."],
          ["Billing", "A job finished but not invoiced can’t be paid. Billing on the day is the cheapest way to get paid faster."],
        ]} />
        <Tabs on={seg} label="Who owes it" items={[
          { key: "all", label: "Everyone", href: segHref("all"), count: count("all"), red: late("all") },
          { key: "realestate", label: "Real estate", href: segHref("realestate"), count: count("realestate"), red: late("realestate") },
          { key: "domestic", label: "Domestic", href: segHref("domestic"), count: count("domestic"), red: late("domestic") },
        ]} />
        {seg === "realestate" && <Note>Agents usually pay on their monthly owner statement run, so invoice before their cut-off with the property manager’s name and the work order number on it. The benchmark is {BENCH.pay.words}.</Note>}

        {all == null ? (xs !== "connected" ? <XeroOff state={xs} what="invoices" /> : <XeroOff state="no-answer" what="the unpaid invoices" />) : (
          <>
            {owed?.partial && <Note><b>Part of this is missing.</b> {owed.partial === "xero" ? "Xero didn’t answer, so the invoices from before 17 September aren’t here." : "ServiceTitan’s copy didn’t load, so the invoices from 17 September on aren’t here."}</Note>}
            <Say>
              <b>{money(tot)}</b> is out{seg === "realestate" ? " with real estate" : seg === "domestic" ? " with domestic customers" : ""}.{" "}
              {sum(work) > 0 ? <>{money(sum(work))} of it is the balance on jobs not done yet, deposits taken, the rest owed once the work&rsquo;s finished. </> : null}
              {money(sum(notDue))} is invoiced and not due yet.{" "}
              {b1 + b2 > 0 ? <><Bad>{money(b1 + b2)} is overdue</Bad>{oldest.length ? <>, {money(b2)} of it over 30 days.</> : "."}</> : "None of it is overdue."}
            </Say>
            <div className="mf-grid">
              <section className="rp-panel rp-card mf-flow" aria-labelledby="mf-flow-h" style={{ ["--i" as string]: 1 }}>
                <div className="rp-panel-h">
                  <b id="mf-flow-h">Cash flow</b>
                  <span className="rp-tools">
                    <span className="rp-seg" role="group" aria-label="How far back">
                      <Link href={q(6)} className={span === 6 ? "on" : undefined} aria-current={span === 6 ? "page" : undefined}>6M</Link>
                      <Link href={q(12)} className={span === 12 ? "on" : undefined} aria-current={span === 12 ? "page" : undefined}>12M</Link>
                    </span>
                    <Link href="/portal/finance/cash" className="rp-round" aria-label="Open Cash flow">↗</Link>
                  </span>
                </div>
                {flow ? (
                  <>
                    <div className="rp-big">
                      <span className="rp-num">{paid && flowIn != null ? money(flowIn) : money(flowOut)}</span>
                      <span>{paid && flowIn != null ? <>collected in {span} months · <b>{flowOut > 0 ? Math.round((flowIn / flowOut) * 100) : 0}%</b> of {money(flowOut)} invoiced</> : <>invoiced in {span} months · payments haven&rsquo;t synced from ServiceTitan yet</>}</span>
                    </div>
                    <FlowChart months={flow} />
                    <div className="rp-legend">{paid && <span><i className="dot" style={{ background: "var(--rp-forest)" }} />Collected</span>}<span><i className="dash" />Invoiced</span></div>
                  </>
                ) : <p className="rp-empty">ServiceTitan&rsquo;s invoices couldn&rsquo;t be read just now.</p>}
              </section>
              <section className="rp-panel rp-card mf-aging" aria-labelledby="mf-age-h" style={{ ["--i" as string]: 2 }}>
                <div className="rp-panel-h">
                  <span className="rp-hh"><b id="mf-age-h">Aging</b><span className="rp-note">Invoiced jobs by days past due</span></span>
                </div>
                <div className="mf-bars" aria-hidden="true">
                  {ages.map((a, i) => (
                    <span key={a.short} className={`mf-bar${a.lo > 60 ? " bad" : a.lo > 0 ? " late" : ""}`} style={{ ["--h" as string]: `${Math.max(4, (a.value / ageMax) * 100)}%`, ["--i" as string]: i }}>
                      <i />
                      <small>{a.short}</small>
                    </span>
                  ))}
                </div>
                <div className="mf-agerows">
                  {ages.map((a) => (
                    <div key={a.short} className="mf-agerow">
                      <span><i className={`mf-sw${a.lo > 60 ? " bad" : a.lo > 0 ? " late" : ""}`} aria-hidden="true" />{a.label}</span>
                      <span>{plural(a.n, "invoice")}</span>
                      <b className={a.lo > 30 && a.value > 0 ? "neg" : undefined}>{money(a.value)}</b>
                    </div>
                  ))}
                  {work.length > 0 && (
                    <div className="mf-agerow mf-work">
                      <span><i className="mf-sw work" aria-hidden="true" />Work not done yet</span>
                      <span>{plural(work.length, "job")}</span>
                      <b>{money(sum(work))}</b>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="rp-panel rp-card" aria-labelledby="mf-inv-h" style={{ ["--i" as string]: 3 }}>
              <div className="rp-panel-h"><b id="mf-inv-h">Invoices</b><Link href="/portal/jobs?tab=notbilled" className="rp-round" aria-label="Jobs done but not billed" title="Jobs done but not billed">↗</Link></div>
              <InvoiceTable rows={list.map((i) => ({ number: i.number || "", customer: i.contact || "", due: i.due, amount: i.amountDue, daysOver: i.daysOver, stage: i.stage, from: i.from, total: i.total, paid: i.paid }))} />
            </section>

            {/* The AR report proper: a row per customer, aged in thirties the
                way ServiceTitan ages it, with the summary of the bands under
                it. Above the two lists rather than below them, because this is
                the view somebody opens the page for and the lists are the
                detail behind it. */}
            {/* The office's own terms, which the thirties on the grid cannot
                show: a domestic job is paid on the day or inside the week, so
                anything domestic past seven days is a breach however tidy it
                looks in the 1–30 column. An agency is on a monthly statement
                run, so the same seven days would light up every row every month
                and teach the room to ignore the colour. */}

            <Grid cols={3}>
            {seg !== "realestate" && (() => {
              const dom = list.filter((i) => i.segment === "domestic");
              const late = pastTerms(dom.map((i) => ({ customer: i.contact || "", amount: i.amountDue, daysOver: i.daysOver })), TERMS.domestic);
              return (
                  <Tile
                    label={`Domestic over ${TERMS.domestic} days`}
                    st={late.count === 0 ? { k: "good", w: "None" } : { k: "bad", w: "Ring today" }}
                    fig={money(late.value)}
                    frac={late.count === 0 ? 1 : null}
                    sub={
                      late.count === 0
                        ? `Every domestic invoice is inside ${TERMS.domestic} days. That is the rule.`
                        : `${plural(late.count, "invoice")} past the rule · the worst is ${plural(late.worst, "day")} over`
                    }
                  />
              );
            })()}
                <Card title="Billing this month" aside="from ServiceTitan">
                  <Kv t="Invoiced" v={m?.revenueInvoicedMtd != null ? money(m.revenueInvoicedMtd) : ""} />
                  <Kv t="Invoices" v={m?.invoiceCountMonth != null ? String(m.invoiceCountMonth) : ""} />
                  <Kv t="Done, not billed" sub={m?.toBillOldestDays ? `the oldest has waited ${m.toBillOldestDays} days` : undefined} v={m?.toBillCount != null ? <span style={{ color: m.toBillCount ? "var(--bad)" : undefined }}>{m.toBillCount}</span> : ""} />
                  <div style={{ marginTop: 12 }}><Btn quiet href="/portal/jobs?tab=notbilled">See the jobs not billed ›</Btn></div>
                </Card>
                {goals.overdue != null && (
                  <Tile label="Overdue against the limit" st={status(b1 + b2, goals.overdue, { lower: true })} fig={money(b1 + b2)} frac={b1 + b2 > 0 ? Math.min(1, goals.overdue / (b1 + b2)) : 1} sub={`limit ${money(goals.overdue)} · from Pricing & costs`} />
                )}
            </Grid>
            <section>
              <Lh>Accounts receivable · by customer · invoiced jobs</Lh>
              <ArTable
                report={arReport(billed.map((i) => ({ customer: i.contact || "", amount: i.amountDue, daysOver: i.daysOver })))}
                termsDays={seg === "domestic" ? TERMS.domestic : seg === "realestate" ? TERMS.realestate : null}
                partial={
                  owed?.partial === "xero"
                    ? "ServiceTitan only, Xero didn’t answer"
                    : owed?.partial === "servicetitan"
                      ? "Xero only, ServiceTitan’s copy didn’t load"
                      : null
                }
              />
            </section>
            {seg !== "all" && byName > 0 && <Note>{plural(byName, "older invoice")} here {byName === 1 ? "has" : "have"} no ServiceTitan business unit, so the customer’s name decided: agencies (Real Estate, Realty, Ray White, First National and the like) are real estate, everyone else domestic.</Note>}
          </>
        )}
      </div>
    </PortalShell>
  );
}
