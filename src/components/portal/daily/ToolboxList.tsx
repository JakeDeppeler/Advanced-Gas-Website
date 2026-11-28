"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notTalked, removeTopic, saveTopic, talkedAbout } from "@/app/portal/toolbox/actions";
import type { Talk, Topic } from "@/lib/toolbox/types";

/**
 * Toolbox talks as a list, the way To-do is (Jake, 28 Nov: "the toolbox talk
 * just needs to be a list to talk about, like the to-do"). The To-do board's
 * own cards (td-card, td-tick): anyone adds a topic, taps one to change it,
 * and ticks it once it's been talked about. A ticked topic moves to "Talked
 * about" with the day and who ticked it, and unticking puts it back.
 */
const when = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "");

function TopicForm({ topic, onDone }: { topic?: Topic; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(topic?.title ?? "");
  const [points, setPoints] = useState(topic?.points.join("\n") ?? "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const key = topic?.id ?? "new";
  return (
    <form className="td-form" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const r = await saveTopic({ id: topic?.id, title, points });
        if (!r.ok) { setErr(r.error ?? "Couldn’t save it."); return; }
        onDone(); router.refresh();
      });
    }}>
      <input id={`tb-t-${key}`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What to talk about" maxLength={120} required aria-label="What to talk about" autoFocus />
      <textarea id={`tb-n-${key}`} value={points} onChange={(e) => setPoints(e.target.value)} placeholder="What to say, a line each (optional)" rows={3} aria-label="What to say" />
      {err && <p className="tb-err" role="alert">{err}</p>}
      <div className="td-formacts">
        <button type="submit" className="qp-btn dark" disabled={pending || !title.trim()}>{topic ? "Save" : "Add"}</button>
        <button type="button" className="qp-btn" onClick={onDone}>Cancel</button>
        {topic && <button type="button" className="td-del" disabled={pending} onClick={() => {
          if (!confirm(`Take "${topic.title}" off the list?`)) return;
          start(async () => { await removeTopic(topic.id); onDone(); router.refresh(); });
        }}>Delete</button>}
      </div>
    </form>
  );
}

export function ToolboxList({ topics, talks, next }: { topics: Topic[]; talks: Talk[]; next: string | null }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const tick = (id: string) => { setBusy(id); start(async () => { await talkedAbout(id); setBusy(null); router.refresh(); }); };
  const untick = (id: string) => { setBusy(id); start(async () => { await notTalked(id); setBusy(null); router.refresh(); }); };
  const recent = talks.slice(0, 30);

  return (
    <div className="td-board tb-board">
      <section className="qp-col td-col t-gold" aria-labelledby="tb-h-to">
        <header className="qp-colh">
          <i className="qp-dot td-dot t-gold" aria-hidden="true" />
          <h2 id="tb-h-to">To talk about</h2>
          <span className="qp-n">{topics.length}</span>
          <span className="td-colacts">
            <button type="button" className="td-round" aria-label="Add a topic" title="Add a topic" onClick={() => setAdding((v) => !v)}>+</button>
          </span>
        </header>
        <ul className="qp-list td-list">
          {adding && <li className="td-cardw"><TopicForm onDone={() => setAdding(false)} /></li>}
          {topics.map((t) => editing === t.id ? (
            <li key={t.id} className="td-cardw"><TopicForm topic={t} onDone={() => setEditing(null)} /></li>
          ) : (
            <li key={t.id} className="td-cardw">
              <div className={`td-card t-gold is-open${busy === t.id ? " is-popping" : ""}`}>
                <div className="td-top">
                  <span className="td-tags">{next && <span className="td-due">For {next}</span>}</span>
                  <button type="button" role="checkbox" aria-checked={false} className="td-tick" disabled={pending}
                    aria-label={`Talked about: ${t.title}`} title="Talked about" onClick={() => tick(t.id)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  </button>
                </div>
                <button type="button" className="td-body" onClick={() => setEditing(t.id)} aria-label={`Change: ${t.title}`}>
                  <b className="td-title">{t.title}</b>
                  {t.points.length > 0 && <span className="td-notes">{t.points.join(" · ")}</span>}
                </button>
                {t.addedBy && <div className="td-foot"><span className="td-who"><span className="qp-av" aria-hidden="true">{t.addedBy.slice(0, 1)}</span>{t.addedBy}</span></div>}
              </div>
            </li>
          ))}
          {!topics.length && !adding && <li className="qp-empty">Nothing to talk about yet. Add one with +.</li>}
        </ul>
      </section>

      <section className="qp-col td-col t-forest" aria-labelledby="tb-h-done">
        <header className="qp-colh">
          <i className="qp-dot td-dot t-forest" aria-hidden="true" />
          <h2 id="tb-h-done">Talked about</h2>
          <span className="qp-n">{talks.length}</span>
        </header>
        <ul className="qp-list td-list">
          {recent.map((t) => (
            <li key={t.id} className="td-cardw">
              <div className="td-card t-forest is-done">
                <div className="td-top">
                  <span className="td-tags"><span className="td-due is-done">{when(t.on)}</span></span>
                  <button type="button" role="checkbox" aria-checked className="td-tick" disabled={pending || busy === t.id}
                    aria-label={`Not talked about yet: ${t.title}`} title="Put it back on the list" onClick={() => untick(t.id)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  </button>
                </div>
                <div className="td-body"><b className="td-title">{t.title}</b>{t.notes && <span className="td-notes">{t.notes.split("\n").join(" · ")}</span>}</div>
                {t.by && <div className="td-foot"><span className="td-who"><span className="qp-av" aria-hidden="true">{t.by.slice(0, 1)}</span>Ticked by {t.by}</span></div>}
              </div>
            </li>
          ))}
          {!talks.length && <li className="qp-empty">Nothing ticked yet. Tick a topic once the crew has been through it.</li>}
        </ul>
      </section>
    </div>
  );
}
