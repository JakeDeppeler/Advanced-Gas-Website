import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { dbConfigured, getSettings } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Figs } from "@/components/portal/Figs";
import { money } from "@/lib/portal/format";
import { readYearGoal } from "@/lib/portal/yearGoal";
import { crewFigures } from "@/lib/portal/crewRates";
import { jobProfits, type JobProfit } from "@/lib/dashboard/jobProfit";
import { addDays, isoDateMelbourne, startOfMonthMelbourne } from "@/lib/dashboard/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profit on every job — Team portal" };

const WINDOWS = [
  { k: "month", label: "This month" },
  { k: "last", label: "Last month" },
  { k: "90", label: "Last 90 days" },
] as const;
type Win = (typeof WINDOWS)[number]["k"];

function range(win: Win, now: Date): { from: string; to: string; name: string } {
  const monthStart = startOfMonthMelbourne(now);
  if (win === "last") {
    const prevStart = startOfMonthMelbourne(addDays(monthStart, -1));
    return { from: isoDateMelbourne(prevStart), to: isoDateMelbourne(addDays(monthStart, -1)), name: prevStart.toLocaleDateString("en-AU", { month: "long", timeZone: "Australia/Melbourne" }) };
  }
  if (win === "90") return { from: isoDateMelbourne(addDays(now, -89)), to: isoDateMelbourne(now), name: "the last 90 days" };
  return { from: isoDateMelbourne(monthStart), to: isoDateMelbourne(now), name: monthStart.toLocaleDateString("en-AU", { month: "long", timeZone: "Australia/Melbourne" }) };
}

const pc = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);
const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Margin, job by job: what each job charged before GST, what its equipment,
 * materials and hours cost, and what was left. The working is in
 * src/lib/dashboard/jobProfit.ts; this page lists it, worst first, and says
 * plainly why any job couldn't be costed rather than leaving it out.
 */
