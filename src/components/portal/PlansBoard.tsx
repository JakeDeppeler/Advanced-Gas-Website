"use client";

import { createContext, useContext, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPlan, changePlan, dropPlan, type PlanResult } from "@/app/portal/plans/actions";
import { AREAS, areaLabel, byPlan, HORIZONS, STATUS_LABEL, type Horizon, type Plan, type PlanStatus } from "@/lib/plans/types";

type Shared = { run: (fn: () => Promise<PlanResult>, ok?: string, after?: () => void) => void; pending: boolean };
/** Cards read this rather than being declared inside the board, so a half-typed note survives the board redrawing. */
const Ctx = createContext<Shared>(null as unknown as Shared);

function HorizonPick({ value, onChange }: { value: Horizon; onChange: (h: Horizon) => void }) {
  return (
    <div className="pt-todo__chips" role="group" aria-label="When">
      {HORIZONS.map((h) => (
        <button key={h.key} type="button" className={`pt-todo__chip${value === h.key ? " is-on" : ""}`} aria-pressed={value === h.key} onClick={() => onChange(h.key)}>{h.label}</button>
      ))}
    </div>
  );
}

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

export function PlansBoard({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<PlanResult>, ok?: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (ok ? { ok: true, text: ok } : null) : { ok: false, text: r.error ?? "Couldn't do that." });
      if (r.ok) after?.();
      router.refresh();
    });

  const [title, setTitle] = useState("");
  const [horizon, setHorizon] = useState<Horizon>("year");
  const [area, setArea] = useState("");
  const [notes, setNotes] = useState("");
  const [withNotes, setWithNotes] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const opened = plans.find((p) => p.id === openId) ?? null;
  const open = plans.filter((p) => p.status !== "done");
  const done = plans.filter((p) => p.status === "done").sort((a, b) => ((b.doneAt ?? "") < (a.doneAt ?? "") ? -1 : 1));

  return (
    <Ctx.Provider value={{ run, pending }}>
      <div className="pt-plan">
        <section className="pt-panel" aria-labelledby="plan-add-h">
          <h2 id="plan-add-h" className="pt-panel__h">Add to the plan</h2>
          <form
            className="pt-plan__add"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => addPlan({ title, horizon, area, notes: withNotes ? notes : undefined }), "On the plan.", () => { setTitle(""); setNotes(""); setWithNotes(false); });
            }}
          >
            <label className="pt-field pt-plan__what"><span>What do you want to do for the business?</span>
              <input id="plan-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} required placeholder="Get a second ducted crew going" />
            </label>
            <label className="pt-field pt-plan__area"><span>What it&rsquo;s about <em>(optional)</em></span><AreaPick id="plan-area" value={area} onChange={setArea} /></label>
            <div className="pt-field pt-plan__when"><span>When would you like to get to it?</span><HorizonPick value={horizon} onChange={setHorizon} /></div>
            {withNotes ? (
              <label className="pt-field pt-plan__notesfield"><span>Notes <em>(optional)</em></span>
                <textarea id="plan-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} placeholder="Why, what it'd take, who'd need to be in on it." />
              </label>
            ) : (
              <button type="button" className="pt-todo__addnote" onClick={() => setWithNotes(true)}>+ Add a note</button>
            )}
            <div className="pt-todo__submit">
              <button type="submit" className="pt-btn pt-btn--orange" disabled={pending || !title.trim()}>Add to the plan</button>
              {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}
            </div>
          </form>
        </section>

        <div className="pt-plan__cols">
          {HORIZONS.map((h) => {
            const list = open.filter((p) => p.horizon === h.key).sort(byPlan);
            return (
              <section key={h.key} className="pt-plan__col" aria-labelledby={`plan-${h.key}`}>
                <header className="pt-plan__colhead">
                  <h3 id={`plan-${h.key}`}>{h.label}</h3>
                  <span>{h.blurb}{list.length ? ` · ${list.length}` : ""}</span>
                </header>
                {list.length ? (
                  <ul className="pt-plan__cards">{list.map((p) => <Card key={p.id} p={p} onOpen={() => setOpenId(p.id)} />)}</ul>
                ) : (
                  <p className="pt-todo__empty">Nothing here yet.</p>
                )}
              </section>
            );
          })}
        </div>

        <details className="pt-panel pt-todo__done">
          <summary>
            <span className="pt-panel__h">Done</span>
            <span className="pt-todo__counts"><span>{done.length}</span></span>
          </summary>
          {done.length ? (
            <ul className="pt-plan__cards is-done">{done.map((p) => <Card key={p.id} p={p} onOpen={() => setOpenId(p.id)} />)}</ul>
          ) : (
            <p className="pt-todo__empty">Nothing ticked off yet. It&rsquo;ll be worth seeing what&rsquo;s here in a year.</p>
          )}
        </details>
      </div>
      {opened && <PlanPanel key={opened.id + opened.status} p={opened} onClose={() => setOpenId(null)} />}
      {msg && opened && <p className={`qp-toast${msg.ok ? "" : " bad"}`} role="status">{msg.text}</p>}
    </Ctx.Provider>
  );
}
