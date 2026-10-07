"use client";

import { createContext, useContext, useState, useTransition } from "react";
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
      <option value="">—</option>
      {AREAS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
    </select>
  );
}

function Card({ p }: { p: Plan }) {
  const { run, pending } = useContext(Ctx);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(p.title);
  const [notes, setNotes] = useState(p.notes ?? "");
  const [area, setArea] = useState(p.area ?? "");
  const [horizon, setHorizon] = useState<Horizon>(p.horizon);
  const [status, setStatus] = useState<PlanStatus>(p.status);
  const set = (s: PlanStatus, ok: string) => run(() => changePlan(p.id, { status: s }), ok);

  if (editing) {
    return (
      <li className="pt-plan__card is-editing">
        <form
          className="pt-todo__edit"
          onSubmit={(e) => { e.preventDefault(); run(() => changePlan(p.id, { title, notes, area, horizon, status }), "Saved.", () => setEditing(false)); }}
        >
          <label className="pt-field"><span>What you want to do</span><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} required /></label>
          <label className="pt-field"><span>Notes</span><textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} /></label>
          <label className="pt-field"><span>What it&rsquo;s about</span><AreaPick id={`pl-area-${p.id}`} value={area} onChange={setArea} /></label>
          <div className="pt-field"><span>When</span><HorizonPick value={horizon} onChange={setHorizon} /></div>
          <div className="pt-field"><span>Where it&rsquo;s at</span>
            <div className="pt-todo__chips" role="group" aria-label="Where it's at">
              {(["idea", "doing", "done"] as PlanStatus[]).map((s) => (
                <button key={s} type="button" className={`pt-todo__chip${status === s ? " is-on" : ""}`} aria-pressed={status === s} onClick={() => setStatus(s)}>{STATUS_LABEL[s]}</button>
              ))}
            </div>
          </div>
          <div className="pt-todo__editacts">
            <button type="submit" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending}>Save</button>
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className="pt-todo__remove" disabled={pending} onClick={() => { if (confirm(`Take "${p.title}" off your plan?`)) run(() => dropPlan(p.id), "Taken off the plan."); }}>Remove</button>
          </div>
        </form>
      </li>
    );
  }

  const area0 = areaLabel(p.area);
  return (
    <li className={`pt-plan__card is-${p.status}`}>
      <span className="pt-plan__title">{p.title}</span>
      <span className="pt-plan__tags">
        <span className={`pt-plan__status is-${p.status}`}>{STATUS_LABEL[p.status]}</span>
        {area0 && <span>{area0}</span>}
      </span>
      {p.notes && <span className="pt-plan__notes">{p.notes}</span>}
      <span className="pt-plan__acts">
        {p.status === "idea" && <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={pending} onClick={() => set("doing", `Started: ${p.title}`)}>Start on it</button>}
        {p.status === "doing" && <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending} onClick={() => set("done", `Done: ${p.title}`)}>Done</button>}
        {p.status === "done"
          ? <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={pending} onClick={() => set("idea", `Back on the plan: ${p.title}`)}>Put back</button>
          : <button type="button" className="pt-todo__editbtn" onClick={() => setEditing(true)}>Change</button>}
      </span>
    </li>
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
                  <ul className="pt-plan__cards">{list.map((p) => <Card key={p.id} p={p} />)}</ul>
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
            <ul className="pt-plan__cards is-done">{done.map((p) => <Card key={p.id} p={p} />)}</ul>
          ) : (
            <p className="pt-todo__empty">Nothing ticked off yet. It&rsquo;ll be worth seeing what&rsquo;s here in a year.</p>
          )}
        </details>
      </div>
    </Ctx.Provider>
  );
}
