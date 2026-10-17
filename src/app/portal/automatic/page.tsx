import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { PageHead } from "@/components/portal/kit/PageHead";
import { AutoSwitch } from "@/components/portal/AutoSwitch";
import { loadAutoLog, loadSwitches } from "@/lib/automation/log";

export const dynamic = "force-dynamic";
export const metadata = { title: "Automatic · Team portal" };

const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });

/**
 * Settings › Automatic: what the portal does by itself, and everything it has
 * done, newest first, so nothing changes in ServiceTitan without a record of it.
 */
export default async function AutomaticPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead") && !can(user, "manage_users")) return <Locked user={user} what="Automatic" forWhom="the office" />;
  const [sw, log] = await Promise.all([loadSwitches(), loadAutoLog()]);
  const week = log.filter((e) => Date.now() - Date.parse(e.at) < 7 * 86_400_000);
  return (
    <PortalShell user={user}>
      <div className="sx">
      <PageHead hi="Settings" title="Automatic" line="What the portal does by itself after each ServiceTitan sync, and a line for every time it did something." kpis={[
        { icon: "check", fig: String(week.filter((e) => e.ok).length), label: "Done in the last 7 days" },
        { icon: "alert", fig: String(week.filter((e) => !e.ok).length), label: "Couldn't be done, last 7 days" },
      ]} />

      <section className="pk-card pk-pad au-list">
        <h2 className="rv-h2">What runs by itself</h2>
        <div className="au-item">
          <div>
            <b>Take &ldquo;Awaiting Quote Approval&rdquo; off answered quotes</b>
            <p>When a job with that tag has been invoiced, is booked in for a visit to come, or has had a job booked from its quote, the tag comes off in ServiceTitan. Only that tag; the job&rsquo;s other tags stay.</p>
          </div>
          <AutoSwitch on={sw.quoteTag} canEdit={can(user, "manage_users")} />
        </div>
        <div className="au-item">
          <div>
            <b>Draft the orders</b>
            <p>Every sync drafts orders from the latest bookings, and To order checks every 10 minutes while it&rsquo;s open. Nothing goes to a supplier until it&rsquo;s approved.</p>
          </div>
          <span className="au-on">Always on</span>
        </div>
      </section>

      <section className="pk-card pk-pad">
        <h2 className="rv-h2">What it&rsquo;s done</h2>
        {log.length ? (
          <ul className="au-log">
            {log.slice(0, 200).map((e, i) => (
              <li key={`${e.at}-${i}`} className={e.ok ? undefined : "bad"}>
                <span className="au-when">{when(e.at)}</span>
                <span className="au-what">
                  <b>{e.ok ? "✓" : "!"} {e.title}</b>
                  {e.detail && <span>{e.detail}</span>}
                </span>
                {e.jobId ? <a className="jp-open" href={`https://go.servicetitan.com/#/Job/Index/${e.jobId}`} target="_blank" rel="noreferrer">ServiceTitan ↗</a> : null}
              </li>
            ))}
          </ul>
        ) : <p className="qp-note">Nothing yet. The first run is after the next ServiceTitan sync.</p>}
      </section>
    </div>
    </PortalShell>
  );
}
