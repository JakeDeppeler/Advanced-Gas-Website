"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeTopic, saveTalk, saveTopic, type ToolboxResult } from "@/app/portal/toolbox/actions";
import type { Talk, Topic } from "@/lib/toolbox/types";

const TONES = ["gold", "forest", "orange", "dark"] as const;
const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const first = (n: string) => n.split(" ")[0];

type Sheet = { kind: "talk"; topic: Topic | null } | { kind: "topic"; topic: Topic | null } | { kind: "record"; talk: Talk };

/**
 * Toolbox talks: the topics as cards, each with when it was last talked
 * through; open one to walk the points, tick who was there, write down what
 * was said and agreed, and save it. The talks given are listed underneath.
 */
export function ToolboxBoard({ topics, talks, people, me, today }: { topics: Topic[]; talks: Talk[]; people: string[]; me: string; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); }, [msg]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setSheet(null); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);
  const run = (fn: () => Promise<ToolboxResult>, ok: string) =>
    start(async () => { const r = await fn(); setMsg(r.ok ? ok : r.error ?? "Couldn't do that."); if (r.ok) { setSheet(null); router.refresh(); } });
  const lastOf = (id: string) => talks.find((t) => t.topicId === id) ?? null;

  return (
    <div className="tb">
      <div className="qp-bar">
        <button type="button" className="qp-btn dark" onClick={() => setSheet({ kind: "talk", topic: null })}>Give a talk on something else</button>
      </div>
      <div className="tb-grid">
        {topics.map((t, i) => {
          const last = lastOf(t.id);
          return (
            <button key={t.id} type="button" className={`td-card tb-card t-${TONES[i % TONES.length]}`} onClick={() => setSheet({ kind: "talk", topic: t })}>
              <span className="td-top"><span className="td-due">{last ? `Last talked ${day(last.on)}` : "Not talked through yet"}</span></span>
              <b className="td-title">{t.title}</b>
              {t.points.length > 0 && <span className="td-notes">{t.points.slice(0, 3).join(" · ")}{t.points.length > 3 ? " …" : ""}</span>}
              <span className="td-foot"><span>{t.points.length} {t.points.length === 1 ? "point" : "points"}</span><span className="tb-go">Start this talk ›</span></span>
            </button>
          );
        })}
        <button type="button" className="qp-drop tb-add" onClick={() => setSheet({ kind: "topic", topic: null })}>
          <span className="qp-dropi x" aria-hidden="true">+</span>
          <b>Add a topic</b>
          <span>something worth talking through</span>
        </button>
      </div>

      <section className="pk-card pk-pad tb-past">
        <h2 className="rv-h2">Talks given <span className="qp-n">{talks.length}</span></h2>
        {talks.length ? (
          <ul className="tb-rows">
            {talks.slice(0, 60).map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setSheet({ kind: "record", talk: t })}>
                  <span className="tb-when">{day(t.on)}</span>
                  <b>{t.title}</b>
                  <span>{t.who.length ? `${t.who.length} there: ${t.who.map(first).join(", ")}` : "Nobody ticked"}{t.by ? ` · given by ${first(t.by)}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="qp-note">No talks saved yet. Pick a topic above, talk it through, and save what was said.</p>}
      </section>

      {sheet && (
        <div className="qp-scrim mid" onClick={() => setSheet(null)}>
          <div className="qp-panel mid" role="dialog" aria-modal="true" aria-labelledby="tb-h" onClick={(e) => e.stopPropagation()}>
            <div className="qp-ph">
              <span>{sheet.kind === "record" ? "A talk given" : sheet.kind === "topic" ? (sheet.topic ? "Change the topic" : "A new topic") : "Toolbox talk"}</span>
              <button type="button" className="qp-x" onClick={() => setSheet(null)} aria-label="Close">×</button>
            </div>
            {sheet.kind === "talk" && <TalkForm topic={sheet.topic} people={people} me={me} today={today} pending={pending}
              onSave={(v) => run(() => saveTalk(v), "Talk saved.")}
              onEdit={sheet.topic ? () => setSheet({ kind: "topic", topic: sheet.topic }) : undefined}
              last={sheet.topic ? lastOf(sheet.topic.id) : null} />}
            {sheet.kind === "topic" && <TopicForm topic={sheet.topic} pending={pending}
              onSave={(v) => run(() => saveTopic(v), sheet.topic ? "Topic saved." : "Topic added.")}
              onRemove={sheet.topic ? () => { if (confirm(`Take "${sheet.topic?.title}" off the topics? Talks already given are kept.`)) run(() => removeTopic(sheet.topic!.id), "Topic taken off."); } : undefined} />}
            {sheet.kind === "record" && <Record t={sheet.talk} />}
          </div>
        </div>
      )}
      {msg && <p className="qp-toast" role="status">{msg}</p>}
    </div>
  );
}

function TalkForm({ topic, people, me, today, pending, onSave, onEdit, last }: {
  topic: Topic | null; people: string[]; me: string; today: string; pending: boolean; last: Talk | null;
  onSave: (v: { topicId: string | null; title: string; on: string; who: string[]; notes: string; actions: string }) => void; onEdit?: () => void;
}) {
  const [title, setTitle] = useState(topic?.title ?? "");
  const [on, setOn] = useState(today);
  const [who, setWho] = useState<string[]>([me]);
  const [notes, setNotes] = useState("");
  const [actions, setActions] = useState("");
  const toggle = (n: string) => setWho((w) => (w.includes(n) ? w.filter((x) => x !== n) : [...w, n]));
  return (
    <>
      {topic ? <h2 id="tb-h" className="rl-h">{topic.title}</h2> : <h2 id="tb-h" className="rl-h">A talk on something else</h2>}
      {topic && topic.points.length > 0 && (
        <section className="tb-points">
          <h3>Walk through</h3>
          <ul className="rv-points dot">{topic.points.map((p) => <li key={p}>{p}</li>)}</ul>
        </section>
      )}
      {last && <p className="qp-note">Last talked through {day(last.on)}{last.by ? ` by ${first(last.by)}` : ""}.</p>}
      <form className="qp-form" onSubmit={(e) => { e.preventDefault(); onSave({ topicId: topic?.id ?? null, title, on, who, notes, actions }); }}>
        {!topic && <label className="qp-field"><span>What it was on</span><input id="tb-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required /></label>}
        <label className="qp-field"><span>The day</span><input id="tb-on" type="date" value={on} max={today} onChange={(e) => setOn(e.target.value)} required /></label>
        <fieldset><legend>Who was there</legend>
          <div className="qp-opts">
            {people.map((n) => <button key={n} type="button" className={who.includes(n) ? "on" : undefined} aria-pressed={who.includes(n)} onClick={() => toggle(n)}><span className="qp-av" aria-hidden="true">{n.slice(0, 1)}</span>{n}</button>)}
          </div>
        </fieldset>
        <label className="qp-field"><span>What we talked about</span><textarea id="tb-notes" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={6000} placeholder="What came up, questions asked, anything the crew raised." /></label>
        <label className="qp-field"><span>What we agreed <em>optional</em></span><textarea id="tb-actions" rows={3} value={actions} onChange={(e) => setActions(e.target.value)} maxLength={3000} placeholder="Anything to fix, buy or change, and who's on it." /></label>
        <div className="qp-acts">
          <button type="submit" className="qp-btn dark" disabled={pending || !(topic?.title || title.trim())}>Save what we talked about</button>
          {onEdit && <button type="button" className="qp-btn line" onClick={onEdit}>Change the topic</button>}
        </div>
      </form>
    </>
  );
}

function TopicForm({ topic, pending, onSave, onRemove }: { topic: Topic | null; pending: boolean; onSave: (v: { id?: string; title: string; points: string }) => void; onRemove?: () => void }) {
  const [title, setTitle] = useState(topic?.title ?? "");
  const [points, setPoints] = useState((topic?.points ?? []).join("\n"));
  return (
    <form className="qp-form" onSubmit={(e) => { e.preventDefault(); onSave({ id: topic?.id, title, points }); }}>
      <h2 id="tb-h" className="rl-h">{topic ? "Change the topic" : "Add a topic"}</h2>
      <label className="qp-field"><span>The topic</span><input id="tb-t-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="Working in roof spaces" /></label>
      <label className="qp-field"><span>Points to walk through <em>one a line</em></span><textarea id="tb-t-points" rows={6} value={points} onChange={(e) => setPoints(e.target.value)} /></label>
      <div className="qp-acts">
        <button type="submit" className="qp-btn dark" disabled={pending || !title.trim()}>Save</button>
        {onRemove && <button type="button" className="td-del" onClick={onRemove}>Take this topic off</button>}
      </div>
    </form>
  );
}

function Record({ t }: { t: Talk }) {
  return (
    <>
      <h2 id="tb-h" className="rl-h">{t.title}</h2>
      <dl className="qp-facts">
        <div><dt>When</dt><dd>{day(t.on)}</dd></div>
        <div><dt>Given by</dt><dd>{t.by ?? "Not saved"}</dd></div>
      </dl>
      <section className="tb-points"><h3>Who was there</h3><p>{t.who.length ? t.who.join(", ") : "Nobody ticked."}</p></section>
      <section className="tb-points"><h3>What we talked about</h3>{t.notes ? <p className="pl-notes">{t.notes}</p> : <p className="qp-note">Nothing written down.</p>}</section>
      {t.actions && <section className="tb-points"><h3>What we agreed</h3><p className="pl-notes">{t.actions}</p></section>}
    </>
  );
}
