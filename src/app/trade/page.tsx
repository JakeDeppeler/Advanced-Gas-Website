import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell, Ic } from "@/components/portal/TradeShell";
import { mondayWeek } from "@/lib/portal/monday";
import { listOrders, listReports, listTools } from "@/lib/portal/van";
import { listLeave } from "@/lib/portal/people";
import { tradeNotices } from "@/lib/portal/tradeNotices";
import { myMonth, myOpenQuotes } from "@/lib/portal/tradeHome";
import { isOpenReport, toolState } from "@/lib/portal/vanParts";
import { leaveLabel } from "@/lib/portal/peopleParts";
import { localToday } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trade portal" };

/** Melbourne's hour, so the greeting isn't a UTC server's idea of morning. */
function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", hour12: false }).format(new Date()));
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short" });

type Need = { icon: string; title: string; sub: string; chip: string; tone: "warn" | "grey"; href?: string };

/**
 * The trade home: four ways in, what needs you, and your month.
 *
 * "Needs you" lists only things a record says are waiting — a report the
 * office is sitting on, a quote gone quiet, a check not sent. Nothing on it is
 * a reminder for its own sake, so when it's empty it says so.
 */
export default async function TradeHome() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const first = user.name.split(" ")[0];
  const today = localToday();
  const week = await mondayWeek(user.id);
  const van = week.van;
  const [month, mine, reports, orders, tools, leave, unread] = await Promise.all([
    myMonth(user.name),
    myOpenQuotes(user.name),
    van ? listReports(van.id, 20) : [],
    van ? listOrders({ vehicleId: van.id, open: true, limit: 10 }) : [],
    van ? listTools(van.id) : null,
    user.id ? listLeave({ userId: user.id, limit: 5 }) : [],
    tradeNotices(user).then((t) => t.unread).catch(() => 0),
  ]);

  const needs: Need[] = [];
  if (unread > 0) {
    needs.push({ icon: "chat", title: `${unread} ${unread === 1 ? "thing" : "things"} from the office`, sub: "Waiting in Messages", chip: "Read", tone: "warn", href: "/trade/messages" });
  }
  if (mine && mine.open > 0) {
    needs.push({
      icon: "tag",
      title: `${mine.open} ${mine.open === 1 ? "quote" : "quotes"} waiting on a yes`,
      sub: mine.quiet ? `${mine.quiet === 1 ? "One has" : `${mine.quiet} have`} gone quiet${mine.quietestDays ? ` · the longest ${mine.quietestDays} days` : ""}` : "All written in the last week",
      chip: "Follow up", tone: "warn",
    });
  }
  if (van && week.done < week.steps.length) {
    needs.push({ icon: "check", title: "Weekly van check", sub: `${week.done} of ${week.steps.length} done · due Monday by 8am`, chip: week.done ? "Finish it" : "Start it", tone: "warn", href: "/trade/van/check" });
  }
  for (const r of reports.filter(isOpenReport).slice(0, 2)) {
    needs.push({
      icon: "warn", title: r.title,
      sub: [r.source === "weekly" ? "From your weekly check" : r.kind === "damage" ? "Damage you reported" : "Service you asked for", r.status === "open" ? "with the office" : r.statusNote ? `booked ${r.statusNote}` : "booked in"].join(" · "),
      chip: "See it", tone: "grey", href: "/trade/van/report",
    });
  }
  for (const o of orders.filter((x) => x.status === "ready")) {
    needs.push({ icon: "box", title: "Parts ready", sub: o.lines.map((l) => l.item).slice(0, 2).join(", "), chip: "See it", tone: "grey", href: "/trade/van/parts" });
  }
  const toolDue = (tools ?? []).map((t) => ({ t, s: toolState(t, today) })).filter(({ t, s }) => !t.request && s.overdue);
  if (toolDue.length) {
    needs.push({ icon: "wrench", title: `${toolDue[0].t.name}${toolDue.length > 1 ? ` and ${toolDue.length - 1} more` : ""}`, sub: `${toolDue[0].t.nextDue || "Service"} overdue`, chip: "See it", tone: "grey", href: "/trade/van/tools" });
  }
  for (const l of leave.filter((x) => x.status !== "asked" && Date.now() - Date.parse(x.createdAt) < 14 * 86_400_000).slice(0, 1)) {
    needs.push({ icon: "clock", title: `${leaveLabel(l.kind)} ${l.status}`, sub: `${day(l.from)}${l.to !== l.from ? ` – ${day(l.to)}` : ""}${l.answeredBy ? ` · ${l.answeredBy}` : ""}`, chip: "See it", tone: "grey", href: "/trade/me" });
  }

  const dateLine = today.toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

  return (
    <TradeShell user={user} active="home" title={`${greeting()} ${first}.`} sub={`${dateLine}${van ? ` · ${van.name}${van.rego ? ` ${van.rego}` : ""}` : ""}`}>
      <div className="tr-grid tr-grid--4">
        <Link href="/trade/pricebook" className="tr-tile tr-tile--go">
          <span className="tr-tile__ic"><Ic n="plus" /></span>
          <span className="tr-tile__t">Start a quote</span>
        </Link>
        <Link href="/trade/stock" className="tr-tile">
          <span className="tr-tile__ic"><Ic n="box" /></span>
          <span className="tr-tile__t">Factory stock</span>
        </Link>
        <Link href="/trade/van/parts" className="tr-tile">
          <span className="tr-tile__ic"><Ic n="van" /></span>
          <span className="tr-tile__t">Order parts</span>
        </Link>
        <Link href="/trade/van/check" className="tr-tile">
          <span className="tr-tile__ic"><Ic n="check" /></span>
          {van && week.done === week.steps.length && <span className="tr-tile__badge"><span className="tr-chip tr-chip--good">Done</span></span>}
          <span className="tr-tile__t">Weekly check</span>
        </Link>
      </div>

      <div className="tr-split tr-split--home">
        <section className="tr-card">
          <h2 style={{ marginBottom: 4 }}>Needs you</h2>
          {needs.length ? (
            <div className="tr-rows">
              {needs.map((n) => {
                const body = (
                  <>
                    <span className="tr-row__ic"><Ic n={n.icon} size={20} /></span>
                    <span className="tr-row__k"><strong>{n.title}</strong><span>{n.sub}</span></span>
                    <span className={`tr-chip ${n.tone === "warn" ? "tr-chip--warn" : ""}`}>{n.chip}</span>
                    {/* Kept when there's nowhere to go, so every chip lines up. */}
                    <span className="tr-row__go" style={n.href ? undefined : { visibility: "hidden" }}><Ic n="chevron" size={18} /></span>
                  </>
                );
                return n.href
                  ? <Link key={n.title} href={n.href} className="tr-row">{body}</Link>
                  : <div key={n.title} className="tr-row">{body}</div>;
              })}
            </div>
          ) : (
            <p className="tr-empty" style={{ padding: "10px 0 4px" }}>Nothing needs you. The van&rsquo;s checked and nothing&rsquo;s waiting.</p>
          )}
        </section>

        <section className="tr-card tr-stack" style={{ gap: 10 }}>
          <div className="tr-card__h" style={{ marginBottom: 0 }}>
            <h2>Your month</h2>
            <Link href="/trade/pricebook">Pricebook →</Link>
          </div>
          {month ? (
            <>
              <span className="tr-muted">Sold in {month.month}</span>
              <span className="tr-big">{money(month.sold)}</span>
              {month.closeRate != null ? (
                <>
                  <div className="tr-bar" aria-hidden="true"><span style={{ width: `${Math.round(month.closeRate * 100)}%` }} /></div>
                  <span className="tr-muted" style={{ fontSize: 15 }}>
                    {Math.round(month.closeRate * 100)}% close rate · {month.soldJobs} of {month.quotedJobs} jobs quoted · {money(month.quoted)} quoted
                  </span>
                </>
              ) : (
                <span className="tr-muted" style={{ fontSize: 15 }}>
                  {month.quotedJobs ? `${month.quotedJobs} jobs quoted · ${money(month.quoted)}` : "Nothing quoted in ServiceTitan under your name yet this month."}
                </span>
              )}
            </>
          ) : (
            <p className="tr-empty">The month&rsquo;s figures aren&rsquo;t in yet — they come from the wall board&rsquo;s last sync.</p>
          )}
        </section>
      </div>
    </TradeShell>
  );
}
