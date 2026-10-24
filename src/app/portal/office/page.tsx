import { redirect } from "next/navigation";
import { KpiHead } from "@/components/portal/kit/Kit";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Empty, Head, Pill, Say, type Status } from "@/components/portal/kit/Kit";
import { officeDay, type OfficeLine } from "@/lib/portal/run/officeDay";
import { stJobUrl } from "@/lib/dashboard/toBill";
import { dbConfigured } from "@/lib/portal/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Office today · Team portal" };

const money = (v: number) => `$${Math.round(v).toLocaleString("en-AU")}`;
const ago = (iso: string | null) => {
  if (!iso) return null;
  const d = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 86_400_000));
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

type Step = {
  key: string;
  title: string;
  how: string;
  where: string;
  line: OfficeLine | null;
  /** What the count means, said after it. */
  unit: string;
  st: Status;
  more?: { href: string; label: string };
  extra?: string;
};

/**
 * The office's morning, from the AGA job workflow: about fifteen minutes, in
 * this order, every day. Each step says what to do and where in ServiceTitan,
 * how many are waiting and the oldest of them, with the job a click away.
 * Steps the data can't count (bank transfers) are said and not numbered.
 */
export default async function OfficeTodayPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!(can(user, "quotes") || can(user, "overhead"))) return <Locked user={user} what="Office today" forWhom="the office" />;

  const d = dbConfigured() ? await officeDay().catch(() => null) : null;
  const first = user.name.split(" ")[0];

  const st = (n: number, late = false): Status => (n === 0 ? { k: "good", w: "Clear" } : late ? { k: "bad", w: `${n} to do` } : { k: "mid", w: `${n} to do` });
  const steps: Step[] = d ? [
    {
      key: "review", title: "Review yesterday's invoices",
      how: "Check items, price and business unit; a $0 invoice must say why. Fix it, then mark it Reviewed.",
      where: "Accounting → Invoices → Review Status",
      line: d.review, unit: "finished jobs not reviewed", st: st(d.review.count, d.review.count > d.review.yesterday),
      extra: d.review.count ? `${d.review.yesterday} from yesterday or today; the rest have been waiting` : undefined,
    },
    {
      key: "notsent", title: "Send invoices with money owing",
      how: "Anything finished, owing and not yet sent goes out today.",
      where: "Accounting → Invoices → filter Not Sent",
      line: d.notSent, unit: "owing and not sent", st: st(d.notSent.count, d.notSent.count > 0),
    },
    {
      key: "bank", title: "Record bank transfers",
      how: "Record each transfer in the bank feed against its invoice in ServiceTitan, so it stops showing as owed.",
      where: "Invoice → Collect and apply payment",
      line: null, unit: "", st: { k: "none", w: "Check the bank" },
    },
    {
      key: "hold", title: "Clear the Hold list",
      how: "For each held job: build and send the quote, send Geoff a work order, or book the reattend, then take it off Hold.",
      where: "Dispatch → Hold",
      line: d.hold, unit: "jobs on hold", st: st(d.hold.count, d.hold.onUs > 0),
      more: { href: "/portal/jobs?tab=list&f=hold", label: "Every held job" },
      extra: d.hold.count ? `${d.hold.onUs} waiting on us` : undefined,
    },
    ...(d.leftOpen ? [((o) => {
      const all = o.notClosed + o.closeVisit + o.toQuote;
      return {
        key: "open", title: "Close jobs whose visit day has gone",
        how: "Finished? Complete it so it can be billed. A quote visit closes once its quote is written, or gets quoted. Not finished? Book the return or put it on hold.",
        where: "Portal → Job tracker",
        line: null, unit: "", st: st(all, all > 0),
        more: { href: "/portal/tracker#notclosed", label: `${o.notClosed} left open · ${o.closeVisit} quote visits to close · ${o.toQuote} to quote` },
      } satisfies Step;
    })(d.leftOpen)] : []),
    {
      key: "quotes", title: "Ring the quotes due today",
      how: "Call every quote due a follow-up. Won → sell it. Lost → mark it lost with the reason (it's dismissed in ServiceTitan for you).",
      where: "Portal → Quotes",
      line: null, unit: "", st: st(d.followUps.due, d.followUps.late > 0),
      more: { href: "/portal/pipeline", label: `Quotes · ${d.followUps.due} to ring${d.followUps.late ? `, ${d.followUps.late} late` : ""}` },
      extra: `${d.followUps.open} quotes out altogether`,
    },
    {
      key: "partpaid", title: "Chase part-paid installs",
      how: "Deposit taken, job finished, balance still owing, follow up anything past its terms.",
      where: "Accounting → Invoices → Partially Paid",
      line: d.partPaid, unit: "with a balance after a deposit", st: st(d.partPaid.count),
      more: { href: "/portal/money", label: "Owed to us" },
    },
    {
      key: "tobill", title: "Bill finished jobs with no invoice",
      how: "Finished in ServiceTitan with the invoice still at $0, price it and send it, or say why it's free.",
      where: "Jobs → Not billed",
      line: d.toBill, unit: "finished, not invoiced", st: st(d.toBill.count, d.toBill.count > 0),
      more: { href: "/portal/jobs?tab=notbilled", label: "Every one" },
    },
  ] : [];

  const waiting = steps.filter((s) => s.st.k === "bad" || s.st.k === "mid").length;

  return (
    <PortalShell user={user}>
      <div className="pk">
        <KpiHead title={<>Office<br />today</>} kpis={d ? [
          { icon: "doc", fig: `${steps.filter((x) => x.st.k === "good").length} of ${steps.length}`, label: "Steps clear" },
          { icon: "clock", fig: String(waiting), label: "With something waiting", badge: steps.some((x) => x.st.k === "bad") ? "late" : undefined, tone: "down" },
        ] : []} />
        <p className="pk-note td-intro">The morning routine, in order, about fifteen minutes.</p>
        {!d ? <Empty>ServiceTitan couldn&rsquo;t be read just now. Try again in a minute.</Empty> : (
          <>
            <Say>{waiting === 0 ? <>Morning {first} , everything&rsquo;s clear.</> : <>Morning {first}  {waiting} of the {steps.length} steps {waiting === 1 ? "has" : "have"} something waiting.</>}</Say>
            <ol className="pt-office">
              {steps.map((s, idx) => (
                <li key={s.key} className={`pt-office__step pk-card pk-pad${s.st.k === "good" ? " is-clear" : ""}`}>
                  <div className="pt-office__head">
                    <span className="pt-office__n" aria-hidden="true">{idx + 1}</span>
                    <div className="pt-office__t">
                      <b>{s.title}</b>
                      <span>{s.how}</span>
                      <span className="pt-office__where">{s.where}</span>
                    </div>
                    <div className="pt-office__count">
                      <Pill st={s.st} />
                      {s.line && s.line.count > 0 ? <span>{s.line.count} {s.unit}{s.line.value ? ` · ${money(s.line.value)}` : ""}</span> : null}
                      {s.extra ? <span>{s.extra}</span> : null}
                    </div>
                  </div>
                  {s.line && s.line.items.length > 0 && (
                    <div className="pt-office__list">
                      {s.line.items.map((it) => (
                        <div className="pk-kv pk-kv--act" key={`${s.key}-${it.jobId}`}>
                          <span className="t"><b>{[it.jobNumber ? `#${it.jobNumber}` : null, it.customer].filter(Boolean).join(" · ") || "Job"}</b><span>{[it.what, it.since ? `finished ${ago(it.since)}` : null].filter(Boolean).join(" · ")}</span></span>
                          <span className="v">{it.amount != null ? money(it.amount) : ""}</span>
                          <a className="pk-btn g" href={stJobUrl(it.jobId)} target="_blank" rel="noreferrer" aria-label={`Open job ${it.jobNumber ?? it.jobId} in ServiceTitan`}>Open ↗</a>
                        </div>
                      ))}
                      {s.line.count > s.line.items.length ? <p className="pk-note" style={{ margin: "8px 0 0" }}>Oldest {s.line.items.length} of {s.line.count}{s.more ? <>  <Link href={s.more.href}>{s.more.label}</Link></> : ", the rest are in ServiceTitan's list"}.</p> : null}
                    </div>
                  )}
                  {(!s.line || s.line.items.length === 0) && s.more ? <div className="pk-btns" style={{ marginTop: 10 }}><Link className="pk-btn g" href={s.more.href}>{s.more.label} ›</Link></div> : null}
                </li>
              ))}
            </ol>
            <p className="pk-note" style={{ marginTop: 14 }}>
              <b>Weekly:</b> Invoice Aging, send reminders on anything overdue (<Link href="/portal/money">Owed to us</Link>), and reconcile the Xero bank feed.
              Counts are finished jobs since 17 September, read from ServiceTitan every few minutes.
            </p>
          </>
        )}
      </div>
    </PortalShell>
  );
}
