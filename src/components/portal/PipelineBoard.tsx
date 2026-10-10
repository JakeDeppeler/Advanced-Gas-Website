"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markLost, reopen, saveFollowUp } from "@/app/portal/pipeline/actions";
import {
  FIRST_CALL_DAYS, GIVE_UP_AFTER, HOW_LABEL, LOST_REASONS, STAGES, addDays, daysBetween, nextGap,
  type PipeQuote, type Stage, type TouchHow,
} from "@/lib/pipeline/types";

const m0 = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const k0 = (n: number) => (n >= 10_000 ? `$${Math.round(n / 1000)}K` : m0(n));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const dayName = (iso: string, today: string) => {
  const d = daysBetween(today, iso);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
};
const ago = (iso: string, today: string) => {
  const d = daysBetween(iso, today);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};
/** A timestamp's day in Melbourne, which is the day the office made the call. */
const melDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
const first = (name: string | null) => (name ? name.trim().split(/\s+/)[0] : null);

/** The quick picks for the next call; the suggested one is pre-selected from how many tries it's had. */
const GAPS: Array<{ d: number; label: string }> = [
  { d: 1, label: "Tomorrow" }, { d: 3, label: "3 days" }, { d: 7, label: "1 week" }, { d: 14, label: "2 weeks" }, { d: 30, label: "1 month" },
];
const OUTCOMES: TouchHow[] = ["call", "no_answer", "text", "email"];

/**
 * The quote pipeline: every quote out, in the column that says what to do
 * with it, and who's on it.
 *
 * Deliberately little on each card — who, what it's worth, and the one fact
 * that decides what happens next (how long it's been, or when the next call
 * is). Everything else is a click away in the panel, where a call gets logged
 * and the next one booked in the same step.
 */
