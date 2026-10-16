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
import { Av, Bad, Btn, Card, Empty, Grid, Group, Head, Kv, Lh, Note, Row, Say, Tabs, Tile, Two, status } from "@/components/portal/kit/Kit";
import { XeroOff } from "@/components/portal/finance/Parts";
import { ArTable } from "@/components/portal/ArTable";
import { TERMS, arReport, pastTerms } from "@/lib/portal/ar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Owed to us — Team portal" };

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short" });
const sum = (l: OwedInvoice[]) => l.reduce((a, i) => a + i.amountDue, 0);
const SHOW = 40;

/**
 * Profit & finance › Owed to us: every unpaid invoice — ServiceTitan's from
 * 17 September, when it became the ledger, and Xero's from before — split
 * into real estate and domestic, bucketed by how late it is, oldest first.
 * Where each comes from, and why, is on owedInvoices and ST_LEDGER_FROM.
 */
export default async function OwedPage({ searchParams }: { searchParams: { seg?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Owed to us" forWhom="managers" />;

  const seg: Segment | "all" = searchParams.seg === "realestate" || searchParams.seg === "domestic" ? searchParams.seg : "all";
  const [{ status: xs }, owed, board, goals] = await Promise.all([xeroStatus(), owedInvoices().catch(() => null), latestBoard(), getGoals()]);
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
  const BANDS: Array<[string, number, number]> = [["1–7 days", 1, 7], ["8–14 days", 8, 14], ["15–30 days", 15, 30], ["31–60 days", 31, 60], ["61–90 days", 61, 90], ["Over 90 days", 91, 1e9]];
  const bands = BANDS.map(([label, lo, hi]) => { const l = over.filter((i) => i.daysOver >= lo && i.daysOver <= hi); return { label, value: sum(l), n: l.length, lo }; });
  const oldest = over.filter((i) => i.daysOver > 30);
  const byName = list.filter((i) => i.by === "name").length;

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Owed to us" sub="ServiceTitan from 17 September · Xero before it" info={[
          ["Where it comes from", "Since 17 September ServiceTitan holds the invoices and the payments, and sends Xero a daily journal, so Xero has no invoice to show as owing. Before that date, Xero’s unpaid invoices are the record."],
          ["Work not done yet", "ServiceTitan opens a job's invoice the day it's booked. Until the job is finished, the balance after any deposit isn't owed yet, so it's counted here and never as overdue."],
          ["Overdue", "An invoiced, finished job past the date the customer agreed to pay. The longer it sits, the less likely it gets paid."],
          ["Real estate", "Jobs in a Real Estate business unit in ServiceTitan, or, where the invoice isn’t there, a customer whose name is an agency’s. Everything else — homeowners, builders, commercial — is Domestic."],
          ["Billing", "A job finished but not invoiced can’t be paid. Billing on the day is the cheapest way to get paid faster."],
        ]} />
        <Tabs on={seg} label="Who owes it" items={[
          { key: "all", label: "Everyone", href: "/portal/money", count: count("all"), red: late("all") },
          { key: "realestate", label: "Real estate", href: "/portal/money?seg=realestate", count: count("realestate"), red: late("realestate") },
          { key: "domestic", label: "Domestic", href: "/portal/money?seg=domestic", count: count("domestic"), red: late("domestic") },
        ]} />
        {seg === "realestate" && <Note>Agents usually pay on their monthly owner statement run, so invoice before their cut-off with the property manager’s name and the work order number on it. The benchmark is {BENCH.pay.words}.</Note>}

        {all == null ? (xs !== "connected" ? <XeroOff state={xs} what="invoices" /> : <XeroOff state="no-answer" what="the unpaid invoices" />) : (
          <>
            {owed?.partial && <Note><b>Part of this is missing.</b> {owed.partial === "xero" ? "Xero didn’t answer, so the invoices from before 17 September aren’t here." : "ServiceTitan’s copy didn’t load, so the invoices from 17 September on aren’t here."}</Note>}
            <Say>
              <b>{money(tot)}</b> is out{seg === "realestate" ? " with real estate" : seg === "domestic" ? " with domestic customers" : ""}.{" "}
              {sum(work) > 0 ? <>{money(sum(work))} of it is the balance on jobs not done yet — deposits taken, the rest owed once the work&rsquo;s finished. </> : null}
              {money(sum(notDue))} is invoiced and not due yet.{" "}
              {b1 + b2 > 0 ? <><Bad>{money(b1 + b2)} is overdue</Bad>{oldest.length ? <>, {money(b2)} of it over 30 days.</> : "."}</> : "None of it is overdue."}
            </Say>
            <Grid cols={4}>
              <Tile label="Work not done yet" st={{ k: "none", w: "Waiting on us" }} fig={money(sum(work))} frac={tot ? sum(work) / tot : null} sub={`${plural(work.length, "job")} · ${money(work.reduce((a, i) => a + (i.paid ?? 0), 0))} in deposits already paid`} />
              <Tile label="Invoiced, not due yet" st={{ k: "good", w: "On terms" }} fig={money(sum(notDue))} frac={tot ? sum(notDue) / tot : null} sub={`${plural(notDue.length, "invoice")} · ${tot ? pc((sum(notDue) / tot) * 100) : "0%"} of what’s out`} />
              <Tile label="1 to 30 days overdue" st={b1 > 0 ? { k: "mid", w: "Chase" } : { k: "good", w: "None" }} fig={money(b1)} frac={tot ? b1 / tot : null} sub={`${plural(over.filter((i) => i.daysOver <= 30).length, "invoice")}`} />
              <Tile label="Over 30 days overdue" st={b2 > 0 ? { k: "bad", w: "Ring now" } : { k: "good", w: "None" }} fig={money(b2)} frac={tot ? b2 / tot : null} sub={`${plural(oldest.length, "invoice")}`} />
            </Grid>
            <Card title="Overdue, by how late" aside="invoiced jobs only · days past the due date">
              <div className="pk-tbl-wrap">
                <table className="pk-tbl">
                  <thead><tr>{bands.map((b) => <th key={b.label}>{b.label}</th>)}<th>All overdue</th></tr></thead>
                  <tbody>
                    <tr>
                      {bands.map((b) => <td key={b.label} className={b.value > 0 ? (b.lo > 30 ? "pt-cover__neg" : "") : "ks"}><b>{money(b.value)}</b><div className="ks">{plural(b.n, "invoice")}</div></td>)}
                      <td className={b1 + b2 > 0 ? "pt-cover__neg" : undefined}><b>{money(b1 + b2)}</b><div className="ks">{plural(over.length, "invoice")}</div></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
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
            {seg !== "realestate" && (() => {
              const dom = list.filter((i) => i.segment === "domestic");
              const late = pastTerms(dom.map((i) => ({ customer: i.contact || "", amount: i.amountDue, daysOver: i.daysOver })), TERMS.domestic);
              return (
                <div style={{ margin: "14px 0 0" }}>
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
                </div>
              );
            })()}

            <section style={{ marginTop: 18 }}>
              <Lh>Accounts receivable · by customer · invoiced jobs</Lh>
              <ArTable
                report={arReport(billed.map((i) => ({ customer: i.contact || "", amount: i.amountDue, daysOver: i.daysOver })))}
                termsDays={seg === "domestic" ? TERMS.domestic : seg === "realestate" ? TERMS.realestate : null}
                partial={
                  owed?.partial === "xero"
                    ? "ServiceTitan only — Xero didn’t answer"
                    : owed?.partial === "servicetitan"
                      ? "Xero only — ServiceTitan’s copy didn’t load"
                      : null
                }
              />
            </section>
            <Two>
              <div style={{ display: "grid", gap: 16 }}>
                <section>
                  <Lh><span style={{ color: over.length ? "var(--bad)" : undefined }}>Overdue · {over.length}</span></Lh>
                  {over.length ? (
                    <Group>
                      {over.slice(0, SHOW).map((i) => (
                        <Row key={`${i.number}-${i.due}`} lead={<Av name={i.contact || "?"} />} title={i.contact || "—"} sub={`${i.number || "no number"} · was due ${day(i.due)}${i.from === "xero" ? " · in Xero" : ""}`}
                          end={<span style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ color: "var(--bad)", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>{plural(i.daysOver, "day")} late</span><span className="v" style={{ width: 80, textAlign: "right" }}>{money(i.amountDue)}</span></span>} />
                      ))}
                    </Group>
                  ) : <Empty>Nothing is past its due date.</Empty>}
                  {over.length > SHOW && <Note>And {over.length - SHOW} more, {money(sum(over.slice(SHOW)))} between them.</Note>}
                </section>
                <section>
                  <Lh>Not due yet · {notDue.length}</Lh>
                  {notDue.length ? (
                    <Group>
                      {notDue.slice(0, SHOW).map((i) => (
                        <Row key={`${i.number}-${i.due}`} lead={<Av name={i.contact || "?"} />} title={i.contact || "—"} sub={`${i.number || "no number"}${i.from === "xero" ? " · in Xero" : ""}`}
                          end={<span style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ color: "var(--ink2)", fontSize: 13, whiteSpace: "nowrap" }}>{i.daysOver === 0 ? "due today" : i.daysOver === -1 ? "due tomorrow" : `due in ${-i.daysOver} days`}</span><span className="v" style={{ width: 80, textAlign: "right" }}>{money(i.amountDue)}</span></span>} />
                      ))}
                    </Group>
                  ) : <Empty>Nothing waiting that isn’t already due.</Empty>}
                  {notDue.length > SHOW && <Note>And {notDue.length - SHOW} more, {money(sum(notDue.slice(SHOW)))} between them.</Note>}
                </section>
                <section>
                  <Lh>Work not done yet · {work.length}</Lh>
                  {work.length ? (
                    <Group>
                      {work.slice(0, SHOW).map((i) => (
                        <Row key={`${i.number}-w`} lead={<Av name={i.contact || "?"} />} title={i.contact || "—"}
                          sub={`${i.number || "no number"} · ${money(i.total ?? i.amountDue)} job${i.paid ? `, ${money(i.paid)} paid` : ", nothing paid yet"}`}
                          end={<span style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ color: "var(--ink2)", fontSize: 13, whiteSpace: "nowrap" }}>owed once done</span><span className="v" style={{ width: 80, textAlign: "right" }}>{money(i.amountDue)}</span></span>} />
                      ))}
                    </Group>
                  ) : <Empty>No open jobs carrying a balance.</Empty>}
                  {work.length > SHOW && <Note>And {work.length - SHOW} more, {money(sum(work.slice(SHOW)))} between them.</Note>}
                </section>
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                <Card title="Billing this month" aside="from ServiceTitan">
                  <Kv t="Invoiced" v={m?.revenueInvoicedMtd != null ? money(m.revenueInvoicedMtd) : "—"} />
                  <Kv t="Invoices" v={m?.invoiceCountMonth != null ? String(m.invoiceCountMonth) : "—"} />
                  <Kv t="Done, not billed" sub={m?.toBillOldestDays ? `the oldest has waited ${m.toBillOldestDays} days` : undefined} v={m?.toBillCount != null ? <span style={{ color: m.toBillCount ? "var(--bad)" : undefined }}>{m.toBillCount}</span> : "—"} />
                  <div style={{ marginTop: 12 }}><Btn quiet href="/portal/jobs?tab=notbilled">See the jobs not billed ›</Btn></div>
                </Card>
                {goals.overdue != null && (
                  <Tile label="Overdue against the limit" st={status(b1 + b2, goals.overdue, { lower: true })} fig={money(b1 + b2)} frac={b1 + b2 > 0 ? Math.min(1, goals.overdue / (b1 + b2)) : 1} sub={`limit ${money(goals.overdue)} · from Pricing & costs`} />
                )}
                {seg !== "all" && byName > 0 && <Note>{plural(byName, "older invoice")} here {byName === 1 ? "has" : "have"} no ServiceTitan business unit, so the customer’s name decided: agencies (Real Estate, Realty, Ray White, First National and the like) are real estate, everyone else domestic.</Note>}
              </div>
            </Two>
          </>
        )}
      </div>
    </PortalShell>
  );
}
