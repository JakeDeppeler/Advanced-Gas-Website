import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Bad, Card, Good, Head, Say } from "@/components/portal/kit/Kit";
import { NotifyTo } from "@/components/portal/AutoSwitch";
import { AutoLog, Item, ORDER_ACTS, ORDER_KINDS, WO_RULES, kindOf } from "@/components/portal/automation/AutoParts";
import { NOTIFY_DEFAULT, loadAutoLog, loadSwitches, type AutoKey } from "@/lib/automation/log";

export const dynamic = "force-dynamic";
export const metadata = { title: "Automation · Team portal" };

/**
 * To order › Automation: what ordering does by itself, each with its switch,
 * and every time it did something in the last fortnight. These lived on
 * Settings › Automatic, a page nobody doing the ordering opens; here they sit
 * beside the orders they act on.
 */
export default async function OrderingAutomationPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Ordering automation" forWhom="managers" />;
  const [sw, all] = await Promise.all([loadSwitches(), loadAutoLog().catch(() => [])]);
  const log = all.filter((e) => ORDER_KINDS.has(e.kind) && Date.now() - Date.parse(e.at) < 14 * 86_400_000);
  const week = log.filter((e) => Date.now() - Date.parse(e.at) < 7 * 86_400_000);
  const done = week.filter((e) => e.ok).length;
  const failed = week.filter((e) => !e.ok).length;
  const count = (k: AutoKey) => week.filter((e) => e.kind === kindOf(k) && e.ok).length;
  const admin = can(user, "manage_users");

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head
          title="Automation"
          sub="What ordering does by itself, and a line for every time it did something"
          info={[
            ["Switches", "Only an admin can turn one off or on. Everyone else sees where each one stands."],
            ["Supplier orders", "Never sent by themselves. System and material orders spend money, so each waits on To order for someone to send it."],
          ]}
        />
        <Say>
          {done ? <>{done} {done === 1 ? "thing" : "things"} done in the last 7 days</> : <>Nothing done in the last 7 days</>}
          {failed ? <>, <Bad>{failed} couldn&rsquo;t be done</Bad>.</> : <>. <Good>Nothing failed.</Good></>}
        </Say>
      </div>

      <div className="nw-two">
        <section className="pk-card pk-pad au-list">
          <h2 className="rv-h2">What it does</h2>
          <div className="au-item">
            <div>
              <b>Draft the orders</b>
              <p>Every sync drafts orders from the latest bookings, this week&rsquo;s every weekday and next week&rsquo;s from Wednesday, and To order checks every 10 minutes while it&rsquo;s open. Nothing goes to a supplier until someone sends it.</p>
            </div>
            <span className="au-on">Always on</span>
          </div>
          {ORDER_ACTS.map((a) => (
            <div key={a.k}>
              <Item a={a} on={sw[a.k]} n={count(a.k)} admin={admin} />
              {a.k === "workOrderSend" && (
                <div className={`au-rules${sw.workOrderSend ? "" : " off"}`} aria-label="When work orders go">
                  {WO_RULES.map((r) => <Item key={r.k} a={r} on={sw[r.k]} n={0} admin={admin} />)}
                </div>
              )}
            </div>
          ))}
          <div className="au-item au-office">
            <div>
              <b>Tell me when it&rsquo;s emailed someone</b>
              <p>Whenever it sends a work order or tells a contractor a job&rsquo;s moved, these addresses get an email saying what went and to whom. Several with commas.</p>
            </div>
            <NotifyTo value={sw.notifyTo ?? NOTIFY_DEFAULT} canEdit={admin} />
          </div>
        </section>

        <Card title="What it did" aside="last 14 days">
          <AutoLog log={log.slice(0, 80)} empty="Nothing in the last fortnight." />
        </Card>
      </div>
    </PortalShell>
  );
}
