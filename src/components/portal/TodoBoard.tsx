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

/** A day: today, tomorrow, Friday, next Monday, or one picked off a calendar. */
function When({ id, value, onChange, today }: { id: string; value: string; onChange: (v: string) => void; today: string }) {
  const quick = quickDays(today);
  const picked = !quick.some((d) => d.iso === value);
  const [custom, setCustom] = useState(picked);
  return (
    <span className="pt-td__when">
      <select id={id} aria-label="When" value={custom ? "pick" : value} onChange={(e) => {
        if (e.target.value === "pick") setCustom(true);
        else { setCustom(false); onChange(e.target.value); }
      }}>
        {quick.map((d) => <option key={d.label} value={d.iso}>{d.label}</option>)}
        <option value="pick">Pick a day…</option>
      </select>
      {custom && <input type="date" value={value} onChange={(e) => onChange(e.target.value)} required aria-label="Day" />}
    </span>
  );
}

type Shared = {
  run: (fn: () => Promise<TodoResult>, ok?: string, after?: () => void) => void;
  pending: boolean;
  ticked: Record<string, boolean>;
  tick: (t: Todo, done: boolean) => void;
  name: Map<string, string>;
  people: Person[];
  all: boolean;
  meId: string | null;
  today: string;
};
/** Through context so Item lives at the top level: declared inside the board it would remount, and lose a half-typed edit, on every redraw. */
const Ctx = createContext<Shared>(null as unknown as Shared);

function Item({ t, showWho }: { t: Todo; showWho: boolean }) {
  const { run, pending, ticked, tick, name, people, all, meId, today } = useContext(Ctx);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(t.title);
  const [due, setDue] = useState(t.dueOn);
  const [who, setWho] = useState(t.assigneeId ?? "");
  const isDone = ticked[t.id] ?? !!t.doneAt;
  const state = isDone ? "done" : dueState(t, today);
  const from = t.createdById && t.createdById !== t.assigneeId ? firstName(t.createdBy ?? name.get(t.createdById) ?? "") : null;
  const whoName = t.assigneeId === meId ? "you" : firstName(name.get(t.assigneeId ?? "") ?? "—");

  if (editing) {
    return (
      <li className="pt-td__item is-editing">
        <form className="pt-td__editform" onSubmit={(e) => { e.preventDefault(); run(() => editTodo(t.id, { title, dueOn: due, ...(all && who ? { assigneeId: who } : {}) }), "Saved.", () => setEditing(false)); }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} required aria-label="What needs doing" />
          {all && (
            <select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Whose list">
              {people.map((p) => <option key={p.id} value={p.id}>{p.id === meId ? "Me" : p.name}</option>)}
            </select>
          )}
          <When id={`w-${t.id}`} value={due} onChange={setDue} today={today} />
          <span className="pt-td__editacts">
            <button type="submit" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending}>Save</button>
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className="pt-todo__remove" disabled={pending} onClick={() => { if (confirm(`Delete "${t.title}"?`)) run(() => deleteTodo(t.id), "Deleted."); }}>Delete</button>
          </span>
        </form>
      </li>
    );
  }

  return (
    <li className={`pt-td__item is-${state}`}>
      <button
        type="button" role="checkbox" aria-checked={isDone} className="pt-todo__tick" disabled={pending}
        aria-label={`${isDone ? "Not done" : "Done"}: ${t.title}`} onClick={() => tick(t, !isDone)}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </button>
      <span className="pt-td__title">{t.title}</span>
      <span className="pt-td__meta">
        {showWho && <span className="pt-td__who">{whoName}</span>}
        {from && <span>from {from}</span>}
        <span className={`pt-td__due is-${state}`}>{state === "overdue" ? "⚑ " : ""}{isDone ? "Done" : dueWords(t, today).replace(/^Due /, "").replace(/^./, (c) => c.toUpperCase())}</span>
        {!isDone && <button type="button" className="pt-todo__editbtn" onClick={() => setEditing(true)} aria-label={`Edit: ${t.title}`}>Edit</button>}
      </span>
    </li>
  );
}

/**
 * The to-do list, as plain as it can be: one line to add something, one list
 * to work through. Late things at the top with a flag, then today, then
 * later. The office can switch to anyone's list, or everyone's at once.
 */
