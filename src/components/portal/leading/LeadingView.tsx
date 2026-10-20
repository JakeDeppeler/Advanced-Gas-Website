"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  logDecision, publishLeading, removeDecision, removeSeat, reviewDecision, saveLeadingText, saveSeat, type LeadResult,
} from "@/app/portal/leading/actions";
import { BANDS, type Band, type Decision, type Leading, type Seat } from "@/lib/portal/leading/types";

type RoleOpt = { id: string; name: string };

const aud = (n: number) => `$${n.toLocaleString("en-AU")}`;
const when = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Melbourne" });
const first = (n: string) => n.trim().split(/\s+/)[0];
/** How each band's points are marked: the shape says which band, not only the colour. */
const MARK: Record<Band, string> = { decide: "yes", tell: "dot", ask: "ask" };
const BAND_SHORT: Record<Band, string> = { decide: "Decided", tell: "Decided, then logged", ask: "Asked first" };

/**
 * Leading: the seats and their three bands, how to bring a call, the ladder a
 * call climbs, and the log. The owner edits every part and reviews the log;
 * everyone else reads, and logs their own calls.
 */
export function LeadingView({ lead, inSeat, roles, canEdit, log, mySeat, me }: {
  lead: Leading; inSeat: Record<string, string[]>; roles: RoleOpt[]; canEdit: boolean; log: Decision[]; mySeat: string | null; me: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [words, setWords] = useState(false);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); }, [msg]);
  const run = (fn: () => Promise<LeadResult>, ok: string, after?: () => void) =>
    start(async () => { const r = await fn(); setMsg(r.ok ? ok : r.error ?? "Couldn't do that."); if (r.ok) { after?.(); router.refresh(); } });

  if (!lead.published && !canEdit) {
    return (
      <section className="pk-card pk-pad lead-draft-only">
        <h2 className="rv-h2">Being written</h2>
        <p className="qp-note">Which calls each leader makes without an owner, and how that grows. It shows here once Jake publishes it.</p>
      </section>
    );
  }

  // Your own seat first, so a leader opens the page on the calls that are theirs.
  const seats = [...lead.seats].sort((a, b) => Number(b.name === mySeat) - Number(a.name === mySeat));

  return (
    <div className="lead">
      {canEdit && (
        <div className={`lead-pub${lead.published ? " on" : ""}`}>
          <p>
            {lead.published
              ? <><b>Published.</b> Everyone signed in can read this, and log their calls.</>
              : <><b>Draft: only you can see this.</b> These are the business&rsquo;s rules once they&rsquo;re up, so read every band and set each seat&rsquo;s limit first.</>}
          </p>
          <button type="button" className={`qp-btn ${lead.published ? "line" : "dark"}`} disabled={pending}
            onClick={() => run(() => publishLeading(!lead.published), lead.published ? "Back to a draft." : "Published to the team.")}>
            {lead.published ? "Take it back to a draft" : "Publish to the team"}
          </button>
        </div>
      )}

      {words && canEdit ? (
        <WordsForm lead={lead} pending={pending} onCancel={() => setWords(false)}
          onSave={(v) => run(() => saveLeadingText(v), "Saved.", () => setWords(false))} />
      ) : (
        <section className="pk-card pk-pad lead-intro">
          <p>{lead.intro}</p>
          {canEdit && <button type="button" className="qp-btn line" onClick={() => setWords(true)}>Change the words</button>}
        </section>
      )}

      <h2 className="lead-h">Who decides what</h2>
      <div className="lead-key" aria-label="The three bands">
        {BANDS.map((b) => <span key={b.k} className={`lead-keyi k-${b.k}`}><i aria-hidden="true">{b.k === "decide" ? "✓" : b.k === "tell" ? "●" : "→"}</i><span><b>{b.label}.</b> {b.line}</span></span>)}
      </div>
      <div className="lead-seats">
        {seats.map((s) => editing === s.name ? (
          <SeatForm key={s.name} s={s} roles={roles} pending={pending} onCancel={() => setEditing(null)}
            onSave={(v) => run(() => saveSeat(v, s.name), "Saved.", () => setEditing(null))}
            onRemove={() => { if (confirm(`Take ${s.name} off this page?`)) run(() => removeSeat(s.name), "Taken off.", () => setEditing(null)); }} />
        ) : (
          <section key={s.name} className={`pk-card pk-pad lead-seat${s.name === mySeat ? " mine" : ""}`}>
            <header className="lead-seath">
              <div>
                <h3>{s.name}{s.name === mySeat && <em> · your seat</em>}</h3>
                <p className="lead-who">{(inSeat[s.roleId] ?? []).length ? (inSeat[s.roleId] ?? []).join(", ") : "Nobody in this seat yet"}</p>
              </div>
              <div className="lead-limit">
                <span>Can commit alone</span>
                <b>{s.spend != null ? `up to ${aud(s.spend)}` : "Not set yet"}</b>
                {s.spend == null && <em>so any spend is asked first</em>}
              </div>
            </header>
            <div className="lead-bands">
              {BANDS.map((b) => (
                <div key={b.k} className={`lead-band k-${b.k}`}>
                  <h4>{b.label}</h4>
                  {s[b.k].length ? <ul className={`rv-points ${MARK[b.k]}`}>{s[b.k].map((x) => <li key={x}>{x}</li>)}</ul> : <p className="qp-note">Nothing here yet.</p>}
                </div>
              ))}
            </div>
            {canEdit && <button type="button" className="qp-btn line lead-change" onClick={() => setEditing(s.name)}>Change {s.name}</button>}
          </section>
        ))}
        {canEdit && (editing === "+" ? (
          <SeatForm s={{ roleId: "", name: "", decide: [], tell: [], ask: [], spend: null }} roles={roles} pending={pending}
            onCancel={() => setEditing(null)} onSave={(v) => run(() => saveSeat(v), "Added.", () => setEditing(null))} />
        ) : (
          <button type="button" className="qp-drop lead-add" onClick={() => setEditing("+")}>
            <span className="qp-dropi x" aria-hidden="true">+</span>
            <b>Add a seat</b>
            <span>another role that makes calls</span>
          </button>
        ))}
      </div>

      <div className="lead-two">
        <section className="pk-card pk-pad">
          <h2 className="rv-h2">Bringing us a call</h2>
          <p className="qp-note lead-sub">When it&rsquo;s above your band, bring a recommendation, not a question. Four lines is plenty.</p>
          <ol className="rv-points num">{lead.method.map((x) => <li key={x}>{x}</li>)}</ol>
        </section>
        <section className="pk-card pk-pad">
          <h2 className="rv-h2">How a call becomes yours</h2>
          <ol className="lead-ladder">
            {lead.ladder.map((r, i) => (
              <li key={r.name}><span className="lead-rung" aria-hidden="true">{i + 1}</span><div><b>{r.name}</b><p>{r.means}</p></div></li>
            ))}
          </ol>
          <p className="lead-up">{lead.moveUp}</p>
        </section>
      </div>

      <section className="pk-card pk-pad lead-log">
        <div className="lead-logh">
          <div>
            <h2 className="rv-h2">Calls made</h2>
            <p className="qp-note lead-sub">
              {canEdit
                ? "Everyone's calls, newest first. Go over the ones waiting at the weekly review: a good call says so, and one to talk about says why."
                : "Log a call you made, and the owner goes over it at the weekly review. Only you and the owner see yours."}
            </p>
          </div>
        </div>
        <LogForm pending={pending} onSave={(v, reset) => run(() => logDecision(v), "Logged. It's in for the weekly review.", reset)} />
        {log.length ? (
          <ul className="lead-calls">
            {log.slice(0, 120).map((d) => <Call key={d.id} d={d} canEdit={canEdit} mine={d.byEmail === me} pending={pending}
              onReview={(good, note) => run(() => reviewDecision(d.id, good, note), good ? "Marked a good call." : "Marked to talk about.")}
              onRemove={() => { if (confirm("Take this call out of the log?")) run(() => removeDecision(d.id), "Taken out."); }} />)}
          </ul>
        ) : <p className="qp-note">Nothing logged yet.</p>}
      </section>
      {msg && <p className="qp-toast" role="status">{msg}</p>}
    </div>
  );
}

