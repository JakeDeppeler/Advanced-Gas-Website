"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addQuote, setStatus, removeQuote } from "@/app/portal/finance/quotes/actions";

export type QuoteView = { id: string; amount: number; status: "quoted" | "won" | "lost"; customer: string | null; when: string };

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const parse = (v: string) => { const n = parseFloat(v.replace(/[^0-9.]/g, "")); return Number.isNaN(n) ? 0 : n; };
const pct = (n: number) => `${Math.round(n * 100)}%`;
const STATUS_LABEL = { quoted: "Quoted", won: "Won", lost: "Lost" } as const;

export function QuotesBoard({ quotes, dbReady }: { quotes: QuoteView[]; dbReady: boolean }) {
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

  // target calculator
  const [target, setTarget] = useState(500000);
  const [avgJob, setAvgJob] = useState(3500);
  const [winRate, setWinRate] = useState(Math.round(agg.winRateDollar * 100) || 40);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const t = localStorage.getItem("ag_quote_target"); if (t) setTarget(Number(t) || 0);
      const a = localStorage.getItem("ag_quote_avgjob"); if (a) setAvgJob(Number(a) || 0);
    } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem("ag_quote_target", String(target)); localStorage.setItem("ag_quote_avgjob", String(avgJob)); } catch { /* ignore */ } }, [target, avgJob, ready]);

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
        <p className="pt-panel__sub">At your win rate, how much work you need to quote to hit a revenue target. Win rate defaults to your actual (below) — override it to plan.</p>
        <div className="pt-qt__calc">
          <label className="pt-cap__f"><span>Revenue target (year)</span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" value={ready ? target : ""} onChange={(e) => setTarget(parse(e.target.value))} /></span></label>
          <label className="pt-cap__f"><span>Win rate</span><span className="pt-calc__field"><input type="number" min="0" max="100" value={winRate} onChange={(e) => setWinRate(parse(e.target.value))} /><span className="pt-calc__post">%</span></span></label>
          <label className="pt-cap__f"><span>Average job</span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" value={ready ? avgJob : ""} onChange={(e) => setAvgJob(parse(e.target.value))} /></span></label>
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
