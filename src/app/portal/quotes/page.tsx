import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Figs, ago } from "@/components/portal/Figs";
import { QuietQuotes } from "@/components/portal/QuietQuotes";
import { latestBoard, monthName } from "@/lib/portal/office";
import { money, pct } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quotes — Team portal" };

type Q = { id: number; label: string; value: number; options: number; ageDays: number };

function QuoteTable({ rows, ageLabel }: { rows: Q[]; ageLabel: string }) {
  return (
    <div className="pt-fleet__wrap">
      <table className="pt-fleet pt-otab">
        <thead><tr><th>Quote</th><th>Options</th><th className="pt-otab__num">{ageLabel}</th><th className="pt-otab__num">Worth</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><strong>{r.label}</strong><span className="pt-fleet__sub">ServiceTitan estimate {r.id}</span></td>
              <td>{r.options}</td>
              <td className="pt-otab__num">{r.ageDays} {r.ageDays === 1 ? "day" : "days"}</td>
              <td className="pt-otab__num"><strong>{money(r.value)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * What's out and what's sold, from the wall board's snapshot of ServiceTitan.
 *
 * Counted per job, not per option: good, better and best on one job are one
 * quote, worth the average of what was offered, because at most one of them
 * sells. The lists are the ones to act on — the quotes gone quiet, longest
 * quiet first by default because that is the order to ring them in, and the
 * biggest still waiting.
 */
export default async function QuotesPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Quotes" forWhom="managers" />;

  const board = await latestBoard();
  const m = board?.metrics ?? null;
  const quiet = m?.quotesQuiet ?? [];

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>Quotes</h1>
        <p>
          What&rsquo;s out and what&rsquo;s sold, per job rather than per option — from ServiceTitan
          {board ? `, as of ${ago(board.computedAt)}` : ""}.
        </p>
      </div>

      <Figs
        cols={4}
        items={[
          {
            label: `Quoted in ${monthName()}`, feature: true,
            value: m ? m.quotesCreatedMonthCount.toLocaleString("en-AU") : null,
            sub: m?.avgQuoteMonth ? `jobs · options average ${money(m.avgQuoteMonth)}` : "jobs priced",
            needs: "Waiting on the board's first snapshot",
          },
          {
            label: "Sold", value: m ? money(m.soldMtd) : null,
            sub: m ? `${m.soldCountMonth} ${m.soldCountMonth === 1 ? "job" : "jobs"} this month` : undefined,
            needs: "Waiting on the board's first snapshot",
          },
          {
            label: "Close rate", value: m?.closeRate30d != null ? pct(m.closeRate30d) : null,
            sub: m ? `${m.closeRate30dSold} of ${m.closeRate30dQuotes} jobs quoted in 30 days` : undefined,
            needs: "Nothing quoted in 30 days",
          },
          {
            label: "Still out", value: m ? money(m.estimatesOpenValue) : null,
            sub: m ? `${m.estimatesOpenCount} quotes from the last ${m.outstandingDays} days` : undefined,
            needs: "Waiting on the board's first snapshot",
          },
        ]}
      />

      <section className="pt-panel" id="quiet">
        <h2 className="pt-panel__h">Gone quiet 7+ days {m && <span className="pt-tm__count">{m.quotesQuietCount ?? 0}</span>}</h2>
        <p className="pt-panel__sub">
          Still open, nothing sold, and no option added for a week or more. These are the ones to ring
          {m && (m.quotesQuietValue ?? 0) > 0 ? ` — ${money(m.quotesQuietValue)} between them` : ""}.
        </p>
        {!m || (m.quotesQuietCount ?? 0) === 0 ? (
          <p className="pt-rep__empty">{!m ? "The board hasn't made its first snapshot yet." : m.quotesQuiet === undefined ? "Counted from the board's next refresh." : "Nothing has gone quiet."}</p>
        ) : (
          <QuietQuotes rows={quiet} total={m.quotesQuietCount ?? quiet.length} />
        )}
      </section>

      <section className="pt-panel">
        <h2 className="pt-panel__h">Biggest still out</h2>
        {!m || m.quotesOutstanding.length === 0 ? (
          <p className="pt-rep__empty">Nothing open in the last {m?.outstandingDays ?? 30} days.</p>
        ) : (
          <QuoteTable rows={m.quotesOutstanding} ageLabel="Out for" />
        )}
      </section>

      {m && m.estimatesStaleCount > 0 && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Older than {m.outstandingDays} days and never closed off</h2>
          <p className="pt-panel__sub">
            {m.estimatesStaleCount} quotes worth {money(m.estimatesStaleValue)} are still marked open in ServiceTitan. They
            aren&rsquo;t counted as out — dismiss the dead ones there and this goes away.
          </p>
        </section>
      )}

      <p className="pt-panel__sub">The quote log and win rate by month are on <Link href="/portal/finance/quotes">Finance → Planning → Quotes</Link>.</p>
    </PortalShell>
  );
}