function Call({ d, canEdit, mine, pending, onReview, onRemove }: {
  d: Decision; canEdit: boolean; mine: boolean; pending: boolean; onReview: (good: boolean, note: string) => void; onRemove: () => void;
}) {
  const [note, setNote] = useState("");
  const state = d.review ? (d.review.good ? "good" : "talk") : "wait";
  return (
    <li className={`lead-call s-${state}`}>
      <div className="lead-callh">
        <span className="lead-callwho"><b>{d.by}</b>{d.seat && <> · {d.seat}</>} · {when(d.at)}</span>
        <span className={`lead-state s-${state}`}>{d.review ? (d.review.good ? "✓ Good call" : "↺ Let’s talk") : "Waiting on review"}</span>
      </div>
      <p className="lead-what">{d.what}</p>
      {d.why && <p className="lead-why">{d.why}</p>}
      <p className="lead-meta">{BAND_SHORT[d.band]}{d.cost != null && <> · {aud(d.cost)}</>}</p>
      {d.review?.note && <p className="lead-note"><b>{first(d.review.by)}:</b> {d.review.note}</p>}
      {canEdit && !d.review && (
        <div className="lead-rev">
          <input id={`rev-${d.id}`} aria-label="What you'd say about this call" placeholder="What you'd say about it (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={800} />
          <button type="button" className="qp-btn dark" disabled={pending} onClick={() => onReview(true, note)}>Good call</button>
          <button type="button" className="qp-btn line" disabled={pending} onClick={() => onReview(false, note)}>Let&rsquo;s talk</button>
        </div>
      )}
      {((mine && !d.review) || canEdit) && <button type="button" className="td-del lead-del" disabled={pending} onClick={onRemove}>Take it out</button>}
    </li>
  );
}

