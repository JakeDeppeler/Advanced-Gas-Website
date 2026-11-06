"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { holdNote, newTopic, removeNote, removeTopic, saveRecord, setSchedule, bringBack, type ToolboxResult } from "@/app/portal/toolbox/actions";
import { EVERY_SHORT, WEEKDAYS, talkName, timeWords, type Every, type Schedule, type Session, type Topic } from "@/lib/toolbox/types";

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

const longDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).replace(",", "");
/** Half-hours from 5 am to 6 pm: when a talk could reasonably start. */
const TIMES = Array.from({ length: 27 }, (_, i) => `${String(5 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

/**
 * Toolbox talks, kept to what's needed to run one: the next talk and its
 * topics, the topics on hold for a later one, one form to write a topic
 * (straight onto the next talk, or on hold), and a few settings. What was
 * said at a talk is still kept, folded under the next talk and in the list
 * of earlier ones: it's the record the crew was told.
 */
export function ToolboxPlan({ schedule, today, current, next, earlier, sessions, topics, people, me, canPlan }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [draft, setDraft] = useState({ head: "", text: "" });
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); }, [msg]);
  const run = (fn: () => Promise<ToolboxResult>, ok: string, then?: () => void) =>
    start(async () => { const r = await fn(); setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.error ?? "Couldn't do that." }); if (r.ok) { then?.(); router.refresh(); } });
  const byDay = new Map(sessions.map((s) => [s.on, s]));
  const of = (on: string) => byDay.get(on) ?? empty(on);
  const name = (on: string) => talkName(schedule, on);
  const cur = of(current);
  const after = of(next);
  const n = daysTo(current, today);
  const at = timeWords(schedule.time);
  const plan = [EVERY_SHORT[schedule.every], `${WEEKDAYS[schedule.day].slice(0, 3)}${at ? ` ${at}` : ""}`, schedule.runBy ? `${first(schedule.runBy)} runs it` : null, schedule.expected.length ? `${schedule.expected.length} expected` : "everyone expected"].filter(Boolean).join(" · ");
  const set = (p: Partial<Pick<Schedule, "every" | "day" | "time" | "runBy" | "expected">>, ok: string) =>
    run(() => setSchedule({ every: schedule.every, day: schedule.day, time: schedule.time, runBy: schedule.runBy, expected: schedule.expected, today, ...p }), ok);
  const recorded = earlier.filter((on) => of(on).record).length;

  return (
    <div className="tb3">
      <div className="tb3-col">
        <section className="pk-card tb3-card" aria-labelledby="tb3-next">
          <div className="tb3-nh">
            <span>
              <span className="tb3-l">Next talk</span>
              <h2 id="tb3-next">{longDay(current)}{at ? `, ${at}` : ""}</h2>
              <span className="tb3-sub">{plan}</span>
            </span>
            <span className={`tb2-pill${n <= 1 ? " soon" : ""}${cur.record ? " done" : ""}`}>{cur.record ? "Recorded" : when(current, today)}</span>
          </div>
          <TopicRows s={cur} pending={pending} run={run} empty="Nothing on it yet. Write a topic on the right, or bring one back from On hold." />
          {after.notes.length > 0 && (
            <div className="tb3-after">
              <span className="tb3-l">Already on the one after, {day(next)}</span>
              <TopicRows s={after} pending={pending} run={run} empty="" />
            </div>
          )}
          <details className="tb3-fold" open={!!cur.record || undefined}>
            <summary>{cur.record ? `What was said · recorded${cur.who.length ? `, ${cur.who.length} there` : ""}` : "After the talk: what was said, and who was there"}</summary>
            <RecordBox s={cur} people={people} me={me} pending={pending} run={run} />
          </details>
        </section>

        <section className="pk-card tb3-card" aria-labelledby="tb3-hold">
          <h2 id="tb3-hold">On hold</h2>
          <p className="tb3-sub">{topics.length ? `${topics.length} ${topics.length === 1 ? "topic" : "topics"} waiting` : "Nothing waiting. Put a topic on hold to keep it for a later talk."}</p>
          {topics.length > 0 && (
            <ul className="tb3-rows">
              {topics.map((t) => (
                <li key={t.id}>
                  <span className="tb3-t"><b>{t.title}</b>{t.points.length > 0 && <span>{t.points.join(" · ")}</span>}</span>
                  <span className="tb3-acts">
                    <button type="button" className="pk-btn g tb3-b" disabled={pending} onClick={() => run(() => bringBack({ on: current, id: t.id }), `On the next talk: ${t.title}.`)}>Add to next talk</button>
                    <button type="button" className="tb2-x" disabled={pending} aria-label={`Take "${t.title}" off`} title="Take it off for good"
                      onClick={() => { if (confirm(`Take "${t.title}" off On hold for good?`)) run(() => removeTopic(t.id), "Taken off."); }}>×</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {earlier.length > 0 && (
          <details className="pk-card tb3-card tb3-past">
            <summary><h2>Earlier talks</h2><span className="tb3-sub">{recorded} of {earlier.length} recorded</span><span className="tb2-cv" aria-hidden="true">⌄</span></summary>
            {earlier.map((on) => {
              const s = of(on);
              return (
                <details key={on} className="tb2-row">
                  <summary>
                    <span className={`tb2-dot${s.record ? " done" : ""}`} aria-hidden="true">{s.record ? "✓" : ""}</span>
                    <span className="tb2-rt"><b>{name(on)}</b><span>{/\d/.test(name(on)) ? "" : `${day(on)} · `}{s.notes.length ? s.notes.map((x) => x.head).join(", ") : "no topics"}</span></span>
                    <span className={`tb2-pill${s.record ? " done" : ""}`}>{s.record ? `Recorded${s.who.length ? `, ${s.who.length} there` : ""}` : "Not recorded"}</span>
                    <span className="tb2-cv" aria-hidden="true">⌄</span>
                  </summary>
                  <div className="tb2-body">
                    <TopicRows s={s} pending={pending} run={run} empty="No topics on it." past />
                    <RecordBox s={s} people={people} me={me} pending={pending} run={run} />
                  </div>
                </details>
              );
            })}
          </details>
        )}
      </div>

      <div className="tb3-col">
        <section className="pk-card tb3-card" aria-labelledby="tb3-new">
          <h2 id="tb3-new">New topic</h2>
          <form className="tb3-form" onSubmit={(e) => e.preventDefault()}>
            <label className="qp-field"><span>Heading</span><input id="tb3-head" value={draft.head} onChange={(e) => setDraft({ ...draft, head: e.target.value })} maxLength={120} placeholder="e.g. Ladders on two-storey jobs" /></label>
            <label className="qp-field"><span>Description</span><textarea id="tb3-text" rows={4} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} maxLength={4000} placeholder="What happened, what to remind the crew of, what to ask them." /></label>
            <span className="tb3-acts">
              <button type="button" className="qp-btn dark" disabled={pending || !draft.head.trim()} onClick={() => run(() => newTopic({ on: current, ...draft, to: "talk" }), "On the next talk.", () => setDraft({ head: "", text: "" }))}>Add to next talk</button>
              <button type="button" className="qp-btn line" disabled={pending || !draft.head.trim()} onClick={() => run(() => newTopic({ on: current, ...draft, to: "hold" }), "Put on hold.", () => setDraft({ head: "", text: "" }))}>Put on hold</button>
            </span>
          </form>
        </section>

        <section className="pk-card tb3-card" aria-labelledby="tb3-set">
          <h2 id="tb3-set">Settings</h2>
          {canPlan ? (
            <div className="tb3-set">
              <div className="tb3-f">
                <span>How often</span>
                <span className="tb2-seg" role="group" aria-label="How often">
                  {(["week", "fortnight", "month"] as Every[]).map((e) => (
                    <button key={e} type="button" className={schedule.every === e ? "on" : undefined} aria-pressed={schedule.every === e} disabled={pending}
                      onClick={() => set({ every: e }, `${EVERY_SHORT[e]} now.`)}>{EVERY_SHORT[e]}</button>
                  ))}
                </span>
              </div>
              <div className="tb3-f">
                <span>Day and time{schedule.every === "month" ? " (the first of the month)" : ""}</span>
                <span className="tb3-pair">
                  <select id="tb3-day" aria-label="Day" value={schedule.day} disabled={pending} onChange={(e) => set({ day: Number(e.target.value) as Schedule["day"] }, "Day changed.")}>
                    {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{WEEKDAYS[d]}</option>)}
                  </select>
                  <select id="tb3-time" aria-label="Time" value={schedule.time ?? ""} disabled={pending} onChange={(e) => set({ time: e.target.value || null }, "Time changed.")}>
                    <option value="">No set time</option>
                    {TIMES.map((t) => <option key={t} value={t}>{timeWords(t)}</option>)}
                  </select>
                </span>
              </div>
              <div className="tb3-f">
                <span>Who runs it</span>
                <select id="tb3-by" value={schedule.runBy ?? ""} disabled={pending} onChange={(e) => set({ runBy: e.target.value || null }, "Saved.")}>
                  <option value="">Nobody set</option>
                  {[...new Set([...people, ...(schedule.runBy ? [schedule.runBy] : [])])].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="tb3-f">
                <span>Who&rsquo;s expected <em>{schedule.expected.length ? "" : "none ticked means everyone"}</em></span>
                <span className="qp-opts">
                  {people.map((p) => {
                    const on = schedule.expected.includes(p);
                    return <button key={p} type="button" className={on ? "on" : undefined} aria-pressed={on} disabled={pending}
                      onClick={() => set({ expected: on ? schedule.expected.filter((x) => x !== p) : [...schedule.expected, p] }, on ? `${first(p)} off the list.` : `${first(p)} expected.`)}><span className="qp-av" aria-hidden="true">{p.slice(0, 1)}</span>{first(p)}</button>;
                  })}
                </span>
              </div>
            </div>
          ) : <p className="tb3-sub">{plan}. The office sets these.</p>}
        </section>
      </div>
      {msg && <p className={`qp-toast${msg.ok ? "" : " bad"}`} role="status">{msg.text}</p>}
    </div>
  );
}

/** A talk's topics: each can go on hold for a later talk, or come off. */
function TopicRows({ s, pending, run, empty: none, past }: { s: Session; pending: boolean; run: Run; empty: string; past?: boolean }) {
  if (!s.notes.length) return none ? <p className="tb2-none">{none}</p> : null;
  return (
    <ul className="tb3-rows">
      {s.notes.map((x) => (
        <li key={x.id}>
          <span className="tb3-t"><b>{x.head}</b>{x.text && <span>{x.text}</span>}</span>
          <span className="tb3-acts">
            {!past && <button type="button" className="pk-btn g tb3-b" disabled={pending} onClick={() => run(() => holdNote({ on: s.on, id: x.id }), `On hold: ${x.head}.`)}>Put on hold</button>}
            <button type="button" className="tb2-x" disabled={pending} aria-label={`Take "${x.head}" off`} title="Take it off this talk"
              onClick={() => { if (confirm(`Take "${x.head}" off this talk?`)) run(() => removeNote({ on: s.on, id: x.id }), "Taken off."); }}>×</button>
          </span>
        </li>
      ))}
    </ul>
  );
}

type Run = (fn: () => Promise<ToolboxResult>, ok: string, then?: () => void) => void;



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

