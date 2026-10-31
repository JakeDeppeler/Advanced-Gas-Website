"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNote, removeNote, removeTopic, saveRecord, saveTopic, setSchedule, type ToolboxResult } from "@/app/portal/toolbox/actions";
import { EVERY_WORDS, WEEKDAYS, talkName, type Every, type Schedule, type Session, type Topic } from "@/lib/toolbox/types";

const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "");
const daysTo = (iso: string, today: string) => Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
const when = (iso: string, today: string) => { const n = daysTo(iso, today); return n === 0 ? "Today" : n === 1 ? "Tomorrow" : n > 1 ? `In ${n} days` : n === -1 ? "Yesterday" : `${-n} days ago`; };
const first = (n: string) => n.split(" ")[0];
const empty = (on: string): Session => ({ on, notes: [], record: null, who: [], recordedBy: null, recordedAt: null });

/**
 * A transcript file as text. The caption formats an AI note-taker exports
 * (.vtt, .srt) carry a cue number and a timestamp line before every line said;
 * those go, so what's left reads as the conversation.
 */
function cleanTranscript(name: string, text: string): string {
  if (!/\.(vtt|srt)$/i.test(name)) return text.trim();
  return text.split(/\r?\n/)
    .filter((l) => !/^WEBVTT/.test(l) && !/^\d+$/.test(l.trim()) && !/-->/.test(l) && !/^NOTE\b/.test(l))
    .join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

type Props = {
  schedule: Schedule; today: string; current: string; next: string; earlier: string[];
  sessions: Session[]; topics: Topic[]; people: string[]; me: string; canPlan: boolean;
};

/**
 * Toolbox talks on a schedule: every week, fortnight or month on a weekday.
 * The next talk is up top with its notes (each a heading and what to say)
 * and, once it's been given, what was said: typed, or the transcript from an
 * AI note-taker. A note can go on this talk or the one after. Earlier talks
 * are a list underneath, each opening to its notes and record, and the topic
 * ideas are at the foot, each a press from becoming a note.
 */
export function ToolboxPlan({ schedule, today, current, next, earlier, sessions, topics, people, me, canPlan }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [draft, setDraft] = useState<{ head: string; text: string; on: string }>({ head: "", text: "", on: current });
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); }, [msg]);
  const run = (fn: () => Promise<ToolboxResult>, ok: string, then?: () => void) =>
    start(async () => { const r = await fn(); setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.error ?? "Couldn't do that." }); if (r.ok) { then?.(); router.refresh(); } });
  const byDay = new Map(sessions.map((s) => [s.on, s]));
  const of = (on: string) => byDay.get(on) ?? empty(on);
  const name = (on: string) => talkName(schedule, on);

  return (
    <div className="tb2">
      <section className="pk-card tb2-plan" aria-label="How often">
        <span className="tb2-l">How often</span>
        {canPlan ? (
          <>
            <span className="tb2-seg" role="group" aria-label="How often">
              {(["week", "fortnight", "month"] as Every[]).map((e) => (
                <button key={e} type="button" className={schedule.every === e ? "on" : undefined} aria-pressed={schedule.every === e} disabled={pending}
                  onClick={() => run(() => setSchedule({ every: e, day: schedule.day, today }), `${EVERY_WORDS[e]} now.`)}>{EVERY_WORDS[e]}</button>
              ))}
            </span>
            <label className="tb2-day">
              <span>{schedule.every === "month" ? "on the first" : "on"}</span>
              <select id="tb2-day" value={schedule.day} disabled={pending} onChange={(e) => run(() => setSchedule({ every: schedule.every, day: Number(e.target.value), today }), "Day changed.")}>
                {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{WEEKDAYS[d]}</option>)}
              </select>
            </label>
          </>
        ) : <b>{EVERY_WORDS[schedule.every]} {schedule.every === "month" ? "on the first" : "on"} {WEEKDAYS[schedule.day]}</b>}
      </section>

      <div className="tb2-two">
        <div className="tb2-col">
          <Talk s={of(current)} name={name(current)} today={today} big people={people} me={me} pending={pending} run={run} />
          <Talk s={of(next)} name={name(next)} today={today} people={people} me={me} pending={pending} run={run} />
        </div>

        <div className="tb2-col">
          <section className="pk-card tb2-add" aria-label="Add a note">
            <h2>Add a note</h2>
            <p className="tb2-sub">What you want to talk about, under a heading.</p>
            <form onSubmit={(e) => { e.preventDefault(); run(() => addNote(draft), `Added to ${name(draft.on)}.`, () => setDraft({ head: "", text: "", on: draft.on })); }}>
              <span className="tb2-for" role="group" aria-label="Which talk">
                {[{ on: current, l: "This one" }, { on: next, l: "The one after" }].map((x) => (
                  <button key={x.on} type="button" className={draft.on === x.on ? "on" : undefined} aria-pressed={draft.on === x.on} onClick={() => setDraft({ ...draft, on: x.on })}>
                    <b>{x.l}</b><span>{name(x.on)}</span>
                  </button>
                ))}
              </span>
              <label className="qp-field"><span>Heading</span><input id="tb2-head" value={draft.head} onChange={(e) => setDraft({ ...draft, head: e.target.value })} maxLength={120} placeholder="e.g. Ladders on two-storey jobs" /></label>
              <label className="qp-field"><span>The note</span><textarea id="tb2-text" rows={5} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} maxLength={4000} placeholder="What happened, what to remind the crew of, what to ask them." /></label>
              <button type="submit" className="qp-btn dark" disabled={pending || !draft.head.trim()}>Add to {draft.on === current ? "this talk" : "the one after"}</button>
            </form>
          </section>

          <Topics topics={topics} pending={pending} run={run} onUse={(t) => setDraft({ ...draft, head: t.title, text: t.points.join("\n") })} />
        </div>
      </div>

      <section className="pk-card tb2-past" aria-label="Earlier talks">
        <h2>Earlier talks</h2>
        {earlier.map((on) => {
          const s = of(on);
          return (
            <details key={on} className="tb2-row">
              <summary>
                <span className={`tb2-dot${s.record ? " done" : ""}`} aria-hidden="true">{s.record ? "✓" : ""}</span>
                <span className="tb2-rt"><b>{name(on)}</b><span>{/\d/.test(name(on)) ? "" : `${day(on)} · `}{s.notes.length ? `${s.notes.length} ${s.notes.length === 1 ? "note" : "notes"}: ${s.notes.map((n) => n.head).join(", ")}` : "no notes"}</span></span>
                <span className={`tb2-pill${s.record ? " done" : ""}`}>{s.record ? `Recorded${s.who.length ? `, ${s.who.length} there` : ""}` : "Not recorded"}</span>
                <span className="tb2-cv" aria-hidden="true">⌄</span>
              </summary>
              <div className="tb2-body">
                <Notes s={s} pending={pending} run={run} />
                <RecordBox s={s} people={people} me={me} pending={pending} run={run} />
              </div>
            </details>
          );
        })}
      </section>
      {msg && <p className={`qp-toast${msg.ok ? "" : " bad"}`} role="status">{msg.text}</p>}
    </div>
  );
}