function LogForm({ pending, onSave }: { pending: boolean; onSave: (v: { what: string; why: string; cost: string; band: Band }, reset: () => void) => void }) {
  const [what, setWhat] = useState("");
  const [why, setWhy] = useState("");
  const [cost, setCost] = useState("");
  const [band, setBand] = useState<Band>("tell");
  const reset = () => { setWhat(""); setWhy(""); setCost(""); setBand("tell"); };
  return (
    <form className="qp-form lead-form" onSubmit={(e) => { e.preventDefault(); onSave({ what, why, cost, band }, reset); }}>
      <label className="qp-field"><span>What did you decide?</span>
        <input id="lead-what" value={what} onChange={(e) => setWhat(e.target.value)} maxLength={400} required placeholder="Re-booked the Berwick install to Thursday: the unit hadn't landed" />
      </label>
      <label className="qp-field"><span>Why, and what else you looked at</span>
        <textarea id="lead-why" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} maxLength={1200} />
      </label>
      <div className="lead-formrow">
        <label className="qp-field"><span>What it cost <em>if anything</em></span>
          <input id="lead-cost" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="$" />
        </label>
        <fieldset className="lead-bandpick">
          <legend>It was</legend>
          {(["decide", "tell", "ask"] as Band[]).map((b) => (
            <label key={b} className={band === b ? "on" : undefined}>
              <input type="radio" name="lead-band" value={b} checked={band === b} onChange={() => setBand(b)} /> {BAND_SHORT[b]}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="qp-acts"><button type="submit" className="qp-btn dark" disabled={pending || !what.trim()}>Log the call</button></div>
    </form>
  );
}

function SeatForm({ s, roles, pending, onSave, onCancel, onRemove }: {
  s: Seat; roles: RoleOpt[]; pending: boolean; onSave: (v: Seat) => void; onCancel: () => void; onRemove?: () => void;
}) {
  const [name, setName] = useState(s.name);
  const [roleId, setRoleId] = useState(s.roleId);
  const [spend, setSpend] = useState(s.spend != null ? String(s.spend) : "");
  const [bands, setBands] = useState<Record<Band, string>>({ decide: s.decide.join("\n"), tell: s.tell.join("\n"), ask: s.ask.join("\n") });
  const split = (x: string) => x.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <section className="pk-card pk-pad lead-seat">
      <form className="qp-form" onSubmit={(e) => { e.preventDefault(); onSave({ name, roleId, spend: spend.trim() === "" ? null : Number(spend.replace(/[$,\s]/g, "")), decide: split(bands.decide), tell: split(bands.tell), ask: split(bands.ask) }); }}>
        <div className="rl-two">
          <label className="qp-field"><span>Seat</span><input id="seat-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required /></label>
          <label className="qp-field"><span>The role on Roles</span>
            <select id="seat-role" value={roleId} onChange={(e) => { setRoleId(e.target.value); if (!name.trim()) setName(roles.find((r) => r.id === e.target.value)?.name ?? ""); }}>
              <option value="">None</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
        </div>
        <label className="qp-field"><span>Can commit alone, per call <em>dollars; blank means ask first for any spend</em></span>
          <input id="seat-spend" inputMode="decimal" value={spend} onChange={(e) => setSpend(e.target.value)} placeholder="Not set" />
        </label>
        {BANDS.map((b) => (
          <label key={b.k} className="qp-field"><span>{b.label} <em>one a line</em></span>
            <textarea id={`seat-${b.k}`} rows={5} value={bands[b.k]} onChange={(e) => setBands((x) => ({ ...x, [b.k]: e.target.value }))} />
          </label>
        ))}
        <div className="qp-acts">
          <button type="submit" className="qp-btn dark" disabled={pending || !name.trim()}>Save</button>
          <button type="button" className="qp-btn" onClick={onCancel}>Cancel</button>
          {onRemove && <button type="button" className="td-del" onClick={onRemove}>Take this seat off</button>}
        </div>
      </form>
    </section>
  );
}

function WordsForm({ lead, pending, onSave, onCancel }: {
  lead: Leading; pending: boolean; onCancel: () => void;
  onSave: (v: { intro: string; method: string[]; moveUp: string; ladder: Array<{ name: string; means: string }> }) => void;
}) {
  const [intro, setIntro] = useState(lead.intro);
  const [method, setMethod] = useState(lead.method.join("\n"));
  const [ladder, setLadder] = useState(lead.ladder.map((r) => `${r.name}: ${r.means}`).join("\n"));
  const [moveUp, setMoveUp] = useState(lead.moveUp);
  return (
    <section className="pk-card pk-pad">
      <form className="qp-form" onSubmit={(e) => {
        e.preventDefault();
        onSave({
          intro, moveUp, method: method.split("\n").map((x) => x.trim()).filter(Boolean),
          ladder: ladder.split("\n").map((x) => x.trim()).filter(Boolean).map((x) => { const i = x.indexOf(":"); return i > 0 ? { name: x.slice(0, i).trim(), means: x.slice(i + 1).trim() } : { name: x, means: "" }; }),
        });
      }}>
        <label className="qp-field"><span>The opening</span><textarea id="lead-intro" rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} /></label>
        <label className="qp-field"><span>Bringing us a call <em>one step a line</em></span><textarea id="lead-method" rows={4} value={method} onChange={(e) => setMethod(e.target.value)} /></label>
        <label className="qp-field"><span>The ladder <em>one rung a line, bottom first: &ldquo;Name: what it means&rdquo;</em></span><textarea id="lead-ladder" rows={4} value={ladder} onChange={(e) => setLadder(e.target.value)} /></label>
        <label className="qp-field"><span>How a call moves up</span><textarea id="lead-moveup" rows={3} value={moveUp} onChange={(e) => setMoveUp(e.target.value)} /></label>
        <div className="qp-acts">
          <button type="submit" className="qp-btn dark" disabled={pending}>Save</button>
          <button type="button" className="qp-btn" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
