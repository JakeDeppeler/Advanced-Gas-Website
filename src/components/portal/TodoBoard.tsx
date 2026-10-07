"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTodo, deleteTodo, editTodo, setOffice, tickTodo, type TodoResult } from "@/app/portal/todo/actions";
import { byUrgency, dueState, dueWords, firstName, quickDays, type Person, type Todo } from "@/lib/todos/types";

type Props = {
  todos: Todo[];
  done: Todo[];
  people: Person[];
  office: string[];
  meId: string | null;
  /** Sees and adds to every list. */
  all: boolean;
  /** May change who's in the office. */
  admin: boolean;
  today: string;
};

const FLAG = "M5 21V4M5 4h11l-2.5 4L16 12H5";

function Flag() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={FLAG} />
    </svg>
  );
}

/** The day, with the four quick picks under it. */
function DuePick({ id, value, onChange, today, compact }: { id: string; value: string; onChange: (v: string) => void; today: string; compact?: boolean }) {
  return (
    <div className={`pt-todo__due-pick${compact ? " is-compact" : ""}`}>
      <input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} required aria-label="Due by" />
      <div className="pt-todo__chips" role="group" aria-label="Quick dates">
        {quickDays(today).map((d) => (
          <button key={d.label} type="button" className={`pt-todo__chip${value === d.iso ? " is-on" : ""}`} aria-pressed={value === d.iso} onClick={() => onChange(d.iso)}>
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type Shared = {
  run: (fn: () => Promise<TodoResult>, ok?: string, after?: () => void) => void;
  pending: boolean;
  ticked: Record<string, boolean>;
  tick: (t: Todo, done: boolean) => void;
  name: Map<string, string>;
  people: Person[];
  openOf: (pid: string) => Todo[];
  all: boolean;
  meId: string | null;
  today: string;
};

/**
 * What every item and column needs from the board. Through context rather
 * than props so Item and Column can live at the top level — declared inside
 * the board, React would treat each render's as a new component and throw
 * away a half-typed to-do every time the board redrew.
 */
const Ctx = createContext<Shared>(null as unknown as Shared);

/* ------------------------------------------------------------- one item */
function Item({ t, showWho }: { t: Todo; showWho?: boolean }) {
  const { run, pending, ticked, tick, name, people, all, today } = useContext(Ctx);
  const [editing, setEditing] = useState(false);
  const [eTitle, setETitle] = useState(t.title);
  const [eDue, setEDue] = useState(t.dueOn);
  const [eFor, setEFor] = useState(t.assigneeId ?? "");
  const [eNotes, setENotes] = useState(t.notes ?? "");
  const isDone = ticked[t.id] ?? !!t.doneAt;
  const state = isDone ? "done" : dueState(t, today);
  const from = t.createdById && t.createdById !== t.assigneeId ? firstName(t.createdBy ?? name.get(t.createdById) ?? "") : null;

  if (editing) {
    return (
      <li className="pt-todo__item is-editing">
        <form
          className="pt-todo__edit"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => editTodo(t.id, { title: eTitle, dueOn: eDue, notes: eNotes, ...(all && eFor ? { assigneeId: eFor } : {}) }), "Saved.", () => setEditing(false));
          }}
        >
          <label className="pt-field"><span>What needs doing</span><input value={eTitle} onChange={(e) => setETitle(e.target.value)} maxLength={300} required /></label>
          <div className="pt-field"><span>Due by</span><DuePick id={`due-${t.id}`} value={eDue} onChange={setEDue} today={today} compact /></div>
          {all && (
            <label className="pt-field"><span>Whose list</span>
              <select value={eFor} onChange={(e) => setEFor(e.target.value)}>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          <label className="pt-field"><span>Notes <em>(optional)</em></span><textarea rows={2} value={eNotes} onChange={(e) => setENotes(e.target.value)} maxLength={2000} /></label>
          <div className="pt-todo__editacts">
            <button type="submit" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending}>Save</button>
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setEditing(false)}>Cancel</button>
            <button
              type="button" className="pt-todo__remove" disabled={pending}
              onClick={() => { if (confirm(`Take "${t.title}" off the list?`)) run(() => deleteTodo(t.id), "Taken off the list."); }}
            >
              Remove
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`pt-todo__item is-${state}`}>
      <button
        type="button" role="checkbox" aria-checked={isDone} className="pt-todo__tick" disabled={pending}
        aria-label={`${isDone ? "Not done" : "Done"}: ${t.title}`}
        onClick={() => tick(t, !isDone)}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </button>
      <div className="pt-todo__body">
        <span className="pt-todo__title">{t.title}</span>
        <span className="pt-todo__meta">
          <span className={`pt-todo__due is-${state}`}>
            {state === "overdue" && <Flag />}
            {isDone && t.doneAt ? `Done ${new Date(t.doneAt).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Melbourne" })}${t.doneBy ? ` by ${firstName(t.doneBy)}` : ""}` : dueWords(t, today)}
          </span>
          {showWho && t.assigneeId && <span>for {firstName(name.get(t.assigneeId) ?? "—")}</span>}
          {from && <span>from {from}</span>}
          {/* Under the title rather than beside it, so three lists fit side by side on an iPad. */}
          {!isDone && (
            <button type="button" className="pt-todo__editbtn" onClick={() => setEditing(true)} aria-label={`Change: ${t.title}`}>Change</button>
          )}
        </span>
        {t.notes && <span className="pt-todo__notes">{t.notes}</span>}
      </div>
    </li>
  );
}

/* --------------------------------------------------- a person's column */
function Column({ p, wide }: { p: Person; wide?: boolean }) {
  const { run, pending, openOf, all, meId, today } = useContext(Ctx);
  const list = openOf(p.id);
  const late = list.filter((t) => dueState(t, today) === "overdue").length;
  const dueToday = list.filter((t) => dueState(t, today) === "today").length;
  // Today is what's due today and anything past its day; the rest is under it.
  const now = list.filter((t) => ["overdue", "today"].includes(dueState(t, today)));
  const later = list.filter((t) => !["overdue", "today"].includes(dueState(t, today)));
  const [q, setQ] = useState("");
  const [qDue, setQDue] = useState(today);
  const mine = p.id === meId;
  return (
    <section className={`pt-todo__col${late ? " has-late" : ""}${wide ? " is-wide" : ""}`} aria-labelledby={`col-${p.id}`}>
      <header className="pt-todo__colhead">
        <h3 id={`col-${p.id}`}>{mine ? (wide ? "Your list" : `${firstName(p.name)} · you`) : p.name}</h3>
        <span className="pt-todo__counts">
          {late > 0 && <span className="pt-todo__late"><Flag /> {late} overdue</span>}
          {dueToday > 0 && <span className="pt-todo__today">{dueToday} today</span>}
          <span>{now.length} today{later.length ? ` · ${later.length} coming up` : ""}</span>
        </span>
      </header>
      {now.length ? (
        <ul className="pt-todo__list">{now.map((t) => <Item key={t.id} t={t} />)}</ul>
      ) : (
        <p className="pt-todo__empty">Nothing for {mine ? "you" : firstName(p.name)} today.</p>
      )}
      {later.length > 0 && (
        <>
          <h4 className="pt-todo__later">Coming up · {later.length}</h4>
          <ul className="pt-todo__list is-later">{later.map((t) => <Item key={t.id} t={t} />)}</ul>
        </>
      )}
      {(all || mine) && (
        <form
          className="pt-todo__quick"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addTodo({ title: q, assigneeId: p.id, dueOn: qDue }), `Added to ${mine ? "your" : `${firstName(p.name)}'s`} list.`, () => setQ(""));
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Add to ${mine ? "your" : `${firstName(p.name)}'s`} list…`} aria-label={`Add to ${p.name}'s list`} maxLength={300} required />
          {q.trim() && (
            <>
              <DuePick id={`qd-${p.id}`} value={qDue} onChange={setQDue} today={today} compact />
              <button type="submit" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending}>Add</button>
            </>
          )}
        </form>
      )}
    </section>
  );
}

