import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { NeedsList } from "@/components/portal/NeedsList";
import { latestBoard, savedGoal } from "@/lib/portal/office";
import { needsToday } from "@/lib/portal/needs";
import { money } from "@/lib/portal/format";
import { dbConfigured } from "@/lib/portal/db";
import { q, sbSelect } from "@/lib/dashboard/db";
import { isoDateMelbourne, startOfMonthMelbourne } from "@/lib/dashboard/dates";
import { jobProfits } from "@/lib/dashboard/jobProfit";
import { crewFigures } from "@/lib/portal/crewRates";
import { yearSpans } from "@/lib/portal/yearGoal";

export const dynamic = "force-dynamic";
export const metadata = { title: "The numbers — Team portal" };

const pc = (n: number | null | undefined, dp = 0) =>
  n == null || !Number.isFinite(n) ? "—" : `${(n * 100).toLocaleString("en-AU", { maximumFractionDigits: dp })}%`;
const count = (n: number | null | undefined) => (n == null ? "—" : Math.round(n).toLocaleString("en-AU"));

const Arrow = () => <span className="pt-nbr__go" aria-hidden="true">→</span>;

/**
 * Where the company is at, to the mock: the year in four figures, the month as
 * the six steps the money moves through with the rate between each, and what
 * needs someone today beside the month's profit and average job.
 *
 * Every figure is the board's own, from its latest snapshot — the same pace
 * view the wall paces against — so this page and the TV can't disagree. Paid
 * and still owing come off the month's invoices. "First reply to a new lead"
 * is in the design and left out: nothing records when a lead was first
 * contacted, so it would read "—" forever.
 */
