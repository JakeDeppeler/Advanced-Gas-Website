import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { xeroStatus, getPLDetail, type PLDetail } from "@/lib/portal/xero";
import { savedGoal } from "@/lib/portal/office";
import { summarisePL, type PLSummary } from "@/lib/portal/run/pl";
import { money, pc } from "@/lib/portal/run/month";
import { PERIODS, periodSpans, periodWords, readPeriod, type PeriodKey } from "@/lib/portal/run/period";
import { Bad, Card, Good, Head, PeriodTabs, Say } from "@/components/portal/kit/Kit";
import { Diff, XeroOff } from "@/components/portal/finance/Parts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profit & loss · Team portal" };

type Group = "sales" | "jobs" | "overheads" | "other";
const GROUPS: [Group, string][] = [["sales", "Sales"], ["jobs", "Cost of jobs"], ["overheads", "Overheads"], ["other", "Other income"]];
const isOther = (t: string) => /other income/i.test(t);
const isCogs = (t: string) => /cost of (sales|goods)|direct cost/i.test(t);
const groupOf = (title: string, kind: string): Group | null =>
  kind === "in" ? (isOther(title) ? "other" : "sales") : kind === "out" ? (isCogs(title) ? "jobs" : "overheads") : null;

/** Every account in a P&L, by group, so columns from different periods line up by name. */
function byGroup(d: PLDetail | null): Map<Group, Map<string, number>> {
  const out = new Map<Group, Map<string, number>>(GROUPS.map(([g]) => [g, new Map()]));
  for (const s of d?.sections ?? []) {
    const g = groupOf(s.title, s.kind);
    if (!g) continue;
    const m = out.get(g)!;
    for (const l of s.lines) m.set(l.label, (m.get(l.label) ?? 0) + l.amount);
  }
  return out;
}

/**
 * Profit & finance › Profit & loss: the four periods side by side, the one
 * picked shaded, every account under Sales, Cost of jobs and Overheads, then
 * what changed in the picked period against the same stretch before it.
 */
export default async function ProfitLossPage({ searchParams }: { searchParams: { p?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Profit & loss" forWhom="managers" />;

  const period = readPeriod(searchParams.p, "month");
  const { status: xs } = await xeroStatus();

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Profit & loss" sub="From Xero · before GST" info={[
          ["Gross profit", "Sales less the cost of doing the jobs: parts, the techs’ time and subbies."],
          ["Overheads", "What it costs to keep the doors open, job or no job."],
          ["Net profit", "What’s left at the end, after every cost."],
          ["The shaded column", "The period picked above. The changes at the foot are that period against the same stretch before it."],
        ]} />
        <PeriodTabs on={period} items={PERIODS} href={(k) => `/portal/finance/pl${k === "month" ? "" : `?p=${k}`}`} />
        {xs === "connected" ? <Statement period={period} /> : <XeroOff state={xs} what="profit and loss" />}
      </div>
    </PortalShell>
  );
}