type Run = (fn: () => Promise<ToolboxResult>, ok: string, then?: () => void) => void;

function Talk({ s, name, today, big, people, me, pending, run }: { s: Session; name: string; today: string; big?: boolean; people: string[]; me: string; pending: boolean; run: Run }) {
  const n = daysTo(s.on, today);
  return (
    <section className={`pk-card tb2-talk${big ? " big" : ""}`} aria-label={name}>
      <div className="tb2-th">
        <span><span className="tb2-l">{big ? "Next talk" : "The one after"}</span><b>{name}</b>{!/\d/.test(name) && <span className="tb2-sub">{day(s.on)}</span>}</span>
        <span className={`tb2-pill${n <= 1 ? " soon" : ""}${s.record ? " done" : ""}`}>{s.record ? "Recorded" : when(s.on, today)}</span>
      </div>
      <Notes s={s} pending={pending} run={run} />
      {big && <RecordBox s={s} people={people} me={me} pending={pending} run={run} />}
    </section>
  );
}

function Notes({ s, pending, run }: { s: Session; pending: boolean; run: Run }) {
  if (!s.notes.length) return <p className="tb2-none">No notes yet. Add one on the right.</p>;
  return (
    <ul className="tb2-notes">
      {s.notes.map((n) => (
        <li key={n.id}>
          <span className="tb2-nt"><b>{n.head}</b>{n.text && <span>{n.text}</span>}<em>{n.by ? `${n.by} · ` : ""}{day(n.at.slice(0, 10))}</em></span>
          <button type="button" className="tb2-x" disabled={pending} aria-label={`Take "${n.head}" off`} title="Take this note off"
            onClick={() => { if (confirm(`Take "${n.head}" off this talk?`)) run(() => removeNote({ on: s.on, id: n.id }), "Note taken off."); }}>×</button>
        </li>
      ))}
    </ul>
  );
}

/**
 * What was said: typed, pasted, or loaded from the note-taker's file, and who
 * was there. Shown as saved, with a way back into it.
 */