export default async function NumbersPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The numbers" forWhom="managers" />;

  const now = new Date();
  const from = isoDateMelbourne(startOfMonthMelbourne(now));
  const today = isoDateMelbourne(now);
  const ready = dbConfigured();
  const [board, goal, lines, crew, paidRows] = await Promise.all([
    latestBoard(),
    savedGoal(),
    needsToday(user).catch(() => []),
    crewFigures().catch(() => null),
    ready
      ? sbSelect<{ total: number | null; balance: number | null }>("st_invoices", [q.select("total,balance"), q.gte("invoice_date", from)].join("&")).catch(() => null)
      : Promise.resolve(null),
  ]);
  const m = board?.metrics ?? null;
  const pace = m?.pace ?? null;
  const y = pace?.yearView ?? null;
  const mo = m?.paceData?.periods.month ?? null;
  const monthName = now.toLocaleDateString("en-AU", { month: "long", timeZone: "Australia/Melbourne" });

  // The year's job margin: everything invoiced since the goal's year began
  // that could be costed. Read live, because it isn't on the snapshot.
  const yearFrom = goal ? yearSpans(goal.basis, goal.year)[0]?.from ?? null : null;
  const yearProfit = ready && yearFrom
    ? await jobProfits(yearFrom, today, crew?.costPerHr ?? null, goal?.profitPct ?? null).then((r) => r.summary).catch(() => null)
    : null;
  const jp = m?.jobProfitMonth ?? null;

  const paid = paidRows ? paidRows.reduce((t, r) => t + Math.max(0, Number(r.total ?? 0) - Number(r.balance ?? 0)), 0) : null;
  const owing = paidRows ? paidRows.reduce((t, r) => t + Math.max(0, Number(r.balance ?? 0)), 0) : null;
  const invoiced = mo?.invoiced ?? null;
  const monthNeed = pace?.month.invoiced.value ?? null;
  const endLabel = goal ? new Date(`${yearSpans(goal.basis, goal.year)[11].to}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "long", timeZone: "UTC" }) : null;
  const onTrack = y && y.byNow > 0 ? y.ytd / y.byNow : null;
  const goalPct = goal?.profitPct ?? null;

  // A rate sits between two steps only where one is a share of the other.
  // Leads to quotes isn't: most bookings arrive by phone and never become a
  // lead, so it reads over 100%. Sold to done to invoiced are different jobs
  // in the same month, not the same jobs moving on, so they get the arrow
  // alone rather than a word standing in for a figure.
  const steps: Array<{ n: string; k: string; v: string; sub: string; href: string; rate?: string }> = [
    { n: "1", k: "Leads", v: count(mo?.leads), sub: mo?.booked != null ? `${count(mo.booked)} booked a visit or call` : "", href: "/portal/leads" },
    { n: "2", k: "Quotes sent", v: count(mo?.quoted), sub: mo?.quotedValue != null ? `${money(mo.quotedValue)} quoted` : "", href: "/portal/quotes", rate: m?.closeRate30d != null ? `${pc(m.closeRate30d)} close` : undefined },
    { n: "3", k: "Sold", v: mo?.soldValue != null ? money(mo.soldValue) : "—", sub: mo?.sold != null ? `${count(mo.sold)} ${mo.sold === 1 ? "job" : "jobs"}` : "", href: "/portal/quotes" },
    { n: "4", k: "Jobs done", v: count(mo?.completed), sub: "installs and service", href: "/portal/hours" },
    {
      n: "5", k: "Invoiced", v: invoiced != null ? money(invoiced) : "—",
      sub: invoiced != null && monthNeed ? `${pc(invoiced / monthNeed)} of the ${money(monthNeed)} target` : "",
      href: "/portal/money",
      rate: invoiced && paid != null ? `${pc(paid / invoiced)} paid` : undefined,
    },
    { n: "6", k: "Paid", v: paid != null ? money(paid) : "—", sub: owing != null ? `${money(owing)} still owing` : "", href: "/portal/money" },
  ];

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-nbr">
      <div className="pt-head pt-head--split">
        <div>
          <div className="pt-head__eyebrow">The numbers · {monthName}</div>
          <h1>Where the company is at.</h1>
          <p>Every number comes from the page behind it. Tap any of them to see the jobs, quotes or invoices it&rsquo;s made of.</p>
        </div>
        <span className="pt-nbr__chip">{monthName} so far · from ServiceTitan</span>
      </div>

      {!m && (
        <div className="pt-note pt-note--warn">
          <strong>No snapshot yet.</strong> The figures here are the wall board&rsquo;s, and it hasn&rsquo;t taken one from ServiceTitan.
        </div>
      )}

      <div className="pt-nbr__stats">
        <Link href="/portal/pace" className="pt-nbr__stat">
          <span className="pt-nbr__k">Invoiced this year <Arrow /></span>
          <strong>{y ? money(y.ytd) : "—"}</strong>
          {y && (
            <span className="pt-nbr__bar" aria-hidden="true">
              <i style={{ width: `${Math.min(100, (y.ytd / y.goal) * 100)}%` }} />
              <b style={{ left: `${Math.min(100, (y.byNow / y.goal) * 100)}%` }} />
            </span>
          )}
          <span className="pt-nbr__sub">{y ? `since ${new Date(`${yearFrom}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "long", timeZone: "UTC" })} · goal ${money(y.goal)}` : "no goal set"}</span>
        </Link>
        <Link href="/portal/pace" className="pt-nbr__stat">
          <span className="pt-nbr__k">On track <Arrow /></span>
          <strong className={onTrack == null ? "" : onTrack >= 1 ? "is-good" : "is-bad"}>{pc(onTrack)}</strong>
          <span className="pt-nbr__sub">{y ? `${money(y.byNow)} by now · ${y.gap < 0 ? `${money(-y.gap)} behind` : `${money(y.gap)} ahead`}` : ""}</span>
        </Link>
        <Link href="/portal/profit?w=90" className="pt-nbr__stat">
          <span className="pt-nbr__k">Profit this year <Arrow /></span>
          <strong className={yearProfit?.margin == null || goalPct == null ? "" : yearProfit.margin >= goalPct / 100 ? "is-good" : "is-bad"}>{pc(yearProfit?.margin, 1)}</strong>
          <span className="pt-nbr__sub">{goalPct ? `goal ${goalPct}%` : "no profit goal set"}{yearProfit ? ` · ${yearProfit.costed} jobs costed` : ""}</span>
        </Link>
        <Link href="/portal/pace" className="pt-nbr__stat">
          <span className="pt-nbr__k">Still to go <Arrow /></span>
          <strong>{y ? money(Math.max(0, y.goal - y.ytd)) : "—"}</strong>
          <span className="pt-nbr__sub">{y && endLabel ? `to ${money(y.goal)} by ${endLabel}` : ""}</span>
        </Link>
      </div>

      <h2 className="pt-nbr__h">The flow, {monthName}</h2>
      <ol className="pt-nbr__flow">
        {steps.map((s, i) => (
          <li key={s.k} className="pt-nbr__stepwrap">
            <Link href={s.href} className="pt-nbr__step">
              <span className="pt-nbr__k">{s.n} · {s.k}</span>
              <strong>{s.v}</strong>
              <span className="pt-nbr__sub">{s.sub}</span>
              <span className="pt-nbr__open">Open →</span>
            </Link>
            {i < steps.length - 1 && (
              <span className="pt-nbr__rate">
                <span aria-hidden="true">→</span>
                {s.rate && <em>{s.rate}</em>}
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="pt-nbr__lower">
        <NeedsList lines={lines} aside={<span>Each one opens the list</span>} />
        <div className="pt-nbr__side">
          <Link href="/portal/profit" className="pt-nbr__stat">
            <span className="pt-nbr__k">Profit this month <Arrow /></span>
            <strong className={jp?.margin == null || goalPct == null ? "" : jp.margin >= goalPct / 100 ? "is-good" : "is-bad"}>{jp ? money(jp.profit) : "—"}</strong>
            <span className="pt-nbr__sub">
              {jp?.margin != null ? `${pc(jp.margin, 1)} of the work before GST` : jp ? `${jp.costed} jobs costed so far` : ""}
              {jp && goalPct ? ` · ${goalPct}% would be ${money(jp.revenue * (goalPct / 100))}` : ""}
            </span>
          </Link>
          <Link href="/portal/money" className="pt-nbr__stat">
            <span className="pt-nbr__k">Average job <Arrow /></span>
            <strong>{invoiced != null && mo?.completed ? money(invoiced / mo.completed) : "—"}</strong>
            <span className="pt-nbr__sub">{mo?.completed != null && invoiced != null ? `${count(mo.completed)} jobs, ${money(invoiced)} invoiced` : ""}</span>
          </Link>
          <Link href="/portal/quotes" className="pt-nbr__stat">
            <span className="pt-nbr__k">Quotes out <Arrow /></span>
            <strong>{m ? money(m.estimatesOpenValue) : "—"}</strong>
            <span className="pt-nbr__sub">{m ? `${count(m.estimatesOpenCount)} waiting on a yes · last ${m.outstandingDays} days` : ""}</span>
          </Link>
        </div>
      </div>
      </div>
    </PortalShell>
  );
}
