import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Card, Group, KpiHead, Pill, Row } from "@/components/portal/kit/Kit";
import { toBillJobs, stJobUrl } from "@/lib/dashboard/toBill";
import { owedInvoices, type OwedInvoice } from "@/lib/portal/run/money";
import { getOwedBills, type OwedBill } from "@/lib/portal/xero";
import { journalErrors } from "@/lib/journals/read";
import { meOf, openTodos, todayMelbourne } from "@/lib/todos/store";
import { dueState, dueWords } from "@/lib/todos/types";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { money, plural } from "@/lib/portal/run/month";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accounts · Team portal" };

const SHOW = 8;
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const daysAgo = (iso: string, today: string) => Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${iso.slice(0, 10)}T12:00:00Z`)) / 86_400_000);

/** How late an invoice is, as the four groups the chasing is done in. */
const BANDS: Array<{ k: string; label: string; from: number; to: number; tone: "bad" | "mid" | "none" }> = [
  { k: "30", label: "30 days or more", from: 30, to: Infinity, tone: "bad" },
  { k: "14", label: "14 to 29 days", from: 14, to: 29, tone: "bad" },
  { k: "7", label: "7 to 13 days", from: 7, to: 13, tone: "mid" },
  { k: "1", label: "Under a week", from: 1, to: 6, tone: "none" },
];

/**
 * Finance › Accounts: the accounts person's day on one page. What's on their
 * to-do list, the finished jobs still to invoice, the money to chase by how
 * late it is, the bills coming due, and anything that hasn't reached Xero.
 * Each list is the same one its own page shows, cut to the top few, with the
 * way through to the rest.
 */
export default async function AccountsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Accounts" forWhom="managers" />;

  const today = todayMelbourne();
  const [toBill, owed, bills, journals, me, todos] = await Promise.all([
    toBillJobs().catch(() => null),
    owedInvoices().catch(() => null),
    getOwedBills(),
    journalErrors().catch(() => null),
    meOf(user),
    openTodos().catch(() => []),
  ]);

  // Finished before today: today's jobs are still being written up.
  const bill = (toBill ?? []).filter((r) => isoDateMelbourne(new Date(r.at)) < today);
  const billValue = bill.reduce((s, r) => s + (r.value ?? 0), 0);
  const late = (owed?.list ?? []).filter((i) => i.daysOver > 0).sort((a, b) => b.daysOver - a.daysOver);
  const lateTotal = late.reduce((s, i) => s + i.amountDue, 0);
  const weekOut = new Date(Date.parse(`${today}T12:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  const billsDue = (bills ?? []).filter((b) => b.amountDue > 0 && b.due.slice(0, 10) <= weekOut).sort((a, b) => a.due.localeCompare(b.due));
  const billsDueTotal = billsDue.reduce((s, b) => s + b.amountDue, 0);
  const mine = me ? todos.filter((t) => t.assigneeId === me.id).sort((a, b) => a.dueOn.localeCompare(b.dueOn)) : [];
  const mineNow = mine.filter((t) => { const s = dueState(t, today); return s === "overdue" || s === "today"; });

  return (
    <PortalShell user={user}>
      <div className="pk ac">
        <KpiHead hi="Finance" title="Accounts" kpis={[
          { icon: "doc", fig: toBill ? String(bill.length) : "–", label: toBill ? `To invoice${billValue ? `, ${money(billValue)} sold` : ""}` : "Jobs can't be read", href: "/portal/jobs?tab=notbilled" },
          { icon: "alert", fig: owed ? money(lateTotal) : "–", label: owed ? `Overdue, ${plural(late.length, "invoice")}` : "Owed can't be read", href: "/portal/money", ...(late.some((i) => i.daysOver >= 30) ? { badge: "30+ days", tone: "down" as const } : {}) },
          { icon: "card", fig: bills ? money(billsDueTotal) : "–", label: bills ? "Bills due this week" : "Xero not connected", href: "/portal/finance/owe" },
          { icon: "check", fig: String(mineNow.length), label: "Your to-dos due", href: "/portal/todo" },
        ]} />

        {/* Two columns that each stack on their own, so a short list doesn't leave a hole beside a long one. */}
        <div className="ac-grid">
          <div className="ac-col">
          <Card title="Your to-dos" aside={<Link href="/portal/todo">To-do ›</Link>}>
            {!me ? <p className="ac-empty">You&rsquo;re not on the team list, so there&rsquo;s no list of yours to show.</p>
              : mine.length ? (
                <Group>
                  {mine.slice(0, SHOW).map((t) => {
                    const s = dueState(t, today);
                    return <Row key={t.id} href="/portal/todo" title={t.title} sub={[t.createdBy && t.createdBy !== me.name ? `from ${t.createdBy}` : null, t.list].filter(Boolean).join(" · ") || undefined}
                      end={<Pill st={{ k: s === "overdue" ? "bad" : s === "today" ? "mid" : "none", w: dueWords(t, today) }} />} />;
                  })}
                </Group>
              ) : <p className="ac-empty">Nothing on your list.</p>}
            {mine.length > SHOW && <p className="ac-more"><Link href="/portal/todo">and {mine.length - SHOW} more on To-do</Link></p>}
          </Card>

          <MoneyToFollow owed={owed} late={late} />
          </div>
          <div className="ac-col">
          <Card title="To invoice" aside={<Link href="/portal/jobs?tab=notbilled">Jobs › Not billed ›</Link>}>
            {toBill == null ? <p className="ac-empty">The jobs can&rsquo;t be read right now.</p>
              : bill.length ? (
                <Group>
                  {bill.slice(0, SHOW).map((r) => {
                    const ago = daysAgo(r.at, today);
                    return (
                      <div key={r.id} className="pk-row">
                        <span className="t"><b>Job {r.jobNumber ?? r.id}{r.customer ? `, ${r.customer}` : ""}</b><span>{[r.jobType, r.suburb, `finished ${day(isoDateMelbourne(new Date(r.at)))}`].filter(Boolean).join(" · ")}</span></span>
                        <span className="ac-end">
                          {r.value ? <b className="ac-amt">{money(r.value)}</b> : null}
                          <Pill st={{ k: ago >= 3 ? "bad" : ago >= 1 ? "mid" : "none", w: ago <= 1 ? "Yesterday" : `${ago} days` }} />
                          <a className="jp-open" href={stJobUrl(r.id)} target="_blank" rel="noreferrer">ServiceTitan ↗</a>
                        </span>
                      </div>
                    );
                  })}
                </Group>
              ) : <p className="ac-empty">Every finished job has an invoice.</p>}
            {bill.length > SHOW && <p className="ac-more"><Link href="/portal/jobs?tab=notbilled">and {bill.length - SHOW} more</Link></p>}
          </Card>

          <Card title="Bills to pay" aside={<Link href="/portal/finance/owe">We owe ›</Link>}>
            {bills == null ? <p className="ac-empty">Xero isn&rsquo;t connected, so the bills can&rsquo;t be read.</p>
              : billsDue.length ? (
                <Group>
                  {billsDue.slice(0, SHOW).map((b: OwedBill) => {
                    const over = b.due.slice(0, 10) < today;
                    return <Row key={b.id} title={b.supplier} sub={[b.number ?? b.reference, `due ${day(b.due)}`].filter(Boolean).join(" · ")}
                      end={<span className="ac-end"><b className="ac-amt">{money(b.amountDue)}</b><Pill st={{ k: over ? "bad" : "mid", w: over ? "Overdue" : "This week" }} /></span>} />;
                  })}
                </Group>
              ) : <p className="ac-empty">Nothing due in the next week.</p>}
            {billsDue.length > SHOW && <p className="ac-more"><Link href="/portal/finance/owe">and {billsDue.length - SHOW} more</Link></p>}
          </Card>

          <Card title="Not in Xero yet" aside={<a href="https://go.xero.com/Bank/BankAccounts.aspx" target="_blank" rel="noreferrer">Reconcile in Xero ↗</a>}>
            {journals == null ? <p className="ac-empty">The journal entries can&rsquo;t be read right now.</p>
              : journals.length ? (
                <Group>
                  {journals.slice(0, SHOW).map((j) => (
                    <Row key={j.id} href="/portal/journals#errors" title={`Journal #${j.number ?? ""} didn't sync`} sub={j.message || j.name || "ServiceTitan gave no reason"} end={<Pill st={{ k: "bad", w: "Fix in ServiceTitan" }} />} />
                  ))}
                </Group>
              ) : <p className="ac-empty">Every ServiceTitan journal entry has reached Xero.</p>}
          </Card>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}

