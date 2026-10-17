import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { SalesTabs } from "@/components/portal/run/RunTabs";
import { Card, Empty, Grid, Head, Say, Tile, none } from "@/components/portal/kit/Kit";
import { loadPipeline } from "@/lib/pipeline/store";
import { daysBetween, isSold, type PipeQuote } from "@/lib/pipeline/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lost quotes · Team portal" };

const DAYS = 90;
const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const pc = (f: number) => `${Math.round(f * 100)}%`;
const NO_REASON = "No reason given";

/**
 * Why quotes are lost, over the last 90 days: by reason, by who quoted, and
 * every one of them. A reason is set when a quote is marked lost here, which
 * also dismisses it in ServiceTitan; a quote dismissed straight in ServiceTitan
 * has none to give (its dismiss carries no reason) and is counted as such, so
 * the share of those is itself the thing to fix.
 */
export default async function LostQuotesPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!(can(user, "quotes") || can(user, "overhead"))) return <Locked user={user} what="Lost quotes" forWhom="the office" />;

  const p = await loadPipeline({ recentDays: DAYS }).catch(() => null);
  const lost = (p?.quotes ?? []).filter((q) => q.stage === "lost");
  // Sold in the same window as the losses, wherever the job has got to since.
  const won = (p?.quotes ?? []).filter((q) => isSold(q.stage) && q.soldOn != null && daysBetween(q.soldOn, p?.today ?? q.soldOn) <= DAYS);
  const reasonOf = (q: PipeQuote) => q.lostReason ?? NO_REASON;

  const group = (key: (q: PipeQuote) => string) => {
    const m = new Map<string, { n: number; value: number }>();
    for (const q of lost) {
      const k = key(q);
      const g = m.get(k) ?? { n: 0, value: 0 };
      g.n += 1; g.value += q.value;
      m.set(k, g);
    }
    return [...m.entries()].map(([k, g]) => ({ k, ...g })).sort((a, b) => b.n - a.n || b.value - a.value);
  };
  const byReason = group(reasonOf);
  const byWho = group((q) => q.quotedBy ?? "Not recorded");
  const lostValue = lost.reduce((a, q) => a + q.value, 0);
  const unexplained = lost.filter((q) => !q.lostReason).length;
  const top = byReason.find((r) => r.k !== NO_REASON);
  const decided = lost.length + won.length;

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Lost quotes" sub={`Last ${DAYS} days · marked lost here or dismissed in ServiceTitan`} />
        {can(user, "overhead") && <SalesTabs on="lost" />}
        {!p ? <Empty>ServiceTitan&rsquo;s quotes couldn&rsquo;t be read just now.</Empty> : (
          <>
            <Say>
              {lost.length === 0 ? <>No quotes lost in the last {DAYS} days.</> : (
                <>
                  {lost.length} quotes lost in the last {DAYS} days, worth {money(lostValue)} with GST.
                  {top ? <> The biggest reason is <b>{top.k.toLowerCase()}</b>: {top.n} of them.</> : null}
                  {unexplained ? <> {unexplained} were dismissed in ServiceTitan with no reason, mark them lost from <Link href="/portal/pipeline">Quotes</Link> instead, so the reason is kept.</> : null}
                </>
              )}
            </Say>
            <Grid cols={3}>
              <Tile label="Lost" st={none("")} fig={String(lost.length)} frac={decided ? lost.length / decided : null} sub={`${money(lostValue)} · of ${decided} decided`} />
              <Tile label="Won" st={none("")} fig={String(won.length)} frac={decided ? won.length / decided : null} sub={decided ? `${pc(won.length / decided)} of the quotes decided` : "none decided"} />
              <Tile label="No reason given" st={unexplained ? { k: "mid", w: "Fix the habit" } : { k: "good", w: "All explained" }} fig={String(unexplained)} frac={lost.length ? unexplained / lost.length : null} sub="dismissed straight in ServiceTitan" />
            </Grid>

            <div className="pk-two" style={{ marginTop: 18 }}>
              <Card title="Why" aside="lost quotes by reason">
                {byReason.length === 0 ? <Empty>Nothing lost.</Empty> : (
                  <div className="pk-tbl-wrap"><table className="pk-tbl">
                    <thead><tr><th>Reason</th><th>Quotes</th><th>Share</th><th className="l">Worth</th></tr></thead>
                    <tbody>{byReason.map((r) => <tr key={r.k}><td><b>{r.k}</b></td><td>{r.n}</td><td>{pc(r.n / lost.length)}</td><td className="l">{money(r.value)}</td></tr>)}</tbody>
                  </table></div>
                )}
              </Card>
              <Card title="Who quoted them" aside="lost quotes by who wrote the quote">
                {byWho.length === 0 ? <Empty>Nothing lost.</Empty> : (
                  <div className="pk-tbl-wrap"><table className="pk-tbl">
                    <thead><tr><th>Quoted by</th><th>Lost</th><th className="l">Worth</th></tr></thead>
                    <tbody>{byWho.map((r) => <tr key={r.k}><td><b>{r.k}</b></td><td>{r.n}</td><td className="l">{money(r.value)}</td></tr>)}</tbody>
                  </table></div>
                )}
              </Card>
            </div>

            <div style={{ marginTop: 18 }}>
              <Card title="Every lost quote" aside="newest first">
                {lost.length === 0 ? <Empty>Nothing lost.</Empty> : (
                  <div className="pk-tbl-wrap"><table className="pk-tbl">
                    <thead><tr><th>Quote</th><th>Quoted</th><th>Worth</th><th>Tries</th><th className="l">Why</th></tr></thead>
                    <tbody>
                      {[...lost].sort((a, b) => b.quotedOn.localeCompare(a.quotedOn)).map((q) => (
                        <tr key={q.key}>
                          <td><b>{[q.jobNumber ? `#${q.jobNumber}` : null, q.customer].filter(Boolean).join(" · ") || "Quote"}</b><div className="ks">{[q.what, q.suburb, q.quotedBy ? `by ${q.quotedBy}` : null].filter(Boolean).join(" · ")}</div></td>
                          <td>{((d) => (d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`))(daysBetween(q.quotedOn, p.today))}</td>
                          <td>{money(q.value)}</td>
                          <td>{q.touches.filter((t) => t.how !== "note").length}</td>
                          <td className="l">{reasonOf(q)}{q.touches.find((t) => t.note?.startsWith("Marked lost:"))?.note?.split(" — ")[1] ? <div className="ks">{q.touches.find((t) => t.note?.startsWith("Marked lost:"))?.note?.split(" — ")[1]}</div> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </PortalShell>
  );
}
