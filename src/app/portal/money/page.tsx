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
  const over = list.filter((i) => i.daysOver > 0).sort((a, b) => b.daysOver - a.daysOver);
  const notDue = list.filter((i) => i.daysOver <= 0).sort((a, b) => b.daysOver - a.daysOver);
  const tot = sum(list), b1 = sum(over.filter((i) => i.daysOver <= 30)), b2 = sum(over.filter((i) => i.daysOver > 30));
  const oldest = over.filter((i) => i.daysOver > 30);
  const byName = list.filter((i) => i.by === "name").length;

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Owed to us" sub="ServiceTitan from 17 September · Xero before it" info={[
          ["Where it comes from", "Since 17 September ServiceTitan holds the invoices and the payments, and sends Xero a daily journal, so Xero has no invoice to show as owing. Before that date, Xero’s unpaid invoices are the record."],
          ["Overdue", "Past the date the customer agreed to pay. The longer it sits, the less likely it gets paid."],
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
              {seg === "all" ? "Customers owe us" : seg === "realestate" ? "Real estate owes us" : "Domestic customers owe us"} <b>{money(tot)}</b>.{" "}
              {b1 + b2 > 0 ? <><Bad>{money(b1 + b2)} is overdue</Bad>{oldest.length ? <>, and the {oldest.length === 1 ? "oldest makes" : `${oldest.length} over 30 days make`} up {money(b2)}.</> : "."}</> : "None of it is overdue."}
            </Say>
            <Grid cols={3}>
              <Tile label="Not due yet" st={{ k: "none", w: "Fine" }} fig={money(sum(notDue))} frac={tot ? sum(notDue) / tot : null} sub={`${tot ? pc((sum(notDue) / tot) * 100) : "0%"} of what’s owed · ${plural(notDue.length, "invoice")}`} />
              <Tile label="1 to 30 days late" st={b1 > 0 ? { k: "mid", w: "Chase" } : { k: "good", w: "None" }} fig={money(b1)} frac={tot ? b1 / tot : null} sub={`${tot ? pc((b1 / tot) * 100) : "0%"} of what’s owed`} />
              <Tile label="Over 30 days late" st={b2 > 0 ? { k: "bad", w: "Ring now" } : { k: "good", w: "None" }} fig={money(b2)} frac={tot ? b2 / tot : null} sub={`${tot ? pc((b2 / tot) * 100) : "0%"} of what’s owed`} />
            </Grid>
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
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                <Card title="Billing this month" aside="from ServiceTitan">
                  <Kv t="Invoiced" v={m?.revenueInvoicedMtd != null ? money(m.revenueInvoicedMtd) : "—"} />
                  <Kv t="Invoices" v={m?.invoiceCountMonth != null ? String(m.invoiceCountMonth) : "—"} />
                  <Kv t="Done, not billed" sub={m?.toBillOldestDays ? `the oldest has waited ${m.toBillOldestDays} days` : undefined} v={m?.toBillCount != null ? <span style={{ color: m.toBillCount ? "var(--bad)" : undefined }}>{m.toBillCount}</span> : "—"} />
                  <div style={{ marginTop: 12 }}><Btn quiet href="/portal/jobs?tab=notbilled">See the jobs not billed ›</Btn></div>
                </Card>
                {goals.overdue != null && (
                  <Tile label="Overdue against the limit" st={status(b1 + b2, goals.overdue, { lower: true })} fig={money(b1 + b2)} frac={b1 + b2 > 0 ? Math.min(1, goals.overdue / (b1 + b2)) : 1} sub={`limit ${money(goals.overdue)} · from Our numbers`} />
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