export function TodoBoard({ todos, done, people, office, meId, all, admin, today }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Ticked here, not yet back from the server: drawn done straight away.
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  const name = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);

  const run = (fn: () => Promise<TodoResult>, ok?: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (ok ? { ok: true, text: ok } : null) : { ok: false, text: r.error ?? "Couldn't do that." });
      if (r.ok) after?.();
      router.refresh();
    });

  const tick = (t: Todo, d: boolean) => {
    setTicked((s) => ({ ...s, [t.id]: d }));
    run(() => tickTodo(t.id, d), d ? `Done: ${t.title}` : `Back on the list: ${t.title}`, undefined);
  };

  // The columns: me first, then the rest of the office; the crew below.
  const officePeople = people
    .filter((p) => office.includes(p.id))
    .sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : a.name.localeCompare(b.name)));
  const crew = people.filter((p) => !office.includes(p.id));
  const openOf = (pid: string) => todos.filter((t) => t.assigneeId === pid).sort(byUrgency);
  const orphans = todos.filter((t) => !t.assigneeId || !name.has(t.assigneeId));

  /* ------------------------------------------------------------ add form */
  const [title, setTitle] = useState("");
  const [forId, setForId] = useState(meId ?? officePeople[0]?.id ?? "");
  const [due, setDue] = useState(today);
  const [notes, setNotes] = useState("");
  const [withNotes, setWithNotes] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const who = forId;
    run(
      () => addTodo({ title, assigneeId: who, dueOn: due, notes: withNotes ? notes : undefined }),
      `Added to ${who === meId ? "your" : `${firstName(name.get(who) ?? "their")}'s`} list.`,
      () => { setTitle(""); setNotes(""); setWithNotes(false); },
    );
  };

  const crewWith = crew.filter((p) => openOf(p.id).length > 0);
  const [officePick, setOfficePick] = useState<string[]>(office);

  const shared: Shared = { run, pending, ticked, tick, name, people, openOf, all, meId, today };

  return (
    <Ctx.Provider value={shared}>
    <div className="pt-todo">
      <section className="pt-panel pt-todo__add" aria-labelledby="todo-add-h">
        <h2 id="todo-add-h" className="pt-panel__h">{all ? "Give someone something to do" : "Add a to-do"}</h2>
        <form onSubmit={submit} className={`pt-todo__form${all ? "" : " is-solo"}`}>
          <label className="pt-field pt-todo__what"><span>What needs doing</span>
            <input id="todo-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ring the Smiths back about the ducted quote" maxLength={300} required />
          </label>
          {all ? (
            <label className="pt-field pt-todo__for"><span>Whose list</span>
              <select id="todo-for" value={forId} onChange={(e) => setForId(e.target.value)}>
                <optgroup label="The office">
                  {officePeople.map((p) => <option key={p.id} value={p.id}>{p.id === meId ? `${p.name} (me)` : p.name}</option>)}
                </optgroup>
                {crew.length > 0 && (
                  <optgroup label="The crew">
                    {crew.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </optgroup>
                )}
              </select>
            </label>
          ) : null}
          <div className="pt-field pt-todo__when"><span>Due by</span><DuePick id="todo-due" value={due} onChange={setDue} today={today} /></div>
          {withNotes ? (
            <label className="pt-field pt-todo__notesfield"><span>Notes <em>(optional)</em></span>
              <textarea id="todo-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Anything they'll need: the job number, who to ring, where it's up to." />
            </label>
          ) : (
            <button type="button" className="pt-todo__addnote" onClick={() => setWithNotes(true)}>+ Add a note</button>
          )}
          <div className="pt-todo__submit">
            <button type="submit" className="pt-btn pt-btn--orange" disabled={pending || !title.trim() || !forId}>Add to-do</button>
            {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}
          </div>
        </form>
      </section>

      {all ? (
        <>
          <h2 className="pt-sech">The office</h2>
          {/* One column each, side by side however narrow, until a phone. */}
          <div className="pt-todo__cols is-office" style={{ gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, officePeople.length))}, minmax(0, 1fr))` }}>
            {officePeople.map((p) => <Column key={p.id} p={p} />)}
          </div>

          <h2 className="pt-sech">The crew</h2>
          {crewWith.length ? (
            <div className="pt-todo__cols is-crew">
              {crewWith.map((p) => <Column key={p.id} p={p} />)}
            </div>
          ) : (
            <p className="pt-todo__none">Nothing given to the crew. Pick someone under &ldquo;Whose list&rdquo; above to give them one.</p>
          )}
          {orphans.length > 0 && (
            <section className="pt-panel">
              <h2 className="pt-panel__h">On nobody&rsquo;s list</h2>
              <p className="pt-panel__sub">Given to someone who has since left the team. Change each one to give it to somebody else.</p>
              <ul className="pt-todo__list">{orphans.sort(byUrgency).map((t) => <Item key={t.id} t={t} />)}</ul>
            </section>
          )}
        </>
      ) : meId ? (
        <div className="pt-todo__cols is-one">
          <Column p={{ id: meId, name: name.get(meId) ?? "You" }} wide />
          {todos.some((t) => t.assigneeId !== meId) && (
            <section className="pt-todo__col">
              <header className="pt-todo__colhead"><h3>You gave to others</h3></header>
              <ul className="pt-todo__list">{todos.filter((t) => t.assigneeId !== meId).sort(byUrgency).map((t) => <Item key={t.id} t={t} showWho />)}</ul>
            </section>
          )}
        </div>
      ) : (
        <p className="pt-todo__none">You&rsquo;re not on the team list yet, so there&rsquo;s no list to show. Ask an admin to add you.</p>
      )}

      <details className="pt-panel pt-todo__done">
        <summary>
          <span className="pt-panel__h">Done in the last week</span>
          <span className="pt-todo__counts"><span>{done.length}</span></span>
        </summary>
        {done.length ? (
          <ul className="pt-todo__list">{done.map((t) => <Item key={t.id} t={t} showWho={all} />)}</ul>
        ) : (
          <p className="pt-todo__empty">Nothing ticked off in the last seven days.</p>
        )}
      </details>

      {admin && (
        <details className="pt-panel pt-todo__office">
          <summary><span className="pt-panel__h">Who&rsquo;s in the office</span></summary>
          <p className="pt-panel__sub">
            They each get a column at the top, see every list and can add to anyone&rsquo;s. Everyone else sees their own list
            and what they&rsquo;ve given to others.
          </p>
          <div className="pt-todo__pick">
            {people.map((p) => (
              <label key={p.id} className="pt-todo__pickrow">
                <input
                  type="checkbox" checked={officePick.includes(p.id)}
                  onChange={(e) => setOfficePick((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))}
                />
                {p.name}
              </label>
            ))}
          </div>
          <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending} onClick={() => run(() => setOffice(officePick), "Saved who's in the office.")}>
            Save
          </button>
        </details>
      )}
    </div>
    </Ctx.Provider>
  );
}
