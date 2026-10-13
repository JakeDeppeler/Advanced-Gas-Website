import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { getPLDetail, xeroStatus } from "@/lib/portal/xero";
import { moveOf, spendLines, type SpendLine } from "@/lib/portal/run/money";
import { money } from "@/lib/portal/run/month";
import { PERIODS, periodSpans, periodWords, readPeriod, type PeriodKey } from "@/lib/portal/run/period";
import { Bad, Card, Empty, Head, PeriodTabs, Pill, Say, Tabs } from "@/components/portal/kit/Kit";
import { Diff, XeroOff } from "@/components/portal/finance/Parts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Spending — Team portal" };

type G = "all" | SpendLine["group"];
const GROUPS: { k: G; label: string }[] = [{ k: "all", label: "Everything" }, { k: "jobs", label: "Cost of jobs" }, { k: "overheads", label: "Overheads" }];

const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/**
 * Profit & finance › Spending: every expense account in Xero for the period,
 * against the same stretch before it, biggest first. Split into what the jobs
 * cost and what it costs to keep the doors open, so a busy month's parts bill
 * doesn't hide a creeping overhead.
 */
export default async function SpendPage({ searchParams }: { searchParams: { p?: string; g?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Spending" forWhom="managers" />;

  const period = readPeriod(searchParams.p, "month");
  const g: G = searchParams.g === "jobs" || searchParams.g === "overheads" ? searchParams.g : "all";
  const href = (p: string, gg: G) => {
    const q = [p !== "month" ? `p=${p}` : "", gg !== "all" ? `g=${gg}` : ""].filter(Boolean).join("&");
    return `/portal/finance/spend${q ? `?${q}` : ""}`;
  };
  const { status: xs } = await xeroStatus();

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Spending" sub="From Xero · before GST" info={[
          ["Cost of jobs", "Parts, materials, subbies and field wages — what goes up and down with the work."],
          ["Overheads", "What it costs to keep the doors open, job or no job."],
          ["Before", "The same stretch just before it — this month so far against the same days of last month, this financial year against the same point last year — so a part-done month isn’t compared with a whole one."],
          ["Up or down", "More than 10% and $200 either way. Smaller moves are the usual noise."],
        ]} />
        <PeriodTabs on={period} items={PERIODS} href={(k) => href(k, g)} />
        <Tabs on={g} label="What it was spent on" items={GROUPS.map((x) => ({ key: x.k, label: x.label, href: href(period, x.k) }))} />
        {xs === "connected" ? <Spend period={period} g={g} /> : <XeroOff state={xs} what="spending" />}
      </div>
    </PortalShell>
  );
}

async function Spend({ period, g }: { period: PeriodKey; g: G }) {
  const spans = periodSpans(period);
  const [now, before] = await Promise.all([
    getPLDetail(spans.now.from, spans.now.to).catch(() => null),
    getPLDetail(spans.before.from, spans.before.to).catch(() => null),
  ]);
  if (!now) return <XeroOff state="no-answer" what={`the spending for ${periodWords(period)}`} />;
  const lines = spendLines(now, before).filter((l) => g === "all" || l.group === g);
  const tot = lines.reduce((a, l) => a + l.now, 0), usual = lines.reduce((a, l) => a + l.usual, 0);
  const up = lines.filter((l) => moveOf(l) === "up").sort((a, b) => b.now - b.usual - (a.now - a.usual));
  const words = periodWords(period);
  const what = g === "jobs" ? "spending on jobs" : g === "overheads" ? "overheads" : "spending";

  if (!lines.length) return <Empty>Xero has nothing under {GROUPS.find((x) => x.k === g)!.label.toLowerCase()} for {words}.</Empty>;
  return (
    <>
      <Say>
        {what.replace(/^./, (c) => c.toUpperCase())} for {words} is <b>{money(tot)}</b>
        {before ? <>, {money(Math.abs(tot - usual))} {tot <= usual ? "less than" : "more than"} {spans.before.label}.</> : "."}
        {up.length ? <> <Bad>{list(up.slice(0, 3).map((l) => l.label))} {up.length === 1 ? "is" : "are"} up{up.length > 3 ? `, and ${up.length - 3} more` : ""}.</Bad></> : null}
      </Say>
      <Card title="Where the money went" aside={before ? `${words} against ${spans.before.label} · from Xero` : `${words} · Xero didn’t return ${spans.before.label} to compare`}>
        <div className="pk-tbl-wrap">
          <table className="pk-tbl">
            <thead><tr><th>Spent on</th><th>{period === "month" || period === "lastmonth" ? words : "This period"}</th><th>Before</th><th>Difference</th><th className="l">Share</th><th className="l">How it’s going</th></tr></thead>
            <tbody>
              {lines.map((l) => {
                const mv = moveOf(l);
                return (
                  <tr key={l.label}>
                    <td><b>{l.label}</b>{g === "all" && <div className="ks">{l.group === "jobs" ? "cost of jobs" : "overhead"}</div>}</td>
                    <td><b>{money(l.now)}</b></td>
                    <td>{before ? money(l.usual) : "—"}</td>
                    <td>{before ? <Diff d={l.now - l.usual} lowerIsBetter /> : "—"}</td>
                    <td className="l" style={{ width: 150 }}><div className="pk-bar" style={{ margin: 0 }}><i style={{ width: `${tot > 0 ? Math.max(1, (l.now / tot) * 100) : 0}%` }} /></div></td>
                    <td className="l">{before ? <Pill st={mv === "up" ? { k: "bad", w: "Up", s: "▲" } : mv === "down" ? { k: "good", w: "Down", s: "▼" } : { k: "none", w: "Usual" }} /> : null}</td>
                  </tr>
                );
              })}
              <tr className="tot"><td>Total</td><td>{money(tot)}</td><td>{before ? money(usual) : "—"}</td><td>{before ? <Diff d={tot - usual} lowerIsBetter /> : "—"}</td><td /><td /></tr>
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