export function PipelineBoard({ quotes, stale, today, office, me, canCustomer }: {
  quotes: PipeQuote[]; stale: PipeQuote[]; today: string; office: string[]; me: string; canCustomer: boolean;
}) {
  const [who, setWho] = useState<string>("all");
  const [find, setFind] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const shown = useMemo(() => {
    const needle = find.trim().toLowerCase();
    return quotes.filter((q) => {
      if (who === "none" && q.owner) return false;
      if (who !== "all" && who !== "none" && q.owner !== who) return false;
      if (needle && ![q.customer, q.suburb, q.what, q.jobNumber, q.phone].some((x) => x?.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [quotes, who, find]);

  const col = (s: Stage) => shown.filter((q) => q.stage === s).sort(
    // Late calls first, longest late at the top; then everything due today, biggest first.
    s === "due" ? (a, b) => (a.nextOn ?? "9999").localeCompare(b.nextOn ?? "9999") || b.value - a.value
      : s === "waiting" ? (a, b) => (a.nextOn ?? "").localeCompare(b.nextOn ?? "")
        : s === "won" ? (a, b) => (b.soldOn ?? "").localeCompare(a.soldOn ?? "")
          : (a, b) => b.value - a.value,
  );
  const lost = col("lost");

  // On a phone the columns are a swipe, and the one to work is the second:
  // start there when it has anything in it.
  const cols = useRef<HTMLDivElement>(null);
  const dueN = quotes.filter((q) => q.stage === "due").length;
  useEffect(() => {
    const el = cols.current;
    const due = el?.querySelector<HTMLElement>(".is-due");
    if (el && due && dueN > 0 && el.scrollWidth > el.clientWidth) el.scrollLeft = due.offsetLeft;
  }, [dueN]);
  const sel = [...quotes, ...stale].find((q) => q.key === open) ?? null;
  const owners = [...new Set([...office, ...quotes.map((q) => q.owner).filter((o): o is string => !!o)])]
    .sort((a, b) => (a === me ? -1 : b === me ? 1 : a.localeCompare(b)));
  const clash = (o: string) => owners.filter((x) => first(x) === first(o)).length > 1;
  const pill = (o: string) => (o === me ? "Mine" : clash(o) ? o : (first(o) as string));

  return (
    <div className="pt-pipe">
      <div className="pt-pipe__bar">
        <div className="pt-seg" role="group" aria-label="Whose quotes">
          {[{ k: "all", label: "Everyone" }, ...owners.map((o) => ({ k: o, label: pill(o) })), { k: "none", label: "Nobody yet" }].map((o) => (
            <button key={o.k} type="button" className={`pt-seg__b${who === o.k ? " is-on" : ""}`} aria-pressed={who === o.k} onClick={() => setWho(o.k)}>{o.label}</button>
          ))}
        </div>
        <input id="pipe-find" className="pt-kit__find pt-pipe__find" type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a name, suburb or job" aria-label="Find a name, suburb or job" />
      </div>

      <div className="pt-pipe__cols" ref={cols}>
        {STAGES.map((s) => {
          const list = col(s.k);
          const sum = list.reduce((n, q) => n + q.value, 0);
          return (
            <section key={s.k} className={`pt-pipe__col is-${s.k}`} aria-labelledby={`pipe-${s.k}`}>
              <header className="pt-pipe__head">
                <h2 id={`pipe-${s.k}`}>{s.label} <span className="pt-pipe__n">{list.length}</span></h2>
                <span className="pt-pipe__sum">{list.length ? k0(sum) : s.blurb}</span>
              </header>
              <ul className="pt-pipe__list">
                {list.map((q) => <Card key={q.key} q={q} today={today} onOpen={() => setOpen(q.key)} />)}
                {!list.length && <li className="pt-pipe__empty">{s.k === "due" ? "Nobody to ring. Nice." : "Nothing here."}</li>}
              </ul>
            </section>
          );
        })}
      </div>

      {(lost.length > 0 || stale.length > 0) && (
        <div className="pt-pipe__more">
          {lost.length > 0 && (
            <details className="pt-pipe__fold">
              <summary>Lost in the last 30 days <span className="pt-pipe__n">{lost.length}</span> <em>{k0(lost.reduce((n, q) => n + q.value, 0))}</em></summary>
              <ul className="pt-pipe__rows">
                {lost.map((q) => (
                  <li key={q.key}>
                    <button type="button" className="pt-pipe__row" onClick={() => setOpen(q.key)}>
                      <strong>{q.customer ?? q.what ?? "Quote"}</strong>
                      <span>{q.lostReason ?? (q.dismissed ? "Dismissed in ServiceTitan" : "Lost")}</span>
                      <span className="pt-pipe__val">{m0(q.value)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {stale.length > 0 && (
            <details className="pt-pipe__fold">
              <summary>Over 60 days, still open in ServiceTitan <span className="pt-pipe__n">{stale.length}</span> <em>{k0(stale.reduce((n, q) => n + q.value, 0))}</em></summary>
              <p className="pt-pipe__note">Too old to chase. Mark each one lost here, and dismiss it in ServiceTitan, or it keeps counting as out.</p>
              <ul className="pt-pipe__rows">
                {stale.map((q) => (
                  <li key={q.key}>
                    <button type="button" className="pt-pipe__row" onClick={() => setOpen(q.key)}>
                      <strong>{q.customer ?? q.what ?? "Quote"}</strong>
                      <span>Quoted {ago(q.quotedOn, today)}</span>
                      <span className="pt-pipe__val">{m0(q.value)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {sel && <Panel key={sel.key} q={sel} today={today} owners={owners} me={me} canCustomer={canCustomer} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Card({ q, today, onOpen }: { q: PipeQuote; today: string; onOpen: () => void }) {
  const late = q.stage === "due" && q.nextOn && q.nextOn < today ? daysBetween(q.nextOn, today) : 0;
  let when: string;
  if (q.stage === "won") when = `Sold ${q.soldOn ? ago(q.soldOn, today) : ""}`;
  else if (q.stage === "waiting" && q.nextOn) when = `Ring ${dayName(q.nextOn, today)}`;
  else if (late) when = `${plural(late, "day")} late`;
  else when = `Quoted ${ago(q.quotedOn, today)}`;
  const tries = q.touches.filter((t) => t.how !== "note").length;
  return (
    <li>
      <button type="button" className={`pt-pipe__card${late ? " is-late" : ""}`} onClick={onOpen}>
        <span className="pt-pipe__top">
          <strong className="pt-pipe__who">{q.customer ?? q.what ?? "Quote"}</strong>
          <span className="pt-pipe__val">{m0(q.value)}</span>
        </span>
        <span className="pt-pipe__what">{[q.customer ? q.what : null, q.suburb].filter(Boolean).join(" · ") || `Job ${q.jobNumber ?? "—"}`}</span>
        <span className="pt-pipe__meta">
          <span className={late ? "pt-pipe__late" : undefined}>{late ? <b aria-hidden="true">! </b> : null}{when}</span>
          {q.stage !== "won" && tries > 0 && <span>{plural(tries, "try", "tries")}</span>}
          {q.stage !== "won" && q.owner && <span className="pt-pipe__owner">{first(q.owner)}</span>}
          {q.stage === "won" && q.quotedBy && <span>{first(q.quotedBy)}</span>}
        </span>
      </button>
    </li>
  );
}

function Panel({ q, today, owners, me, canCustomer, onClose }: {
  q: PipeQuote; today: string; owners: string[]; me: string; canCustomer: boolean; onClose: () => void;
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
  const [lostOpen, setLostOpen] = useState(false);
  const [reason, setReason] = useState<string>(tries >= GIVE_UP_AFTER ? "No reply after 5 tries" : LOST_REASONS[0]);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, close = true) => start(async () => {
    const r = await fn();
    if (!r.ok) { setMsg(r.error ?? "Couldn't save that."); return; }
    router.refresh();
    if (close) onClose();
  });
  const isOpen = q.stage !== "won" && q.stage !== "lost";
  const tel = q.phone?.replace(/[^\d+]/g, "");

  return (
    <div className="pt-pipe__scrim" onClick={onClose}>
      <div className="pt-pipe__panel" role="dialog" aria-modal="true" aria-labelledby="pipe-panel-h" tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="pt-pipe__ph">
          <div>
            <h2 id="pipe-panel-h">{q.customer ?? q.what ?? "Quote"}</h2>
            <p>{[q.customer ? q.what : null, q.suburb, q.jobNumber ? `Job ${q.jobNumber}` : null].filter(Boolean).join(" · ")}</p>
          </div>
          <button type="button" className="pt-pipe__x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <dl className="pt-pipe__facts">
          <div><dt>Worth</dt><dd>{m0(q.value)}{q.options > 1 && q.stage !== "won" ? <em> average of {q.options} options</em> : null}</dd></div>
          <div><dt>Quoted</dt><dd>{ago(q.quotedOn, today)}{q.quotedBy ? ` by ${q.quotedBy}` : ""}</dd></div>
          {q.stage === "won" && q.soldOn && <div><dt>Sold</dt><dd>{dayName(q.soldOn, today)}</dd></div>}
          {q.nextOn && isOpen && <div><dt>Next call</dt><dd>{dayName(q.nextOn, today)}{q.nextOn < today ? <em className="pt-pipe__late">{plural(daysBetween(q.nextOn, today), "day")} late</em> : null}</dd></div>}
        </dl>

        <div className="pt-pipe__links">
          {tel ? <a className="pt-btn pt-btn--navy pt-btn--sm" href={`tel:${tel}`}>Call {q.phone}</a> : <span className="pt-pipe__nophone">No phone number in ServiceTitan</span>}
          {q.jobId && <a className="pt-btn pt-btn--ghost pt-btn--sm" href={`https://go.servicetitan.com/#/Job/Index/${q.jobId}`} target="_blank" rel="noreferrer">Open in ServiceTitan</a>}
          {canCustomer && q.customerId && <a className="pt-btn pt-btn--ghost pt-btn--sm" href={`/portal/customers/${q.customerId}`}>Customer history</a>}
        </div>

        {isOpen && (
          <form className="pt-pipe__form" onSubmit={(e) => {
            e.preventDefault();
            // Saving only who's on it leaves a booked call where it was.
            const moveNext = !!how || picked || !q.nextOn;
            run(() => saveFollowUp({ key: q.key, how, note: note || null, nextOn: moveNext ? next : undefined, owner: owner || null }));
          }}>
            <fieldset>
              <legend>What happened?</legend>
              <div className="pt-pipe__opts">
                {OUTCOMES.map((h) => (
                  <button key={h} type="button" className={`pt-pipe__opt${how === h ? " is-on" : ""}`} aria-pressed={how === h} onClick={() => pickHow(h)}>{HOW_LABEL[h]}</button>
                ))}
              </div>
            </fieldset>
            <label className="pt-field"><span>Note <em>optional</em></span>
              <input id="pipe-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Waiting on the body corporate" maxLength={500} />
            </label>
            <fieldset>
              <legend>Ring again</legend>
              <div className="pt-pipe__opts">
                {GAPS.map((g) => {
                  const d = addDays(today, g.d);
                  return (
                    <button key={g.d} type="button" className={`pt-pipe__opt${next === d ? " is-on" : ""}`} aria-pressed={next === d} onClick={() => { setNext(d); setPicked(true); }}>
                      {g.label}{g.d === suggested ? <em> suggested</em> : null}
                    </button>
                  );
                })}
                <input id="pipe-next" className="pt-pipe__date" type="date" value={next} min={today} onChange={(e) => { setNext(e.target.value); setPicked(true); }} aria-label="Or pick a day" />
              </div>
            </fieldset>
            <label className="pt-field"><span>Who&rsquo;s chasing it</span>
              <select id="pipe-owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">Nobody yet</option>
                {owners.map((o) => <option key={o} value={o}>{o === me ? `${o} (me)` : o}</option>)}
              </select>
            </label>
            {tries >= GIVE_UP_AFTER - 1 && <p className="pt-pipe__note"><b aria-hidden="true">! </b>{plural(tries, "try", "tries")} so far. If this one doesn&rsquo;t answer, close it off as lost.</p>}
            {msg && <p className="pt-inline is-err" role="alert">{msg}</p>}
            <div className="pt-pipe__acts">
              <button type="submit" className="pt-btn pt-btn--navy" disabled={pending}>{pending ? "Saving…" : how ? "Save the call" : "Save"}</button>
              <button type="button" className="pt-btn pt-btn--ghost" onClick={() => setLostOpen((v) => !v)} aria-expanded={lostOpen}>Mark lost</button>
            </div>
            {lostOpen && (
              <div className="pt-pipe__lost">
                <label className="pt-field"><span>Why</span>
                  <select id="pipe-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
                    {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <button type="button" className="pt-btn pt-btn--sm pt-pipe__lostbtn" disabled={pending} onClick={() => run(() => markLost({ key: q.key, reason }))}>Mark it lost</button>
                <p className="pt-pipe__note">Dismiss it in ServiceTitan as well, so the board stops counting it.</p>
              </div>
            )}
          </form>
        )}

        {q.stage === "lost" && !q.dismissed && (
          <div className="pt-pipe__acts">
            <button type="button" className="pt-btn pt-btn--ghost" disabled={pending} onClick={() => run(() => reopen({ key: q.key }))}>Put it back in the pipeline</button>
          </div>
        )}

        <section className="pt-pipe__hist" aria-labelledby="pipe-hist-h">
          <h3 id="pipe-hist-h">History</h3>
          {q.touches.length ? (
            <ol>
              {q.touches.map((t, i) => (
                <li key={i}>
                  <span className="pt-pipe__hwhen">{ago(melDay(t.at), today)}</span>
                  <span><strong>{HOW_LABEL[t.how]}</strong>{t.note ? ` · ${t.note}` : ""}{t.by ? <em> · {first(t.by)}</em> : null}</span>
                </li>
              ))}
            </ol>
          ) : <p className="pt-pipe__note">Nobody has followed this one up yet.</p>}
        </section>
      </div>
    </div>
  );
}
