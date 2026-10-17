"use client";

import { createContext, useContext, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPlan, changePlan, dropPlan, type PlanResult } from "@/app/portal/plans/actions";
import { AREAS, areaLabel, byPlan, HORIZONS, STATUS_LABEL, type Horizon, type Plan, type PlanStatus } from "@/lib/plans/types";

type Shared = { run: (fn: () => Promise<PlanResult>, ok?: string, after?: () => void) => void; pending: boolean };
/** Cards read this rather than being declared inside the board, so a half-typed note survives the board redrawing. */
const Ctx = createContext<Shared>(null as unknown as Shared);

function AreaPick({ id, value, onChange }: { id: string; value: string; onChange: (a: string) => void }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value=""></option>
      {AREAS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
    </select>
  );
}

/** A plan on the board: the whole card opens it, like a quote on the pipeline. */
function Card({ p, onOpen }: { p: Plan; onOpen: () => void }) {
  const area0 = areaLabel(p.area);
  return (
    <li className={`pt-plan__card is-${p.status}`}>
      <button type="button" className="pt-plan__open" onClick={onOpen} aria-label={`Open ${p.title}`}>
        <span className="pt-plan__title">{p.title}</span>
        <span className="pt-plan__tags">
          <span className={`pt-plan__status is-${p.status}`}>{STATUS_LABEL[p.status]}</span>
          {area0 && <span>{area0}</span>}
        </span>
        {p.notes && <span className="pt-plan__notes">{p.notes}</span>}
      </button>
    </li>
  );
}

/**
 * One plan, in the middle of the screen over the blurred board: what it is,
 * the whole note, where it's at, and the change form in the same sheet so the
 * card's own colour never has to carry a form.
 */