function RecordBox({ s, people, me, pending, run }: { s: Session; people: string[]; me: string; pending: boolean; run: Run }) {
  const [editing, setEditing] = useState(!s.record);
  const [text, setText] = useState(s.record ?? "");
  const [who, setWho] = useState<string[]>(s.who.length ? s.who : [me]);
  const [all, setAll] = useState(false);
  useEffect(() => { setText(s.record ?? ""); setWho(s.who.length ? s.who : [me]); setEditing(!s.record); }, [s.record, s.who, me]);
  const toggle = (p: string) => setWho((w) => (w.includes(p) ? w.filter((x) => x !== p) : [...w, p]));
  if (!editing && s.record) {
    const lines = s.record.split("\n");
    return (
      <div className="tb2-rec">
        <div className="tb2-rh"><b>What was said</b><span>{s.recordedBy ? `saved by ${first(s.recordedBy)}` : ""}{s.who.length ? ` · ${s.who.length} there: ${s.who.map(first).join(", ")}` : ""}</span></div>
        <p className="tb2-said">{all ? s.record : lines.slice(0, 8).join("\n")}</p>
        <span className="tb2-acts">
          {lines.length > 8 && <button type="button" className="qp-btn line" onClick={() => setAll(!all)}>{all ? "Show less" : `Show all ${lines.length} lines`}</button>}
          <button type="button" className="qp-btn line" onClick={() => setEditing(true)}>Change it</button>
        </span>
      </div>
    );
  }
  return (
    <form className="tb2-rec" onSubmit={(e) => { e.preventDefault(); run(() => saveRecord({ on: s.on, record: text, who }), text.trim() ? "Saved what was said." : "Record taken off."); }}>
      <div className="tb2-rh"><b>What was said</b><span>type it, paste it, or load the transcript from your AI note-taker</span></div>
      <textarea id={`tb2-rec-${s.on}`} rows={7} value={text} onChange={(e) => setText(e.target.value)} maxLength={100_000}
        placeholder="Notes from the talk, or the transcript from Otter, Fireflies, ChatGPT or similar." aria-label="What was said" />
      <fieldset className="tb2-who"><legend>Who was there</legend>
        <div className="qp-opts">
          {people.map((p) => <button key={p} type="button" className={who.includes(p) ? "on" : undefined} aria-pressed={who.includes(p)} onClick={() => toggle(p)}><span className="qp-av" aria-hidden="true">{p.slice(0, 1)}</span>{p}</button>)}
        </div>
      </fieldset>
      <span className="tb2-acts">
        <button type="submit" className="qp-btn dark" disabled={pending}>Save</button>
        <label className="qp-btn line tb2-file">
          Load a transcript file
          <input type="file" accept=".txt,.vtt,.srt,.md,text/plain" onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            f.text().then((t) => setText((cur) => (cur.trim() ? `${cur.trim()}\n\n` : "") + cleanTranscript(f.name, t)));
            e.target.value = "";
          }} />
        </label>
        {s.record && <button type="button" className="qp-btn line" onClick={() => setEditing(false)}>Cancel</button>}
      </span>
    </form>
  );
}

/** Ideas for talks: each a press from the note form, and the crew can add their own. */
function Topics({ topics, pending, run, onUse }: { topics: Topic[]; pending: boolean; run: Run; onUse: (t: Topic) => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("");
  return (
    <section className="pk-card tb2-topics" aria-label="Topic ideas">
      <h2>Topic ideas</h2>
      <p className="tb2-sub">Press one to put it in the note.</p>
      <ul>
        {topics.map((t) => (
          <li key={t.id}>
            <button type="button" className="tb2-use" onClick={() => onUse(t)}><b>{t.title}</b><span>{t.points.length} {t.points.length === 1 ? "point" : "points"}</span></button>
            <button type="button" className="tb2-x" disabled={pending} aria-label={`Take "${t.title}" off the ideas`} title="Take this idea off"
              onClick={() => { if (confirm(`Take "${t.title}" off the topic ideas?`)) run(() => removeTopic(t.id), "Idea taken off."); }}>×</button>
          </li>
        ))}
      </ul>
      {adding ? (
        <form onSubmit={(e) => { e.preventDefault(); run(() => saveTopic({ title, points }), "Idea added.", () => { setTitle(""); setPoints(""); setAdding(false); }); }}>
          <label className="qp-field"><span>The topic</span><input id="tb2-t-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Working in roof spaces" /></label>
          <label className="qp-field"><span>Points <em>one a line</em></span><textarea id="tb2-t-points" rows={4} value={points} onChange={(e) => setPoints(e.target.value)} /></label>
          <span className="tb2-acts"><button type="submit" className="qp-btn dark" disabled={pending || !title.trim()}>Add the idea</button><button type="button" className="qp-btn line" onClick={() => setAdding(false)}>Cancel</button></span>
        </form>
      ) : <button type="button" className="qp-btn line" onClick={() => setAdding(true)}>+ Add an idea</button>}
    </section>
  );
}