export default async function ProfitPage({ searchParams }: { searchParams: { w?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Profit on every job" forWhom="managers" />;

  const win: Win = WINDOWS.some((w) => w.k === searchParams.w) ? (searchParams.w as Win) : "month";
  const now = new Date();
  const r = range(win, now);
  const ready = dbConfigured();
  const [row, crew] = ready ? await Promise.all([getSettings<unknown>("yeargoal").catch(() => null), crewFigures().catch(() => null)]) : [null, null];
  const goal = readYearGoal(row, now);
  const target = goal.profitPct;
  const res = ready ? await jobProfits(r.from, r.to, crew?.costPerHr ?? null, target).catch(() => null) : null;
  const s = res?.summary ?? null;
  const under = (j: JobProfit) => j.margin != null && target != null && j.margin < target / 100;

  return (
    <PortalShell user={user} variant="wide">
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head pt-head--split">
        <div>
          <h1>Profit on every job</h1>
          <p>
            What each job charged before GST, less the equipment and materials on its invoice and the hours it took at
            what an hour of the crew costs. {target ? `Anything under the goal's ${target}% is marked.` : "Set a profit % on the Pace page to mark the jobs under it."}
          </p>
        </div>
        <nav className="pt-win" aria-label="Time window">
          {WINDOWS.map((w) => (
            <Link key={w.k} href={`/portal/profit?w=${w.k}`} aria-current={w.k === win ? "page" : undefined} className={`pt-win__opt${w.k === win ? " is-on" : ""}`}>
              {w.label}
            </Link>
          ))}
        </nav>
      </div>

      <Figs
        cols={4}
        items={[
          {
            label: "Margin on costed jobs", feature: true,
            value: s?.margin != null ? pc(s.margin) : null,
            sub: s ? `${s.costed} of ${s.jobs} jobs in ${r.name}${target ? ` · goal ${target}%` : ""}` : undefined,
            needs: s ? `${s.costed} jobs costed — needs five to mean anything` : "Couldn't read the invoices",
          },
          { label: "Profit on them", value: s ? money(s.profit) : null, sub: s ? `on ${money(s.revenue)} of work before GST` : undefined, needs: "Couldn't read the invoices" },
          {
            label: target ? `Under ${target}%` : "Under the goal",
            value: s && target ? String(s.under) : null,
            sub: s ? (s.losing ? `${s.losing} losing money` : "none losing money") : undefined,
            needs: "Needs a profit % on the goal",
          },
          { label: "Couldn't be costed", value: s ? String(s.jobs - s.costed) : null, sub: s ? `${money(s.uncostedRevenue)} of work · the reason is on each row` : undefined, needs: "Couldn't read the invoices" },
        ]}
      />

      {res && res.rows.length > 0 ? (
        <section className="pt-panel">
          <div className="pt-pace__tablewrap">
            <table className="pt-pace__table pt-pace__table--jobs pt-profit__table">
              <thead>
                <tr>
                  <th scope="col">Job · worst margin first</th>
                  <th scope="col">Price</th>
                  <th scope="col">Equipment &amp; materials</th>
                  <th scope="col">Hours</th>
                  <th scope="col">Labour</th>
                  <th scope="col">Profit</th>
                  <th scope="col">Margin</th>
                </tr>
              </thead>
              <tbody>
                {res.rows.map((j) => (
                  <tr key={`${j.jobId ?? "x"}-${j.date}-${j.price}`} className={j.profit == null ? "is-uncosted" : undefined}>
                    <th scope="row">
                      <span className="pt-pace__rk">{j.jobType ?? "Job"}</span>
                      <span className="pt-pace__rn">
                        {[j.jobNumber ? `#${j.jobNumber}` : null, j.customer, day(j.date)].filter(Boolean).join(" · ")}
                        {j.missing ? ` — ${j.missing}` : ""}
                      </span>
                    </th>
                    <td>{money(j.price)}</td>
                    <td>{j.materials ? money(j.materials) : "—"}</td>
                    <td>{j.hours == null ? "—" : `${j.hours.toLocaleString("en-AU", { maximumFractionDigits: 1 })}${j.hoursFrom === "sold" ? " sold" : " clocked"}`}</td>
                    <td>{j.labour == null ? "—" : money(j.labour)}</td>
                    <td className={j.profit != null && j.profit < 0 ? "is-low" : ""}>{j.profit == null ? "—" : money(j.profit)}</td>
                    <td className={under(j) ? "is-low" : ""}>{pc(j.margin)}{under(j) ? " ▼" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="pt-note">No priced invoices in {r.name}.</div>
      )}

      <section className="pt-panel">
        <h2 className="pt-panel__h">How each job is costed</h2>
        <ul className="pt-profit__how">
          <li><strong>Price</strong> is the invoice before GST. GST goes to the ATO, so a margin worked on the price including it reads about nine points high.</li>
          <li><strong>Equipment and materials</strong> are the costs ServiceTitan&rsquo;s pricebook puts on each invoice line. An install with none recorded can&rsquo;t be costed — it would show as pure profit.</li>
          <li>
            <strong>Hours</strong> are each tech&rsquo;s clocked time on the job from ServiceTitan&rsquo;s timesheets where they&rsquo;ve synced, otherwise the hours the job was sold with
            {s && s.fromTimesheets ? ` (${s.fromTimesheets} of these jobs use clocked hours)` : " — none have synced yet, so a job that ran long looks better here than it was"}.
          </li>
          <li>
            <strong>Labour</strong> is those hours at {crew?.costPerHr != null ? `${money(crew.costPerHr)} an hour` : "the crew's cost an hour"}: wages and on-costs plus each billable
            hour&rsquo;s share of every overhead, from <Link href="/portal/finance/capacity">Costs &amp; capacity</Link>. What&rsquo;s left is profit after overheads — the same thing the goal&rsquo;s percentage means.
          </li>
        </ul>
      </section>
    </PortalShell>
  );
}