function PlanPanel({ p, onClose }: { p: Plan; onClose: () => void }) {
  const { run, pending } = useContext(Ctx);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(p.title);
  const [notes, setNotes] = useState(p.notes ?? "");
  const [area, setArea] = useState(p.area ?? "");
  const [horizon, setHorizon] = useState<Horizon>(p.horizon);
  const [status, setStatus] = useState<PlanStatus>(p.status);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);
  const set = (s: PlanStatus, ok: string) => run(() => changePlan(p.id, { status: s }), ok, s === "done" ? onClose : undefined);
  const when = HORIZONS.find((h) => h.key === p.horizon)?.label;
  const area0 = areaLabel(p.area);
  const steps: PlanStatus[] = ["idea", "doing", "done"];

  return (
    <div className="qp-scrim mid" onClick={onClose}>
      <div className="qp-panel mid" role="dialog" aria-modal="true" aria-labelledby="plan-panel-h" onClick={(e) => e.stopPropagation()}>
        <div className="qp-ph">
          <span>{editing ? "Change the plan" : "On the plan"}</span>
          <button type="button" className="qp-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        {editing ? (
          <form
            className="qp-form"
            onSubmit={(e) => { e.preventDefault(); run(() => changePlan(p.id, { title, notes, area, horizon, status }), "Saved.", () => setEditing(false)); }}
          >
            <label className="qp-field"><span>What you want to do</span><input id="plan-edit-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} required /></label>
            <label className="qp-field"><span>Notes</span><textarea id="plan-edit-notes" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} /></label>
            <label className="qp-field"><span>What it&rsquo;s about</span><AreaPick id="plan-edit-area" value={area} onChange={setArea} /></label>
            <fieldset><legend>When</legend>
              <div className="qp-opts">
                {HORIZONS.map((h) => <button key={h.key} type="button" className={horizon === h.key ? "on" : undefined} aria-pressed={horizon === h.key} onClick={() => setHorizon(h.key)}>{h.label}</button>)}
              </div>
            </fieldset>
            <fieldset><legend>Where it&rsquo;s at</legend>
              <div className="qp-opts">
                {steps.map((s) => <button key={s} type="button" className={status === s ? "on" : undefined} aria-pressed={status === s} onClick={() => setStatus(s)}>{STATUS_LABEL[s]}</button>)}
              </div>
            </fieldset>
            <div className="qp-acts">
              <button type="submit" className="qp-btn dark" disabled={pending || !title.trim()}>Save</button>
              <button type="button" className="qp-btn" onClick={() => setEditing(false)}>Cancel</button>
              <button type="button" className="td-del" disabled={pending} onClick={() => { if (confirm(`Take "${p.title}" off your plan?`)) run(() => dropPlan(p.id), "Taken off the plan.", onClose); }}>Remove</button>
            </div>
          </form>
        ) : (
          <>
            <h2 id="plan-panel-h" className="rl-h">{p.title}</h2>
            <ol className="qp-steps pl-steps" aria-label="Where it's at">
              {steps.map((s, i) => (
                <li key={s} className={`${steps.indexOf(p.status) >= i ? "done" : ""}${p.status === s ? " now" : ""}`}><i />{STATUS_LABEL[s]}</li>
              ))}
            </ol>
            <dl className="qp-facts">
              <div><dt>When</dt><dd>{when}</dd></div>
              <div><dt>About</dt><dd>{area0 ?? "Not set"}</dd></div>
            </dl>
            {p.notes ? <p className="pl-notes">{p.notes}</p> : <p className="qp-note">No notes yet. Change it to add some.</p>}
            <div className="qp-acts">
              {p.status === "idea" && <button type="button" className="qp-btn dark" disabled={pending} onClick={() => set("doing", `Started: ${p.title}`)}>Start on it</button>}
              {p.status === "doing" && <button type="button" className="qp-btn dark" disabled={pending} onClick={() => set("done", `Done: ${p.title}`)}>Mark it done</button>}
              {p.status === "done" && <button type="button" className="qp-btn dark" disabled={pending} onClick={() => set("idea", `Back on the plan: ${p.title}`)}>Put it back on the plan</button>}
              <button type="button" className="qp-btn line" onClick={() => setEditing(true)}>Change</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** How soon, as a colour down the board: red is now, then yellow, green, and grey for whenever. Each column says it in words too. */
const TONE: Record<Horizon, string> = { month: "red", quarter: "gold", year: "forest", someday: "grey" };

/** A new idea, written straight into its column: what it is and a description of it. */
function AddIdea({ horizon, onDone }: { horizon: Horizon; onDone: () => void }) {
  const { run, pending } = useContext(Ctx);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [area, setArea] = useState("");
  return (
    <li className="td-cardw">
      <form className="td-form" onSubmit={(e) => { e.preventDefault(); run(() => addPlan({ title, horizon, area, notes }), "On the plan.", onDone); }}>
        <input id={`pl-new-${horizon}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} required placeholder="The idea, in a line" autoFocus aria-label="The idea" />
        <textarea id={`pl-new-notes-${horizon}`} rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} placeholder="Describe it: why, what it'd take, who'd need to be in on it." aria-label="Description" />
        <AreaPick id={`pl-new-area-${horizon}`} value={area} onChange={setArea} />
        <div className="td-formacts">
          <button type="submit" className="qp-btn dark" disabled={pending || !title.trim()}>Add</button>
          <button type="button" className="qp-btn" onClick={onDone}>Cancel</button>
        </div>
      </form>
    </li>
  );
}

/**
 * Future planning as a board like the to-do list: a column for each "when",
 * coloured by how soon, ideas added straight into the column with a
 * description, and each one opening in the middle of the screen.
 */
export function PlansBoard({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); }, [msg]);
  const run = (fn: () => Promise<PlanResult>, ok?: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (ok ? { ok: true, text: ok } : null) : { ok: false, text: r.error ?? "Couldn't do that." });
      if (r.ok) after?.();
      router.refresh();
    });

  const [adding, setAdding] = useState<Horizon | null>(plans.length ? null : "month");
  const [showDone, setShowDone] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = plans.find((p) => p.id === openId) ?? null;
  const open = plans.filter((p) => p.status !== "done");
  const done = plans.filter((p) => p.status === "done").sort((a, b) => ((b.doneAt ?? "") < (a.doneAt ?? "") ? -1 : 1));

  return (
    <Ctx.Provider value={{ run, pending }}>
      <div className="td pl">
        <div className="qp-bar">
          <button type="button" className={`qp-chip td-donebtn${showDone ? " on" : ""}`} aria-pressed={showDone} onClick={() => setShowDone((v) => !v)}>Done · {done.length}</button>
        </div>
        <div className="td-board pl-board">
          {HORIZONS.map((h, i) => {
            const list = open.filter((p) => p.horizon === h.key).sort(byPlan);
            const tone = TONE[h.key];
            return (
              <section key={h.key} className={`qp-col td-col pl-col t-${tone}`} aria-labelledby={`pl-h-${i}`}>
                <header className="qp-colh">
                  <i className={`qp-dot pl-dot t-${tone}`} aria-hidden="true" />
                  <h2 id={`pl-h-${i}`} title={h.blurb}>{h.label}</h2>
                  <span className="qp-n">{list.length}</span>
                  <span className="td-colacts">
                    <button type="button" className="td-round" aria-label={`Add to ${h.label}`} title={`Add to ${h.label}`} onClick={() => setAdding(adding === h.key ? null : h.key)}>+</button>
                  </span>
                </header>
                <p className="pl-blurb">{h.blurb}</p>
                <ul className="qp-list td-list pt-plan__cards">
                  {adding === h.key && <AddIdea horizon={h.key} onDone={() => setAdding(null)} />}
                  {list.map((p) => <Card key={p.id} p={p} onOpen={() => setOpenId(p.id)} />)}
                  {!list.length && adding !== h.key && <li className="qp-empty">Nothing for {h.label.toLowerCase()} yet.</li>}
                </ul>
              </section>
            );
          })}
        </div>

        {showDone && (
          <section className="qp-fold" aria-label="Done">
            <header className="qp-foldh"><b>Done</b><button type="button" className="qp-x" onClick={() => setShowDone(false)} aria-label="Close">×</button></header>
            {done.length ? (
              <ul className="pt-plan__cards is-done pl-done">{done.map((p) => <Card key={p.id} p={p} onOpen={() => setOpenId(p.id)} />)}</ul>
            ) : (
              <p className="qp-empty">Nothing ticked off yet. It&rsquo;ll be worth seeing what&rsquo;s here in a year.</p>
            )}
          </section>
        )}
      </div>
      {opened && <PlanPanel key={opened.id + opened.status} p={opened} onClose={() => setOpenId(null)} />}
      {msg && <p className={`qp-toast${msg.ok ? "" : " bad"}`} role="status">{msg.text}</p>}
    </Ctx.Provider>
  );
}
