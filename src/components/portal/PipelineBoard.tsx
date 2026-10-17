"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markLost, reopen, saveFollowUp } from "@/app/portal/pipeline/actions";
import {
  FIRST_CALL_DAYS, FOLLOW_UPS, GIVE_UP_AFTER, HOW_LABEL, LOST_REASONS, STAGES, addDays, daysBetween, nextGap, ruleNext,
  type PipeQuote, type Stage, type TouchHow,
} from "@/lib/pipeline/types";

const m0 = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const k1 = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 10_000 ? `$${(n / 1000).toFixed(1)}K` : m0(n));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const dayName = (iso: string, today: string) => {
  const d = daysBetween(today, iso);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
};
const shortDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
const ago = (iso: string, today: string) => {
  const d = daysBetween(iso, today);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};
/** A timestamp's day in Melbourne, which is the day the office made the call. */
const melDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
const first = (name: string | null) => (name ? name.trim().split(/\s+/)[0] : null);

/** The quick picks for the next call; the suggested one is pre-selected from how many tries it's had. */
const GAPS: Array<{ d: number; label: string }> = [
  { d: 1, label: "Tomorrow" }, { d: 2, label: "2 days" }, { d: 4, label: "4 days" }, { d: 7, label: "1 week" }, { d: 14, label: "2 weeks" },
];
const OUTCOMES: TouchHow[] = ["call", "no_answer", "text", "email"];

/** The stage bar in the panel says where a quote is in the run from quoted to sold. */
const FOLD = { lost: "Lost in the last 30 days", stale: "Over 60 days, still open in ServiceTitan", booked: "Sold and booked", billed: "Completed, to be paid" } as const;

/** Where a sold job is up to, in a few words: "Booked Tue 21 Oct", "Done 14 Oct, not invoiced yet". */
function afterWords(q: PipeQuote, today: string): string {
  const w = q.work;
  if (!w) return "Not booked yet";
  if (q.stage === "booked") return w.bookedFor ? `Booked ${dayName(isoMel(w.bookedFor), today)}` : w.status === "Hold" ? "On hold" : "Booked, no visit set";
  if (w.owing == null) return w.completedOn ? `Done ${shortDay(w.completedOn)}, not invoiced yet` : "Done, not invoiced yet";
  return w.completedOn ? `Done ${shortDay(w.completedOn)}, ${m0(w.owing)} owing` : `${m0(w.owing)} owing`;
}
/** A timestamp's day in Melbourne: a 9am visit is stored the evening before in UTC. */
const isoMel = (ts: string) => new Date(ts).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });

const SHORT: Record<Stage, string> = { new: "Just quoted", due: "Follow up", waiting: "Waiting on them", won: "Sold, to be booked", booked: "Booked", billed: "Completed, to be paid", lost: "Lost" };

/** A person's chip colour: muted, fixed by their name, and never one of the status colours. */
const TONES = ["#c9b29b", "#9fb7aa", "#b7a9c8", "#d6b48c", "#a9b9c9", "#c7a7a1"];
const tone = (name: string) => TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
function Av({ name, title }: { name: string; title?: string }) {
  return <span className="qp-av" style={{ background: tone(name) }} title={title ?? name}>{name.slice(0, 1).toUpperCase()}</span>;
}

/**
 * The quote pipeline, laid out as Rapport's deal board: a column for each
 * step from quoted to sold, each quote a card the colour of its column, the
 * lost and the too-old to the side, and a panel for working one.
 *
 * The columns are ours, not a sales team's: a quote is just out, due a call,
 * waiting on the customer with the next call booked, or sold. Each card says
 * the one fact that decides what happens next — when it was quoted, when to
 * ring, or how late the call is — in words, so the colour is never the only
 * signal. Everything else is a click away in the panel, where a call gets
 * logged and the next one booked in the same step.
 */