export function TodoBoard({ todos, done, people, office, meId, all, admin, today }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
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
    run(() => tickTodo(t.id, d), d ? "Done." : "Back on the list.");
  };

  // Whose list is showing. The office can look at anyone's; everyone else sees their own.
  const officePeople = people.filter((p) => office.includes(p.id)).sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : a.name.localeCompare(b.name)));
  const others = people.filter((p) => !office.includes(p.id) && todos.some((t) => t.assigneeId === p.id));
  const [view, setView] = useState<string>(meId ?? "all");
  const lateOf = (pid: string | "all") => todos.filter((t) => (pid === "all" || t.assigneeId === pid) && dueState(t, today) === "overdue").length;

  const shownTodos = (all ? (view === "all" ? todos : todos.filter((t) => t.assigneeId === view)) : todos.filter((t) => t.assigneeId === meId)).sort(byUrgency);
  const gave = !all ? todos.filter((t) => t.assigneeId !== meId).sort(byUrgency) : [];
  const groups = [
    { k: "late", label: "Overdue", items: shownTodos.filter((t) => dueState(t, today) === "overdue") },
    { k: "today", label: "Today", items: shownTodos.filter((t) => dueState(t, today) === "today") },
    { k: "later", label: "Later", items: shownTodos.filter((t) => ["soon", "later"].includes(dueState(t, today))) },
  ];

  // Adding: what, for whom, when.
  const [title, setTitle] = useState("");
  const [forId, setForId] = useState(meId ?? officePeople[0]?.id ?? "");
  const [due, setDue] = useState(today);
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const who = all ? forId : meId ?? "";
    run(() => addTodo({ title, assigneeId: who, dueOn: due }), who === meId ? "Added." : `Added to ${firstName(name.get(who) ?? "their")}'s list.`, () => setTitle(""));
  };

  const [officePick, setOfficePick] = useState<string[]>(office);
  const shared: Shared = { run, pending, ticked, tick, name, people, all, meId, today };
  const showWho = all && view === "all";
  const doneShown = all && view !== "all" ? done.filter((t) => t.assigneeId === view) : all ? done : done.filter((t) => t.assigneeId === meId);

  return (
    <Ctx.Provider value={shared}>
      <div className="pt-td">
        <form className="pt-td__add" onSubmit={add}>
          <input id="todo-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a to-do…" maxLength={300} required aria-label="What needs doing" />
          {all && (
            <select id="todo-for" value={forId} onChange={(e) => setForId(e.target.value)} aria-label="Whose list">
              {officePeople.map((p) => <option key={p.id} value={p.id}>{p.id === meId ? "Me" : firstName(p.name)}</option>)}
              {people.filter((p) => !office.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <When id="todo-due" value={due} onChange={setDue} today={today} />
          <button type="submit" className="pt-btn pt-btn--orange" disabled={pending || !title.trim()}>Add</button>
        </form>
        {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}

        {all && (
          <nav className="pt-td__people" aria-label="Whose list">
            {[...(meId ? [{ id: meId, label: "Mine" }] : []), ...officePeople.filter((p) => p.id !== meId).map((p) => ({ id: p.id, label: firstName(p.name) })), ...others.map((p) => ({ id: p.id, label: firstName(p.name) })), { id: "all", label: "Everyone" }]
              .map((o) => {
                const late = lateOf(o.id);
                return (
                  <button key={o.id} type="button" className={`pt-td__pill${view === o.id ? " is-on" : ""}`} aria-pressed={view === o.id} onClick={() => setView(o.id)}>
                    {o.label}{late > 0 && <span className="pt-td__late" aria-label={`${late} overdue`}>⚑ {late}</span>}
                  </button>
                );
              })}
          </nav>
        )}

        <section className="pt-panel pt-td__list" aria-label="To-dos">
          {shownTodos.length === 0 ? (
            <p className="pt-td__empty">Nothing to do{all && view !== meId && view !== "all" ? ` for ${firstName(name.get(view) ?? "them")}` : ""}. </p>
          ) : groups.filter((g) => g.items.length).map((g) => (
            <div key={g.k} className={`pt-td__group is-${g.k}`}>
              <h2 className="pt-td__gh">{g.label} <span>{g.items.length}</span></h2>
              <ul>{g.items.map((t) => <Item key={t.id} t={t} showWho={showWho} />)}</ul>
            </div>
          ))}
          {gave.length > 0 && (
            <div className="pt-td__group">
              <h2 className="pt-td__gh">You gave to others <span>{gave.length}</span></h2>
              <ul>{gave.map((t) => <Item key={t.id} t={t} showWho />)}</ul>
            </div>
          )}
        </section>

        <details className="pt-td__more">
          <summary>Done this week · {doneShown.length}</summary>
          {doneShown.length ? <ul className="pt-td__donelist">{doneShown.map((t) => <Item key={t.id} t={t} showWho={all} />)}</ul> : <p className="pt-td__empty">Nothing ticked off this week.</p>}
        </details>

        {admin && (
          <details className="pt-td__more">
            <summary>Who&rsquo;s in the office</summary>
            <p className="pt-panel__sub">The office can see and add to everyone&rsquo;s list. Everyone else sees their own.</p>
            <div className="pt-todo__pick">
              {people.map((p) => (
                <label key={p.id} className="pt-todo__pickrow">
                  <input type="checkbox" checked={officePick.includes(p.id)} onChange={(e) => setOfficePick((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))} />
                  {p.name}
                </label>
              ))}
            </div>
            <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending} onClick={() => run(() => setOffice(officePick), "Saved.")}>Save</button>
          </details>
        )}
      </div>
    </Ctx.Provider>
  );
}