/** Overdue invoices in the four groups the chasing is done in, oldest group first. */
function MoneyToFollow({ owed, late }: { owed: { list: OwedInvoice[] } | null; late: OwedInvoice[] }) {
  return (
    <Card title="Money to follow up" aside={<Link href="/portal/money">Owed to us ›</Link>}>
      {owed == null ? <p className="ac-empty">Neither Xero nor ServiceTitan could be read for what&rsquo;s owed.</p>
        : late.length ? BANDS.map((b) => {
          const rows = late.filter((i) => i.daysOver >= b.from && i.daysOver <= b.to);
          if (!rows.length) return null;
          return (
            <div key={b.k} className="ac-band">
              <div className="ac-bandh"><Pill st={{ k: b.tone, w: b.label }} /><span>{plural(rows.length, "invoice")} · {money(rows.reduce((s, i) => s + i.amountDue, 0))}</span></div>
              <Group>
                {rows.slice(0, 5).map((i: OwedInvoice) => (
                  <Row key={`${i.from}-${i.number}`} title={`#${i.number} ${i.contact}`} sub={`${i.daysOver} days overdue · due ${day(i.due)}${i.from === "servicetitan" ? " · ServiceTitan" : ""}`} end={<b className="ac-amt">{money(i.amountDue)}</b>} />
                ))}
              </Group>
              {rows.length > 5 && <p className="ac-more"><Link href="/portal/money">and {rows.length - 5} more</Link></p>}
            </div>
          );
        }) : <p className="ac-empty">Nothing overdue.</p>}
    </Card>
  );
}