async function Statement({ period }: { period: PeriodKey }) {
  const cols = PERIODS.map((p) => ({ ...p, span: periodSpans(p.k).now }));
  const before = periodSpans(period).before;
  const [details, beforeD, year] = await Promise.all([
    Promise.all(cols.map((c) => getPLDetail(c.span.from, c.span.to).catch(() => null))),
    getPLDetail(before.from, before.to).catch(() => null),
    savedGoal(),
  ]);
  const at = cols.findIndex((c) => c.k === period);
  const picked = details[at];
  if (!picked) return <XeroOff state="no-answer" what={`the profit and loss for ${periodWords(period)}`} />;

  const sums: (PLSummary | null)[] = details.map((d) => (d ? summarisePL(d) : null));
  const groups = details.map(byGroup);
  const s = sums[at];
  const goal = year?.profitPct ?? null;
  const npPct = s ? (s.net / s.revenue) * 100 : null;

  const shade = (i: number) => (i === at ? { background: "var(--sunken)" } : undefined);
  const cell = (v: number | null | undefined, i: number, bold?: boolean, pctOf?: number | null) => (
    <td key={i} style={shade(i)}>
      {v == null ? "" : bold ? <b>{money(v)}</b> : money(v)}
      {pctOf && v != null ? <div className="ks">{pc((v / pctOf) * 100, 1)}</div> : null}
    </td>
  );
  const groupRows = (g: Group, title: string, total: (x: PLSummary) => number) => {
    const labels = new Set(groups.flatMap((m) => [...m.get(g)!.keys()]));
    if (!labels.size) return null;
    const ordered = [...labels].sort((a, b) => (groups[at].get(g)!.get(b) ?? 0) - (groups[at].get(g)!.get(a) ?? 0));
    return (
      <>
        <tr><td><b>{title}</b></td>{sums.map((x, i) => cell(x ? total(x) : null, i, true))}</tr>
        {ordered.map((l) => (
          <tr key={`${g}-${l}`}>
            <td style={{ paddingLeft: 22, color: "var(--ink2)" }}>{l}</td>
            {groups.map((m, i) => cell(details[i] ? m.get(g)!.get(l) ?? 0 : null, i))}
          </tr>
        ))}
      </>
    );
  };
  const hasOther = groups.some((m) => m.get("other")!.size > 0);

  // What changed: every account in the picked period against the same stretch before.
  const bg = byGroup(beforeD);
  const changes = beforeD ? GROUPS.flatMap(([g, name]) => {
    const a = groups[at].get(g)!, b = bg.get(g)!;
    return [...new Set([...a.keys(), ...b.keys()])].map((l) => ({ g, name, l, now: a.get(l) ?? 0, was: b.get(l) ?? 0 }));
  }).filter((x) => Math.abs(x.now - x.was) >= 200).sort((x, y) => Math.abs(y.now - y.was) - Math.abs(x.now - x.was)).slice(0, 12) : [];

  return (
    <>
      {s && npPct != null && (
        <Say>
          {periodWords(period).replace(/^./, (c) => c.toUpperCase())} made <b>{money(s.net)}</b>, {pc(npPct, 1)} of sales.{" "}
          {goal == null ? null : npPct >= goal ? <Good>On the {goal}% goal.</Good> : <Bad>Under the {goal}% goal.</Bad>}
        </Say>
      )}
      <Card title="Profit & loss" aside="from Xero · before GST · the shaded column is the one you picked">
        <div className="pk-tbl-wrap">
          <table className="pk-tbl">
            <thead><tr><th />{cols.map((c, i) => <th key={c.k} style={shade(i)}>{c.k === "month" || c.k === "lastmonth" || c.k === "prevmonth" ? periodWords(c.k) : c.label}</th>)}</tr></thead>
            <tbody>
              {groupRows("sales", "Sales", (x) => x.revenue)}
              {groupRows("jobs", "Cost of jobs", (x) => x.cogs)}
              <tr className="tot"><td>Gross profit</td>{sums.map((x, i) => cell(x?.gp, i, true, x?.revenue))}</tr>
              {groupRows("overheads", "Overheads", (x) => x.overheads)}
              {hasOther && groupRows("other", "Other income", (x) => x.net - x.gp + x.overheads)}
              <tr className="tot"><td>Net profit</td>{sums.map((x, i) => cell(x?.net, i, true, x?.revenue))}</tr>
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="What changed" aside={`${periodWords(period)} against ${before.label} · moves of $200 or more`}>
        {!beforeD ? <p className="pk-note">Xero didn’t return {before.label} to compare against.</p>
          : changes.length === 0 ? <p className="pk-note">No account moved by $200 or more.</p>
            : changes.map((c) => (
              <div className="pk-kv" key={`${c.g}-${c.l}`}>
                <span className="t">{c.l}<span>{c.name} · {money(c.now)} against {money(c.was)}</span></span>
                <span className="v"><Diff d={c.now - c.was} lowerIsBetter={c.g === "jobs" || c.g === "overheads"} /></span>
              </div>
            ))}
      </Card>
    </>
  );
}
