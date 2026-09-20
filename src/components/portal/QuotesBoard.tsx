"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addQuote, setStatus, removeQuote } from "@/app/portal/finance/quotes/actions";
import { money, pct } from "@/lib/portal/format";

export type QuoteView = { id: string; amount: number; status: "quoted" | "won" | "lost"; customer: string | null; when: string };

const parse = (v: string) => { const n = parseFloat(v.replace(/[^0-9.]/g, "")); return Number.isNaN(n) ? 0 : n; };
const STATUS_LABEL = { quoted: "Quoted", won: "Won", lost: "Lost" } as const;

/**
 * `revenueTarget` and `avgJob` come from the same Targets record the Targets
 * page writes. They used to be this component's own numbers, kept in
 * localStorage — so the business had two revenue targets and two average
 * jobs, on two tabs of one section, saved per browser. This tab said quote
 * $1.25M a year and Targets said $3.75M, because one was working from
 * $500,000 and the other from $1,500,000.
 */
export function QuotesBoard({ quotes, dbReady, revenueTarget, avgJob: avgJobSetting }: {
  quotes: QuoteView[];
  dbReady: boolean;
  revenueTarget: number;
  avgJob: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // aggregates
  const agg = useMemo(() => {
    let quoted$ = 0, won$ = 0, lost$ = 0, wonN = 0, lostN = 0;
    for (const q of quotes) {
      if (q.status === "won") { won$ += q.amount; wonN++; }
      else if (q.status === "lost") { lost$ += q.amount; lostN++; }
      else quoted$ += q.amount;
    }
    const decided$ = won$ + lost$;
    const winRateDollar = decided$ > 0 ? won$ / decided$ : 0;
    const winRateCount = wonN + lostN > 0 ? wonN / (wonN + lostN) : 0;
    return { quoted$, won$, lost$, wonN, lostN, winRateDollar, winRateCount, totalQuoted$: quoted$ + won$ + lost$ };
  }, [quotes]);

  // Target calculator. Starts from the business's real figures; editing
  // either is a what-if for this visit and is deliberately not saved, because
  // saving it here is what let the two screens drift apart.
  const [target, setTarget] = useState(revenueTarget);
  const [avgJob, setAvgJob] = useState(avgJobSetting);
  const [winRate, setWinRate] = useState(Math.round(agg.winRateDollar * 100) || 40);
  const touched = target !== revenueTarget || avgJob !== avgJobSetting;

  const wr = winRate / 100;
  const quoteToIssue = wr > 0 ? target / wr : 0;
  const numQuotes = avgJob > 0 ? Math.ceil(quoteToIssue / avgJob) : 0;

  // add form
  const [amount, setAmount] = useState("");
  const [customer, setCustomer] = useState("");
  const [status, setSt] = useState<"quoted" | "won" | "lost">("quoted");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState("");

  function submit() {
    setMsg("");
    start(async () => {
      const res = await addQuote({ amount: parse(amount), status, customer, quotedOn: date });
      if (res.ok) { setAmount(""); setCustomer(""); setSt("quoted"); router.refresh(); }
      else setMsg(res.error || "Couldn't add.");
    });
  }

  return (
    <div className="pt-qt">
      {!dbReady && <div className="pt-note pt-note--warn"><strong>Database not connected.</strong> Quotes need the Supabase keys set on the server.</div>}

      {/* target calculator */}
      <section className="pt-panel">
        <h2 className="pt-panel__h">What do we need to quote?</h2>
        <p className="pt-panel__sub">
          At your win rate, how much work you need to quote to hit a revenue target. The target and the
          average job start from <strong>Targets</strong>; the win rate starts from your actual, below.
          {touched ? " Changed here, it is a what-if — it doesn't save." : ""}
        </p>
        <div className="pt-qt__calc">
          <label className="pt-cap__f"><span>Revenue target (year)</span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input inputMode="numeric" value={target ? target.toLocaleString("en-AU") : ""} onChange={(e) => setTarget(parse(e.target.value))} /></span></label>
          <label className="pt-cap__f"><span>Win rate</span><span className="pt-calc__field"><input type="number" min="0" max="100" value={winRate} onChange={(e) => setWinRate(parse(e.target.value))} /><span className="pt-calc__post">%</span></span></label>
          <label className="pt-cap__f"><span>Average job</span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input inputMode="numeric" value={avgJob ? avgJob.toLocaleString("en-AU") : ""} onChange={(e) => setAvgJob(parse(e.target.value))} /></span></label>
        </div>
        <div className="pt-qt__need">
          <div className="pt-qt__needbig">{money(quoteToIssue)}<span> of quotes / yr</span></div>
          <div className="pt-qt__needsub">≈ <strong>{numQuotes.toLocaleString("en-AU")}</strong> jobs quoted · about <strong>{money(quoteToIssue / 52)}</strong> a week to stay on track</div>
        </div>
      </section>

      {/* actual win rate */}
      <section className="pt-panel">
        <h2 className="pt-panel__h">How we&rsquo;re winning</h2>
        <div className="pt-fin__cards">
          <div className="pt-fin__card"><div className="pt-fin__cardlabel">Quoted (all)</div><div className="pt-fin__profit">{money(agg.totalQuoted$)}</div><div className="pt-fin__cardsub">{quotes.length} quotes</div></div>
          <div className="pt-fin__card"><div className="pt-fin__cardlabel">Won</div><div className="pt-fin__profit">{money(agg.won$)}</div><div className="pt-fin__cardsub">{agg.wonN} jobs</div></div>
          <div className="pt-fin__card"><div className="pt-fin__cardlabel">Win rate ($)</div><div className="pt-fin__profit">{pct(agg.winRateDollar)}</div><div className="pt-fin__cardsub">{pct(agg.winRateCount)} by count · {money(agg.quoted$)} still open</div></div>
        </div>
      </section>

      {/* tracker */}
      <section className="pt-panel">
        <h2 className="pt-panel__h">Quotes <span className="pt-tm__count">{quotes.length}</span></h2>
        <div className="pt-qt__add">
          <span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} /></span>
          <input className="pt-cap__addemail" placeholder="Customer / job" value={customer} onChange={(e) => setCustomer(e.target.value)} />
          <input className="pt-cap__addemail pt-qt__date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select className="pt-cap__type" value={status} onChange={(e) => setSt(e.target.value as "quoted" | "won" | "lost")}>
            <option value="quoted">Quoted</option><option value="won">Won</option><option value="lost">Lost</option>
          </select>
          <button type="button" className="pt-btn pt-btn--orange pt-btn--sm" disabled={pending || parse(amount) <= 0} onClick={submit}>Add</button>
        </div>
        {msg && <div className="pt-inline is-err" style={{ marginTop: 8 }}>{msg}</div>}

        <div className="pt-qt__list">
          {quotes.length === 0 ? (
            <div className="pf-empty">No quotes logged yet.</div>
          ) : quotes.map((q) => (
            <div key={q.id} className="pt-qt__row">
              <span className="pt-qt__amt">{money(q.amount)}</span>
              <span className="pt-qt__cust">{q.customer || "—"}<em>{q.when}</em></span>
              <span className="pt-qt__pills">
                {(["quoted", "won", "lost"] as const).map((st) => (
                  <button key={st} type="button" className={`pt-qt__pill pt-qt__pill--${st}${q.status === st ? " is-on" : ""}`} disabled={pending} onClick={() => start(async () => { await setStatus({ id: q.id, status: st }); router.refresh(); })}>{STATUS_LABEL[st]}</button>
                ))}
              </span>
              <button type="button" className="pf-del" disabled={pending} onClick={() => start(async () => { await removeQuote({ id: q.id }); router.refresh(); })}>Delete</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
