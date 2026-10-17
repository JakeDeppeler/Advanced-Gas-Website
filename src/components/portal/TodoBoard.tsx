"use client";

import { createContext, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTodo, deleteTodo, editTodo, renameList, saveLists, setOffice, tickTodo, type TodoResult } from "@/app/portal/todo/actions";
import { dueState, dueWords, firstName, quickDays, type Person, type Todo } from "@/lib/todos/types";

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
  /** The lists across the page, in order. */
  lists: string[];
};

/** Each list's colour, in turn, as the pipeline's columns have theirs. */
const TONES = ["gold", "forest", "orange", "dark"] as const;

/** A day: today, tomorrow, Friday, next Monday, or one picked off a calendar. */
function When({ id, value, onChange, today }: { id: string; value: string; onChange: (v: string) => void; today: string }) {
  const quick = quickDays(today);
  const picked = !quick.some((d) => d.iso === value);
  const [custom, setCustom] = useState(picked);
  return (
    <span className="td-when">
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
  lists: string[];
  drag: string | null;
  setDrag: (id: string | null) => void;
};
/** Through context so the cards live at the top level: declared inside the board they would remount, and lose a half-typed edit, on every redraw. */
const Ctx = createContext<Shared>(null as unknown as Shared);

/** The form for a new to-do or a change to one: a header, a description, whose, when, which list. */
function TodoForm({ t, list, forId, onDone }: { t?: Todo; list: string; forId: string; onDone: () => void }) {
  const { run, pending, people, all, meId, today, lists } = useContext(Ctx);
  const [title, setTitle] = useState(t?.title ?? "");
  const [notes, setNotes] = useState(t?.notes ?? "");
  const [who, setWho] = useState(t?.assigneeId ?? forId);
  const [due, setDue] = useState(t?.dueOn ?? today);
  const [onList, setOnList] = useState(t ? t.list ?? lists[0] : list);
  const key = t?.id ?? `new-${list}`;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (t) {
      run(() => editTodo(t.id, { title, notes, dueOn: due, list: onList, ...(all && who ? { assigneeId: who } : {}) }), "Saved.", onDone);
    } else {
      const to = all ? who : meId ?? "";
      run(() => addTodo({ title, notes, assigneeId: to, dueOn: due, list: onList }), to === meId ? "Added." : `Added to ${firstName(people.find((p) => p.id === to)?.name ?? "their")}'s list.`, onDone);
    }
  };
  return (
    <form className="td-form" onSubmit={submit}>
      <input id={`td-t-${key}`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing" maxLength={300} required aria-label="What needs doing" autoFocus />
      <textarea id={`td-n-${key}`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="A line or two about it (optional)" maxLength={2000} rows={2} aria-label="Description" />
      <div className="td-formrow">
        {all && (
          <select id={`td-w-${key}`} value={who} onChange={(e) => setWho(e.target.value)} aria-label="Whose list">
            {people.map((p) => <option key={p.id} value={p.id}>{p.id === meId ? "Me" : p.name}</option>)}
          </select>
        )}
        <When id={`td-d-${key}`} value={due} onChange={setDue} today={today} />
        {t && (
          <select id={`td-l-${key}`} value={onList} onChange={(e) => setOnList(e.target.value)} aria-label="Which list">
            {lists.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
      </div>
      <div className="td-formacts">
        <button type="submit" className="qp-btn dark" disabled={pending || !title.trim()}>{t ? "Save" : "Add"}</button>
        <button type="button" className="qp-btn" onClick={onDone}>Cancel</button>
        {t && <button type="button" className="td-del" disabled={pending} onClick={() => { if (confirm(`Delete "${t.title}"?`)) run(() => deleteTodo(t.id), "Deleted."); }}>Delete</button>}
      </div>
    </form>
  );
}

function Card({ t, tone, showWho }: { t: Todo; tone: string; showWho: boolean }) {
  const { tick, ticked, pending, name, meId, today, setDrag, drag } = useContext(Ctx);
  const [editing, setEditing] = useState(false);
  const isDone = ticked[t.id] ?? !!t.doneAt;
  const state = isDone ? "done" : dueState(t, today);
  const whoName = t.assigneeId === meId ? "You" : firstName(name.get(t.assigneeId ?? "") ?? "");
  const from = t.createdById && t.createdById !== t.assigneeId ? firstName(t.createdBy ?? name.get(t.createdById) ?? "") : null;
  if (editing) return <li className="td-cardw"><TodoForm t={t} list={t.list ?? ""} forId={t.assigneeId ?? ""} onDone={() => setEditing(false)} /></li>;
  return (
    <li className="td-cardw">
      <div
        className={`td-card t-${tone} is-${state}${drag === t.id ? " dragging" : ""}`}
        draggable={!isDone}
        onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; setDrag(t.id); }}
        onDragEnd={() => setDrag(null)}
      >
        <div className="td-top">
          <span className={`td-due is-${state}`}>{state === "overdue" ? "⚑ " : ""}{isDone ? "Done" : dueWords(t, today)}</span>
          <button
            type="button" role="checkbox" aria-checked={isDone} className="td-tick" disabled={pending}
            aria-label={`${isDone ? "Not done" : "Done"}: ${t.title}`} onClick={() => tick(t, !isDone)}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </button>
        </div>
        <button type="button" className="td-body" onClick={() => setEditing(true)} aria-label={`Edit: ${t.title}`}>
          <b className="td-title">{t.title}</b>
          {t.notes && <span className="td-notes">{t.notes}</span>}
        </button>
        {(showWho || from) && (
          <div className="td-foot">
            {showWho && <span className="td-who"><span className="qp-av" aria-hidden="true">{whoName.slice(0, 1)}</span>{whoName}</span>}
            {from && <span className="td-from">from {from}</span>}
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * The to-do lists, laid out as the pipeline is: a column for each list
 * (Quoting, Advanced Gas, and any the office adds), a card for each to-do
 * with its header and a line about it, and a person picker across the top.
 * Mine first; the office can switch to anyone and add to their list from
 * there. A card drags from one list to another, and the office can add a
 * list or take an empty one away.
 */
export function TodoBoard({ todos, done, people, office, meId, all, admin, today, lists }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [newList, setNewList] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [moved, setMoved] = useState<Record<string, string>>({});
  useEffect(() => setMoved({}), [todos]);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 4500); return () => clearTimeout(t); }, [msg]);
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

  // Whose list is showing: mine first, then the office, then anyone with something on their list.
  const officePeople = people.filter((p) => office.includes(p.id)).sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : a.name.localeCompare(b.name)));
  const others = people.filter((p) => !office.includes(p.id) && todos.some((t) => t.assigneeId === p.id));
  const [view, setView] = useState<string>(meId ?? "all");
  // Two people with one first name (Dean and Dean) get their whole names.
  const chipName = (p: Person) => (people.filter((x) => firstName(x.name) === firstName(p.name)).length > 1 ? p.name : firstName(p.name));
  const lateOf = (pid: string) => todos.filter((t) => (pid === "all" || t.assigneeId === pid) && dueState(t, today) === "overdue").length;
  const live = todos.map((t) => (moved[t.id] ? { ...t, list: moved[t.id] } : t));
  const mine = (t: Todo) => (all ? view === "all" || t.assigneeId === view : t.assigneeId === meId || t.createdById === meId);
  const shown = live.filter(mine);
  const listOf = (t: Todo) => (t.list && lists.includes(t.list) ? t.list : lists[0]);
  const forId = all && view !== "all" ? view : meId ?? "";
  const showWho = all ? view === "all" : true;

  const dropOn = (l: string) => {
    const t = live.find((x) => x.id === drag);
    setDrag(null);
    setOver(null);
    if (!t || listOf(t) === l) return;
    setMoved((m) => ({ ...m, [t.id]: l }));
    run(() => editTodo(t.id, { list: l }), `Moved to ${l}.`);
  };

  const shared: Shared = { run, pending, ticked, tick, name, people, all, meId, today, lists, drag, setDrag };
  const doneShown = done.filter(mine);
  const [officePick, setOfficePick] = useState<string[]>(office);
  const [showDone, setShowDone] = useState(false);

  return (
    <Ctx.Provider value={shared}>
      <div className="td">
        <div className="qp-bar">
          {all && (
            <div className="qp-people" role="group" aria-label="Whose list">
              {[...(meId ? [{ id: meId, label: "Mine" }] : []), ...officePeople.filter((p) => p.id !== meId).map((p) => ({ id: p.id, label: chipName(p) })), ...others.map((p) => ({ id: p.id, label: chipName(p) })), { id: "all", label: "Everyone" }]
                .map((o) => {
                  const late = lateOf(o.id);
                  return (
                    <button key={o.id} type="button" className={`qp-chip${view === o.id ? " on" : ""}`} aria-pressed={view === o.id} onClick={() => setView(o.id)}>
                      {o.id !== "all" && <span className="qp-av" aria-hidden="true">{o.label === "Mine" ? firstName(name.get(meId ?? "") ?? "M").slice(0, 1) : o.label.slice(0, 1)}</span>}
                      {o.label}
                      {late > 0 && <span className="td-late" title={`${late} overdue`}>⚑ {late}</span>}
                    </button>
                  );
                })}
            </div>
          )}
          <button type="button" className={`qp-chip td-donebtn${showDone ? " on" : ""}`} aria-pressed={showDone} onClick={() => setShowDone((v) => !v)}>Done this week · {doneShown.length}</button>
        </div>
        {all && view !== "all" && view !== meId && <p className="qp-note">Anything you add here goes on {firstName(name.get(view) ?? "their")}&rsquo;s list.</p>}

        <div className="td-board">
          {lists.map((l, i) => {
            const tone = TONES[i % TONES.length];
            // Newest first: what was just added is what's in front of you.
            const items = shown.filter((t) => listOf(t) === l).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            const can = !!drag && live.find((x) => x.id === drag)?.list !== l;
            return (
              <section
                key={l} className={`qp-col td-col t-${tone}${drag ? (can ? " can" : "") : ""}${over === l ? " over" : ""}`} aria-labelledby={`td-h-${i}`}
                onDragOver={(e) => { if (drag) { e.preventDefault(); if (over !== l) setOver(l); } }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === l ? null : o)); }}
                onDrop={(e) => { e.preventDefault(); dropOn(l); }}
              >
                <header className="qp-colh">
                  <i className={`qp-dot td-dot t-${tone}`} aria-hidden="true" />
                  {renaming === l ? (
                    <form className="td-rename" onSubmit={(e) => { e.preventDefault(); if (newName.trim() && newName.trim() !== l) run(() => renameList(l, newName), "Renamed.", () => setRenaming(null)); else setRenaming(null); }}>
                      <input id={`td-rn-${i}`} value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} aria-label={`New name for ${l}`} autoFocus onBlur={() => setRenaming(null)} />
                    </form>
                  ) : all ? (
                    <h2 id={`td-h-${i}`}><button type="button" className="td-hbtn" title="Rename this list" onClick={() => { setRenaming(l); setNewName(l); }}>{l}</button></h2>
                  ) : <h2 id={`td-h-${i}`}>{l}</h2>}
                  <span className="qp-n">{items.length}</span>
                  <span className="td-colacts">
                    {all && !items.length && lists.length > 1 && (
                      <button type="button" className="td-round" aria-label={`Take the ${l} list away`} title="Take this list away" onClick={() => { if (confirm(`Take the "${l}" list away?`)) run(() => saveLists(lists.filter((x) => x !== l)), "List taken away."); }}>×</button>
                    )}
                    <button type="button" className="td-round" aria-label={`Add to ${l}`} title={`Add to ${l}`} onClick={() => setAdding(adding === l ? null : l)}>+</button>
                  </span>
                </header>
                <ul className="qp-list td-list">
                  {adding === l && <li className="td-cardw"><TodoForm list={l} forId={forId} onDone={() => setAdding(null)} /></li>}
                  {items.map((t) => <Card key={t.id} t={t} tone={tone} showWho={showWho} />)}
                  {!items.length && adding !== l && <li className="qp-empty">Nothing on {l}.</li>}
                </ul>
              </section>
            );
          })}
          {all && lists.length < 5 && (
            <div className="td-newcol">
              {newList == null ? (
                <button type="button" className="qp-drop td-newbtn" onClick={() => setNewList("")}>
                  <span className="qp-dropi x" aria-hidden="true">+</span>
                  <b>New list</b>
                  <span>a column of its own</span>
                </button>
              ) : (
                <form className="td-form td-newform" onSubmit={(e) => { e.preventDefault(); if (newList.trim()) run(() => saveLists([...lists, newList.trim()]), "List added.", () => setNewList(null)); }}>
                  <input id="td-newlist" value={newList} onChange={(e) => setNewList(e.target.value)} placeholder="e.g. Marketing" maxLength={40} required aria-label="The new list's name" autoFocus />
                  <div className="td-formacts">
                    <button type="submit" className="qp-btn dark" disabled={pending || !newList.trim()}>Add list</button>
                    <button type="button" className="qp-btn" onClick={() => setNewList(null)}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {showDone && (
          <section className="qp-fold" aria-label="Done this week">
            <header className="qp-foldh"><b>Done this week</b><button type="button" className="qp-x" onClick={() => setShowDone(false)} aria-label="Close">×</button></header>
            {doneShown.length ? (
              <ul className="qp-rows">
                {doneShown.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => tick(t, false)} title="Put it back on the list">
                      <b>{t.title}</b>
                      <span>{t.list ?? lists[0]}{all ? ` · ${firstName(name.get(t.assigneeId ?? "") ?? "")}` : ""}</span>
                      <em>put back</em>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="qp-note">Nothing ticked off this week.</p>}
          </section>
        )}

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

        {msg && <p className={`qp-toast${msg.ok ? "" : " bad"}`} role="status">{msg.text}</p>}
      </div>
    </Ctx.Provider>
  );
}