export function PipelineBoard({ quotes, stale, today, office, me, canCustomer }: {
  quotes: PipeQuote[]; stale: PipeQuote[]; today: string; office: string[]; me: string; canCustomer: boolean;
}) {
  const [who, setWho] = useState<string>("all");
  const [find, setFind] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "list">("board");
  const [fold, setFold] = useState<"lost" | "stale" | "booked" | "billed" | null>(null);
  const foldRef = useRef<HTMLElement>(null);
  const router = useRouter();
  // A quote dragged to a new column shows there at once; the server's copy
  // replaces it when the page refreshes, and a failed save puts it back.
  const [moved, setMoved] = useState<Record<string, { stage: Stage; nextOn: string | null }>>({});
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | "lost" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [lostFor, setLostFor] = useState<string | null>(null);
  useEffect(() => setMoved({}), [quotes]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);
  const live = useMemo(() => quotes.map((q) => (moved[q.key] ? { ...q, ...moved[q.key] } : q)), [quotes, moved]);

  const shown = useMemo(() => {
    const needle = find.trim().toLowerCase();
    return live.filter((q) => {
      if (who === "none" && q.owner) return false;
      if (who !== "all" && who !== "none" && q.owner !== who) return false;
      if (needle && ![q.customer, q.suburb, q.what, q.jobNumber, q.phone].some((x) => x?.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [live, who, find]);

  // Each column can be put in date order, newest or oldest first, by its own button.
  const [sortBy, setSortBy] = useState<Partial<Record<Stage, "new" | "old">>>({});
  const dateOf = (q: PipeQuote) => (q.stage === "won" ? q.soldOn ?? q.quotedOn : q.quotedOn);
  const col = (s: Stage) => {
    const list = usual(s);
    const by = sortBy[s];
    return by ? [...list].sort((a, b) => (by === "new" ? dateOf(b).localeCompare(dateOf(a)) : dateOf(a).localeCompare(dateOf(b)))) : list;
  };
  const SORT_NEXT = { usual: "new", new: "old", old: "usual" } as const;
  const SORT_WORD = { usual: "Usual order", new: "Newest first", old: "Oldest first" } as const;
  // The day a call fell due, booked by hand or by the follow-up rule: the longest late first.
  const dueOn = (q: PipeQuote) => q.nextOn ?? ruleNext(q.pricedOn ?? q.quotedOn, q.touches) ?? "9999";
  const usual = (s: Stage) => shown.filter((q) => q.stage === s).sort(
    // Late calls first, longest late at the top; then everything due today, biggest first.
    s === "due" ? (a, b) => dueOn(a).localeCompare(dueOn(b)) || b.value - a.value
      : s === "waiting" ? (a, b) => (a.nextOn ?? "").localeCompare(b.nextOn ?? "")
        : s === "won" ? (a, b) => (b.soldOn ?? "").localeCompare(a.soldOn ?? "")
          : (a, b) => b.value - a.value,
  );
  const lost = col("lost");
  // After the sale: the next visit first, and the oldest money owing first.
  const booked = shown.filter((q) => q.stage === "booked").sort((a, b) => (a.work?.bookedFor ?? "9999").localeCompare(b.work?.bookedFor ?? "9999"));
  const billed = shown.filter((q) => q.stage === "billed").sort((a, b) => (a.work?.completedOn ?? "").localeCompare(b.work?.completedOn ?? ""));

  // On a phone the columns are a swipe, and the one to work is the second:
  // start there when it has anything in it.
  const cols = useRef<HTMLDivElement>(null);
  const dueN = quotes.filter((q) => q.stage === "due").length;
  useEffect(() => {
    const el = cols.current;
    const due = el?.querySelector<HTMLElement>(".qp-col.s-due");
    if (el && due && dueN > 0 && el.scrollWidth > el.clientWidth + 40) el.scrollLeft = due.offsetLeft - 16;
  }, [dueN]);
  useEffect(() => { if (fold) foldRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [fold]);

  const sel = [...live, ...stale].find((q) => q.key === open) ?? null;

  /*
   * Dragging a card is booking its next call, the one thing the columns
   * stand for: Follow up rings today, Waiting on them books the call the
   * board would suggest, and Lost opens the quote to say why. Just quoted
   * and Sold aren't drop targets: one is time since the quote, the other
   * comes from ServiceTitan when the customer says yes.
   */
  const dragged = drag ? live.find((q) => q.key === drag) ?? null : null;
  const canDrop = (t: Stage | "lost") => !!dragged && dragged.stage !== t && (t === "lost" || t === "due" || t === "waiting");
  const dropOn = (t: Stage | "lost") => {
    const q = dragged;
    setDrag(null);
    setOver(null);
    if (!q || !canDrop(t)) return;
    if (t === "lost") { setLostFor(q.key); setOpen(q.key); return; }
    const tries = q.touches.filter((x) => x.how !== "note").length;
    const nextOn = t === "due" ? today : addDays(today, nextGap(tries + 1));
    const who = q.customer ?? q.what ?? "The quote";
    setMoved((m) => ({ ...m, [q.key]: { stage: t, nextOn } }));
    saveFollowUp({ key: q.key, nextOn }).then((r) => {
      if (!r.ok) {
        setMoved((m) => { const n = { ...m }; delete n[q.key]; return n; });
        setToast(r.error ?? "Couldn't move that. Try again.");
        return;
      }
      setToast(t === "due" ? `${who} moved to Follow up, to ring today.` : `${who} moved to Waiting on them. Next call ${dayName(nextOn, today)}.`);
      router.refresh();
    });
  };
  const dropProps = (t: Stage | "lost") => ({
    onDragOver: (e: React.DragEvent) => { if (canDrop(t)) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (over !== t) setOver(t); } },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === t ? null : o)); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); dropOn(t); },
  });
  const dropCls = (t: Stage | "lost") => (drag ? (canDrop(t) ? " can" : " cant") : "") + (over === t ? " over" : "");

  // The board as it's filtered, for a spreadsheet.
  const download = () => {
    const cell = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Customer", "What", "Suburb", "Where it is", "Quoted", "Next call", "Who's chasing", "Worth"],
      ...STAGES.flatMap((st) => col(st.k)).map((q) => [q.customer, q.what, q.suburb, SHORT[q.stage], q.quotedOn, q.nextOn, q.owner, Math.round(q.value)])];
    const blob = new Blob([rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `quote-pipeline-${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const owners = [...new Set([...office, ...quotes.map((q) => q.owner).filter((o): o is string => !!o)])]
    .sort((a, b) => (a === me ? -1 : b === me ? 1 : a.localeCompare(b)));
  const clash = (o: string) => owners.filter((x) => first(x) === first(o)).length > 1;
  const pill = (o: string) => (o === me ? "Mine" : clash(o) ? o : (first(o) as string));
  const lostSum = lost.reduce((n, q) => n + q.value, 0);
  const staleSum = stale.reduce((n, q) => n + q.value, 0);
  const listed = view === "list" ? [...STAGES.flatMap((s) => col(s.k)), ...booked, ...billed] : [];
  const bookedSum = booked.reduce((n, q) => n + q.value, 0);
  const owingSum = billed.reduce((n, q) => n + (q.work?.owing ?? q.value), 0);

  return (
    <div className="qp">
      <div className="qp-bar">
        <label className="qp-find">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input id="pipe-find" type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a name, suburb or job" aria-label="Find a name, suburb or job" />
        </label>
        <div className="qp-people" role="group" aria-label="Whose quotes">
          {[{ k: "all", label: "Everyone" }, ...owners.map((o) => ({ k: o, label: pill(o) })), { k: "none", label: "Nobody yet" }].map((o) => (
            <button key={o.k} type="button" className={`qp-chip${who === o.k ? " on" : ""}`} aria-pressed={who === o.k} onClick={() => setWho(o.k)}>
              {o.k !== "all" && o.k !== "none" && <Av name={o.k} />}
              {o.label}
            </button>
          ))}
        </div>
        <div className="qp-view" role="group" aria-label="Show as">
          <button type="button" className={view === "board" ? "on" : undefined} aria-pressed={view === "board"} onClick={() => setView("board")}>Board</button>
          <button type="button" className={view === "list" ? "on" : undefined} aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
        </div>
        <button type="button" className="qp-dl" onClick={download} aria-label="Download the board as a spreadsheet" title="Download as a spreadsheet">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
        </button>
      </div>

      {view === "board" ? (
        <div className="qp-board" ref={cols}>
          {STAGES.map((s, ci) => {
            const list = col(s.k);
            const sum = list.reduce((n, q) => n + q.value, 0);
            return (
              <section key={s.k} className={`qp-col s-${s.k}${dropCls(s.k)}`} aria-labelledby={`pipe-${s.k}`} style={{ ["--i" as string]: ci }} {...dropProps(s.k)}>
                <header className="qp-colh">
                  <i className="qp-dot" aria-hidden="true" />
                  <h2 id={`pipe-${s.k}`} title={s.blurb}>{SHORT[s.k]}</h2>
                  <span className="qp-n">{list.length}</span>
                  <span className="qp-sum">{list.length ? k1(sum) : ""}</span>
                </header>
                <button
                  type="button" className={`qp-sort${sortBy[s.k] ? " on" : ""}`}
                  onClick={() => setSortBy((m) => { const next = SORT_NEXT[m[s.k] ?? "usual"]; return { ...m, [s.k]: next === "usual" ? undefined : next }; })}
                  aria-label={`${s.label}: ${SORT_WORD[sortBy[s.k] ?? "usual"]}. Change the order`}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" /></svg>
                  {SORT_WORD[sortBy[s.k] ?? "usual"]}
                </button>
                <ul className="qp-list">
                  {list.map((q, i) => <Card key={q.key} q={q} today={today} i={i} onOpen={() => setOpen(q.key)} dragging={drag === q.key} onDrag={(on) => { setDrag(on ? q.key : null); if (!on) setOver(null); }} />)}
                  {!list.length && <li className="qp-empty">{s.k === "due" ? "Nobody to ring. Nice." : s.k === "won" ? "Every sale has a job booked." : "Nothing here."}</li>}
                </ul>
              </section>
            );
          })}
          <div className="qp-rail">
            <button type="button" className={`qp-drop qp-after s-booked${fold === "booked" ? " on" : ""}`} onClick={() => setFold(fold === "booked" ? null : "booked")} aria-expanded={fold === "booked"}>
              <span className="qp-dropi" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>
              </span>
              <b>Booked</b>
              <span>{booked.length ? <>{plural(booked.length, "job")} in the diary<br />{k1(bookedSum)}</> : "Nothing booked"}</span>
            </button>
            <button type="button" className={`qp-drop qp-after s-billed${fold === "billed" ? " on" : ""}`} onClick={() => setFold(fold === "billed" ? null : "billed")} aria-expanded={fold === "billed"}>
              <span className="qp-dropi" aria-hidden="true">$</span>
              <b>Completed, to be paid</b>
              <span>{billed.length ? <>{plural(billed.length, "job")} done<br />{k1(owingSum)} to come in</> : "Nothing owing"}</span>
            </button>
            <button type="button" className={`qp-drop${fold === "lost" ? " on" : ""}${dropCls("lost")}`} onClick={() => setFold(fold === "lost" ? null : "lost")} aria-expanded={fold === "lost"} {...dropProps("lost")}>
              <span className="qp-dropi x" aria-hidden="true">×</span>
              <b>Lost</b>
              <span>{lost.length ? <>{plural(lost.length, "quote")} in 30 days<br />{k1(lostSum)}</> : "None in 30 days"}</span>
            </button>
            <button type="button" className={`qp-drop${fold === "stale" ? " on" : ""}`} onClick={() => setFold(fold === "stale" ? null : "stale")} aria-expanded={fold === "stale"} disabled={!stale.length}>
              <span className="qp-dropi" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              </span>
              <b>Too old</b>
              <span>{stale.length ? <>{plural(stale.length, "quote")} over 60 days<br />{k1(staleSum)}</> : "None over 60 days"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="qp-table">
          <table>
            <thead>
              <tr><th>Customer</th><th>What</th><th>Where it is</th><th>Quoted</th><th>Next call</th><th>Who</th><th className="r">Worth</th></tr>
            </thead>
            <tbody>
              {listed.map((q) => {
                const late = q.stage === "due" && q.nextOn && q.nextOn < today ? daysBetween(q.nextOn, today) : 0;
                return (
                  <tr key={q.key} onClick={() => setOpen(q.key)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setOpen(q.key); }}>
                    <td><b>{q.customer ?? ""}</b><span>{q.suburb ?? ""}</span></td>
                    <td>{q.what ?? (q.jobNumber ? `Job ${q.jobNumber}` : "")}</td>
                    <td><span className={`qp-tag s-${q.stage}`}><i aria-hidden="true" />{SHORT[q.stage]}</span></td>
                    <td>{ago(q.quotedOn, today)}</td>
                    <td className={late ? "late" : undefined}>{q.stage === "won" ? "" : late ? `${plural(late, "day")} late` : q.nextOn ? dayName(q.nextOn, today) : "not booked"}</td>
                    <td>{q.owner ? first(q.owner) : ""}</td>
                    <td className="r"><b>{m0(q.value)}</b></td>
                  </tr>
                );
              })}
              {!listed.length && <tr><td colSpan={7} className="qp-empty">Nothing matches.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {fold && (
        <section className="qp-fold" ref={foldRef} aria-label={FOLD[fold]}>
          <header className="qp-foldh">
            <b>{FOLD[fold]}</b>
            <button type="button" className="qp-x" onClick={() => setFold(null)} aria-label="Close">×</button>
          </header>
          {fold === "stale" && <p className="qp-note">Too old to chase. Mark each one lost here, and it&rsquo;s dismissed in ServiceTitan too, or it keeps counting as out.</p>}
          {fold === "booked" && <p className="qp-note">Sold and booked in ServiceTitan. They move to Completed by themselves once the job is done.</p>}
          {fold === "billed" && <p className="qp-note">The job&rsquo;s done and the money isn&rsquo;t all in. Paid in full, they leave the board.</p>}
          <ul className="qp-rows">
            {(fold === "lost" ? lost : fold === "booked" ? booked : fold === "billed" ? billed : stale).map((q) => (
              <li key={q.key}>
                <button type="button" onClick={() => setOpen(q.key)}>
                  <b>{q.customer ?? q.what ?? "Quote"}{q.suburb ? <small> · {q.suburb}</small> : null}</b>
                  <span>{fold === "lost" ? (q.lostReason ?? (q.dismissed ? "Dismissed in ServiceTitan" : "Lost"))
                    : fold === "booked" || fold === "billed" ? afterWords(q, today)
                      : `Quoted ${ago(q.quotedOn, today)}`}</span>
                  <em>{fold === "billed" && q.work?.owing ? `${m0(q.work.owing)} owing` : m0(q.value)}</em>
                </button>
              </li>
            ))}
            {fold === "lost" && !lost.length && <li className="qp-empty">Nothing lost in the last 30 days.</li>}
            {fold === "booked" && !booked.length && <li className="qp-empty">Nothing booked in.</li>}
            {fold === "billed" && !billed.length && <li className="qp-empty">Nothing waiting on money.</li>}
          </ul>
        </section>
      )}

      {sel && <Panel key={sel.key} q={sel} today={today} owners={owners} me={me} name={pill} canCustomer={canCustomer} startLost={lostFor === sel.key} onClose={() => { setOpen(null); setLostFor(null); }} />}
      {toast && <p className="qp-toast" role="status">{toast}</p>}
    </div>
  );
}

const ORD = ["1st call", "2nd call", "3rd call"];

/** How long the quote has been out: "Quoted 9 Oct · out 9 days". */
function outFor(q: PipeQuote, today: string): string {
  const d = daysBetween(q.quotedOn, today);
  return `Quoted ${shortDay(q.quotedOn)} · ${d <= 0 ? "today" : `out ${d === 1 ? "1 day" : `${d} days`}`}`;
}

/** The one fact on a card that decides what happens next, as Rapport's "Closes Dec 6". */
function when(q: PipeQuote, today: string): { text: string; late: number } {
  const late = q.stage === "due" && q.nextOn && q.nextOn < today ? daysBetween(q.nextOn, today) : 0;
  if (q.stage === "won") {
    // Sold a week and still not in the diary is the one that slips through.
    const d = q.soldOn ? daysBetween(q.soldOn, today) : 0;
    return { text: q.soldOn ? `Sold ${shortDay(q.soldOn)}${d >= 7 ? `, ${d} days unbooked` : ""}` : "Sold", late: d >= 7 ? d : 0 };
  }
  if (q.stage === "booked" || q.stage === "billed") return { text: afterWords(q, today), late };
  if (q.stage === "lost") return { text: q.lostReason ?? "Lost", late };
  if (q.stage === "waiting" && q.nextOn) return { text: `Ring ${dayName(q.nextOn, today)}`, late };
  if (q.stage === "waiting") {
    const next = ruleNext(q.pricedOn ?? q.quotedOn, q.touches);
    return { text: next ? `Ring ${dayName(next, today)}` : `All ${FOLLOW_UPS} follow-ups done`, late };
  }
  if (late) return { text: `Call was due ${shortDay(q.nextOn as string)}`, late };
  if (q.stage === "due") {
    // Late against the rule (no call booked by hand): say by how much.
    const next = ruleNext(q.pricedOn ?? q.quotedOn, q.touches);
    const behind = next && next < today ? daysBetween(next, today) : 0;
    return { text: behind ? `Call ${behind === 1 ? "a day" : `${behind} days`} late` : "Call today", late: behind };
  }
  return { text: `Quoted ${ago(q.quotedOn, today)}`, late };
}

function Card({ q, today, i, onOpen, dragging, onDrag }: { q: PipeQuote; today: string; i: number; onOpen: () => void; dragging: boolean; onDrag: (on: boolean) => void }) {
  const w = when(q, today);
  const tries = q.touches.filter((t) => t.how !== "note").length;
  const people = [...new Set([q.owner, q.quotedBy].filter((x): x is string => !!x))];
  // Who and where: a quote is usually several options, so what was quoted doesn't name it.
  const sub = [q.suburb, q.jobNumber ? `#${q.jobNumber}` : null].filter(Boolean).join(" · ");
  return (
    <li style={{ ["--i" as string]: Math.min(i, 8) }}>
      <button
        type="button" className={`qp-card s-${q.stage}${w.late ? " late" : ""}${dragging ? " dragging" : ""}`} onClick={onOpen}
        draggable={q.stage === "new" || q.stage === "due" || q.stage === "waiting"}
        onDragStart={(e) => { e.dataTransfer.setData("text/plain", q.key); e.dataTransfer.effectAllowed = "move"; onDrag(true); }}
        onDragEnd={() => onDrag(false)}
        title={[q.options > 1 ? `${q.options} options` : null, tries ? plural(tries, "try", "tries") : null, q.stage !== "won" ? "drag to move it" : null].filter(Boolean).join(" · ")}
      >
        <span className="qp-ct">
          <span>{w.late ? <b aria-hidden="true">! </b> : null}{w.text}{(q.stage === "due" || q.stage === "waiting") ? ` · ${tries < FOLLOW_UPS ? `${ORD[tries]} of ${FOLLOW_UPS}` : "all calls done"}` : ""}</span>
          <span className="qp-dots" aria-hidden="true">•••</span>
        </span>
        <span className="qp-title">{q.customer ?? q.what ?? "Quote"}</span>
        <span className="qp-sub">{sub}</span>
        <span className="qp-sub qp-quoted">{outFor(q, today)}</span>
        <span className="qp-cf">
          <span className="qp-val">{m0(q.value)}</span>
          <span className="qp-avs">{people.map((p) => <Av key={p} name={p} title={p === q.owner ? `${p} is chasing it` : `Quoted by ${p}`} />)}</span>
        </span>
      </button>
    </li>
  );
}

function Panel({ q, today, owners, me, name, canCustomer, startLost, onClose }: {
  q: PipeQuote; today: string; owners: string[]; me: string; name: (o: string) => string; canCustomer: boolean; startLost?: boolean; onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const tries = q.touches.filter((t) => t.how !== "note").length;
  const suggested = nextGap(tries + 1);
  const [how, setHow] = useState<TouchHow | null>(null);
  const [note, setNote] = useState("");
  // Left alone, the next call stays where it was booked — or, for a quote
  // nobody has rung, on its first-call day. Logging what happened moves it to
  // the suggested gap, unless a day has already been picked by hand.
  const firstCall = addDays(q.quotedOn, FIRST_CALL_DAYS);
  const booked = q.nextOn && q.nextOn >= today ? q.nextOn : null;
  const [next, setNext] = useState<string>(booked ?? (tries === 0 ? (firstCall > today ? firstCall : today) : addDays(today, suggested)));
  const [picked, setPicked] = useState(false);
  const pickHow = (h: TouchHow) => {
    const on = how === h ? null : h;
    setHow(on);
    if (on && !picked) setNext(addDays(today, suggested));
  };
  const [owner, setOwner] = useState<string>(q.owner ?? "");
  const [lostOpen, setLostOpen] = useState(!!startLost);
  const [reason, setReason] = useState<string>(tries >= GIVE_UP_AFTER ? "No response" : LOST_REASONS[0]);
  const [lostNote, setLostNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  // What happened in ServiceTitan after a Mark lost: shown outside the form,
  // which goes once the quote is no longer open.
  const [said, setSaid] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Dropped on Lost: straight to why.
  useEffect(() => { if (startLost) document.getElementById("pipe-reason")?.scrollIntoView({ block: "center" }); }, [startLost]);
  useEffect(() => {
    ref.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; said?: string }>, close = true) => start(async () => {
    const r = await fn();
    if (!r.ok) { setMsg(r.error ?? "Couldn't save that."); return; }
    router.refresh();
    // What happened in ServiceTitan is worth reading before the panel goes.
    if (r.said) { setSaid(r.said); return; }
    if (close) onClose();
  });
  const isOpen = q.stage === "new" || q.stage === "due" || q.stage === "waiting";
  const tel = q.phone?.replace(/[^\d+]/g, "");
  const w = when(q, today);
  const at = q.stage === "booked" || q.stage === "billed" ? STAGES.length - 1 : STAGES.findIndex((s) => s.k === q.stage);
  const people = [...new Set([q.owner, q.quotedBy].filter((x): x is string => !!x))];

  return (
    <div className="qp-scrim" onClick={onClose}>
      <div className="qp-panel" role="dialog" aria-modal="true" aria-labelledby="pipe-panel-h" tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="qp-ph">
          <span>Quote{q.jobNumber ? ` · Job ${q.jobNumber}` : ""}</span>
          <button type="button" className="qp-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className={`qp-card qp-big s-${q.stage}${w.late ? " late" : ""}`}>
          <span className="qp-ct">
            <span>{w.late ? <b aria-hidden="true">! </b> : null}{w.text}</span>
            <span className="qp-stage">{SHORT[q.stage]}</span>
          </span>
          <span className="qp-title" id="pipe-panel-h">{q.customer ?? q.what ?? "Quote"}</span>
          <span className="qp-sub">{[q.suburb, q.jobNumber ? `#${q.jobNumber}` : null].filter(Boolean).join(" · ")}</span>
          <span className="qp-cf">
            <span className="qp-val">{m0(q.value)}<small>{q.options > 1 && q.stage !== "won" ? `average of ${q.options} options` : ""}</small></span>
            <span className="qp-avs">{people.map((p) => <Av key={p} name={p} />)}</span>
          </span>
        </div>

        {q.stage !== "lost" ? (
          <ol className="qp-steps" aria-label="Where it is">
            {STAGES.map((s, i) => (
              <li key={s.k} className={`${i <= at ? `done k-${s.k}` : ""}${i === at ? " now" : ""}`} aria-current={i === at ? "step" : undefined}>
                <i aria-hidden="true" />{SHORT[s.k]}
              </li>
            ))}
          </ol>
        ) : <p className="qp-lostline">Lost{q.lostReason ? ` · ${q.lostReason}` : ""}{q.dismissed ? " · dismissed in ServiceTitan" : ""}</p>}

        <dl className="qp-facts">
          <div><dt>Worth</dt><dd>{m0(q.value)}</dd></div>
          <div><dt>Quoted</dt><dd>{dayName(q.quotedOn, today)} · {ago(q.quotedOn, today)}{q.quotedBy ? ` by ${first(q.quotedBy)}` : ""}</dd></div>
          {isOpen && <div><dt>Follow-ups</dt><dd>{Math.min(tries, FOLLOW_UPS)} of {FOLLOW_UPS} done{tries < FOLLOW_UPS ? ` · next ${dayName(q.nextOn ?? ruleNext(q.pricedOn ?? q.quotedOn, q.touches) ?? today, today)}` : ""}</dd></div>}
          {q.soldOn && <div><dt>Sold</dt><dd>{dayName(q.soldOn, today)}</dd></div>}
          {q.work && <div><dt>The job</dt><dd>{q.work.jobNumber ? `#${q.work.jobNumber}` : "In ServiceTitan"} · {afterWords(q, today)}</dd></div>}
          {q.work && q.work.invoiced > 0 && <div><dt>Invoiced</dt><dd>{m0(q.work.invoiced)}{q.work.owing ? `, ${m0(q.work.owing)} owing` : ", paid"}</dd></div>}
          {q.stage === "won" && <div><dt>Booked</dt><dd className="late">Not yet</dd></div>}
          {q.nextOn && isOpen && <div><dt>Next call</dt><dd className={q.nextOn < today ? "late" : undefined}>{dayName(q.nextOn, today)}{q.nextOn < today ? ` · ${plural(daysBetween(q.nextOn, today), "day")} late` : ""}</dd></div>}
        </dl>

        <div className="qp-contact">
          <Av name={q.customer ?? "?"} />
          <span>
            <b>{q.customer ?? "No customer name"}</b>
            <span>{tel ? q.phone : "No phone number in ServiceTitan"}{q.suburb ? ` · ${q.suburb}` : ""}</span>
          </span>
          {canCustomer && q.customerId ? <a href={`/portal/customers/${q.customerId}`} aria-label="Customer history" title="Customer history">↗</a> : null}
        </div>
        <div className="qp-links">
          {tel && <a className="qp-btn dark" href={`tel:${tel}`}>Call {q.phone}</a>}
          {(q.work?.jobId ?? q.jobId) && <a className="qp-btn" href={`https://go.servicetitan.com/#/Job/Index/${q.work?.jobId ?? q.jobId}`} target="_blank" rel="noreferrer">{q.work ? "Open the job in ServiceTitan" : "Open in ServiceTitan"}</a>}
        </div>

        {isOpen && (
          <form className="qp-form" onSubmit={(e) => {
            e.preventDefault();
            // Saving only who's on it leaves a booked call where it was.
            const moveNext = !!how || picked || !q.nextOn;
            // The third follow-up is the last: unless a day's been picked, it waits on them.
            const last = !!how && how !== "note" && tries + 1 >= FOLLOW_UPS && !picked;
            run(() => saveFollowUp({ key: q.key, how, note: note || null, nextOn: moveNext ? (last ? null : next) : undefined, owner: owner || null }));
          }}>
            <fieldset>
              <legend>What happened?</legend>
              <div className="qp-opts">
                {OUTCOMES.map((h) => (
                  <button key={h} type="button" className={how === h ? "on" : undefined} aria-pressed={how === h} onClick={() => pickHow(h)}>{HOW_LABEL[h]}</button>
                ))}
              </div>
            </fieldset>
            <label className="qp-field"><span>Note <em>optional</em></span>
              <textarea id="pipe-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Waiting on the body corporate" maxLength={500} rows={2} />
            </label>
            <fieldset>
              <legend>Ring again</legend>
              <div className="qp-opts">
                {GAPS.map((g) => {
                  const d = addDays(today, g.d);
                  return (
                    <button key={g.d} type="button" className={next === d ? "on" : undefined} aria-pressed={next === d} onClick={() => { setNext(d); setPicked(true); }}>
                      {g.label}{g.d === suggested ? <em> suggested</em> : null}
                    </button>
                  );
                })}
                <input id="pipe-next" className="qp-date" type="date" value={next} min={today} onChange={(e) => { setNext(e.target.value); setPicked(true); }} aria-label="Or pick a day" />
              </div>
            </fieldset>
            <fieldset>
              <legend>Who&rsquo;s chasing it</legend>
              <div className="qp-opts">
                <button type="button" className={owner === "" ? "on" : undefined} aria-pressed={owner === ""} onClick={() => setOwner("")}>Nobody yet</button>
                {owners.map((o) => (
                  <button key={o} type="button" className={owner === o ? "on" : undefined} aria-pressed={owner === o} onClick={() => setOwner(o)}>
                    <Av name={o} />{o === me ? `${first(o)} (me)` : name(o)}
                  </button>
                ))}
              </div>
            </fieldset>
            {tries >= GIVE_UP_AFTER - 1 && <p className="qp-note"><b aria-hidden="true">! </b>{plural(tries, "try", "tries")} so far. If this one doesn&rsquo;t answer, close it off as lost.</p>}
            {msg && !said && <p className="pt-inline is-err" role="alert">{msg}</p>}
            <div className="qp-acts">
              <button type="submit" className="qp-btn dark" disabled={pending}>✓ {pending ? "Saving…" : how ? "Save the call" : "Save"}</button>
              <button type="button" className="qp-btn line" onClick={() => setLostOpen((v) => !v)} aria-expanded={lostOpen}>× Mark lost</button>
            </div>
            {lostOpen && (
              <div className="qp-lost">
                <label className="qp-field"><span>Why</span>
                  <select id="pipe-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
                    {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label className="qp-field"><span>Anything to add</span>
                  <input id="pipe-lostnote" value={lostNote} onChange={(e) => setLostNote(e.target.value)} placeholder="e.g. went with a cheaper quote, $800 less" maxLength={300} />
                </label>
                <button type="button" className="qp-btn bad" disabled={pending} onClick={() => run(() => markLost({ key: q.key, reason, note: lostNote || null }))}>Mark it lost</button>
                <p className="qp-note">This dismisses the quote in ServiceTitan too, so it leaves the Follow Up list there, and notes the reason on the job.</p>
              </div>
            )}
          </form>
        )}

        {said && <p className="pt-note" role="status" style={{ margin: "0 0 12px" }}>{said}</p>}

        {q.stage === "lost" && !q.dismissed && (
          <div className="qp-acts">
            <button type="button" className="qp-btn" disabled={pending} onClick={() => run(() => reopen({ key: q.key }))}>Put it back in the pipeline</button>
          </div>
        )}

        <section className="qp-hist" aria-labelledby="pipe-hist-h">
          <h3 id="pipe-hist-h">History</h3>
          {q.touches.length ? (
            <ol>
              {q.touches.map((t, i) => (
                <li key={i}>
                  <span className="qp-hwhen">{ago(melDay(t.at), today)}</span>
                  <span><b>{HOW_LABEL[t.how]}</b>{t.note ? ` · ${t.note}` : ""}{t.by ? <em> · {first(t.by)}</em> : null}</span>
                </li>
              ))}
            </ol>
          ) : <p className="qp-note">Nobody has followed this one up yet.</p>}
        </section>
      </div>
    </div>
  );
}
