"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTodo, deleteTodo, editTodo, logContact, markLostTodo, markWon, renameList, saveLists, setOffice, tickTodo, type TodoResult } from "@/app/portal/todo/actions";
import { customerIn, dueState, dueWords, firstName, isQuoteList, jobNumberIn, phoneIn, quickDays, shiftDay, type Person, type Todo } from "@/lib/todos/types";
import { HOW_LABEL, LOST_REASONS, type TouchHow } from "@/lib/pipeline/types";

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
  /** Every list, this board's and the other's, so a list keeps its colour on both. */
  allLists?: string[];
  /**
   * Account to-dos: the lists are the ones the portal writes to, so they
   * aren't added, moved, renamed or taken away from here.
   */
  fixed?: boolean;
  /**
   * Marketing's board: one list that isn't saved with people's, so changing
   * the lists here would rewrite theirs. Cards work as anywhere else.
   */
  locked?: boolean;
  /** The ServiceTitan job id of each to-do that names a job, for the pop-up's link. */
  jobIds?: Record<string, number>;
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
  run: (fn: () => Promise<TodoResult & { said?: string }>, ok?: string, after?: () => void) => void;
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
  /** Account to-dos: a card opens the pop-up to log a call, rather than the edit form. */
  open: ((t: Todo) => void) | null;
  jobIds: Record<string, number>;
  /** Cards that have just landed on a list, added or moved there: they arrive with a flourish. */
  fresh: Set<string>;
  /** Cards just ticked off, on their way out: first the burst, then they fold away. */
  leaving: Record<string, "pop" | "leave">;
  /** Flag a to-do as important, or take the flag off: shown at once, saved behind. */
  flag: (t: Todo, on: boolean) => void;
  isImportant: (t: Todo) => boolean;
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
  const [important, setImportant] = useState(t?.important ?? false);
  const key = t?.id ?? `new-${list}`;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (t) {
      run(() => editTodo(t.id, { title, notes, dueOn: due, list: onList, important, ...(all && who ? { assigneeId: who } : {}) }), "Saved.", onDone);
    } else {
      const to = all ? who : meId ?? "";
      run(() => addTodo({ title, notes, assigneeId: to, dueOn: due, list: onList, important }), to === meId ? "Added." : `Added to ${firstName(people.find((p) => p.id === to)?.name ?? "their")}'s list.`, onDone);
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
      <label className="td-imp" htmlFor={`td-i-${key}`}>
        <input id={`td-i-${key}`} type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
        <span aria-hidden="true">⚑</span> Important, keep it at the top
      </label>
      <div className="td-formacts">
        <button type="submit" className="qp-btn dark" disabled={pending || !title.trim()}>{t ? "Save" : "Add"}</button>
        <button type="button" className="qp-btn" onClick={onDone}>Cancel</button>
        {t && <button type="button" className="td-del" disabled={pending} onClick={() => { if (confirm(`Delete "${t.title}"?`)) run(() => deleteTodo(t.id), "Deleted."); }}>Delete</button>}
      </div>
    </form>
  );
}

/** Confetti out of the tick: fourteen bits flung round the circle at a spread of distances and spins. */
const BITS = Array.from({ length: 14 }, (_, i) => ({
  a: Math.round(i * (360 / 14) + ((i * 37) % 17) - 8),
  d: 30 + ((i * 53) % 34),
  r: ((i * 71) % 300) - 150,
  c: ["#fff", "var(--rp-gold)", "var(--rp-orange)", "#7fd1a8", "#ff8a80", "#fff"][i % 6],
  w: i % 3 === 0 ? 4 : 6,
}));
function Burst() {
  return (
    <span className="td-burst" aria-hidden="true">
      {BITS.map((b, i) => <i key={i} style={{ ["--a" as string]: `${b.a}deg`, ["--d" as string]: `${b.d}px`, ["--r" as string]: `${b.r}deg`, ["--c" as string]: b.c, ["--w" as string]: `${b.w}px` }} />)}
    </span>
  );
}

function Card({ t, tone, showWho }: { t: Todo; tone: string; showWho: boolean }) {
  const { tick, ticked, pending, name, meId, today, setDrag, drag, open, fresh, leaving, flag, isImportant } = useContext(Ctx);
  const imp = isImportant(t);
  const going = leaving[t.id];
  const [editing, setEditing] = useState(false);
  const isDone = ticked[t.id] ?? !!t.doneAt;
  const state = isDone ? "done" : dueState(t, today);
  const whoName = t.assigneeId === meId ? "You" : firstName(name.get(t.assigneeId ?? "") ?? "");
  const from = t.createdById && t.createdById !== t.assigneeId ? firstName(t.createdBy ?? name.get(t.createdById) ?? "") : null;
  if (editing) return <li className="td-cardw"><TodoForm t={t} list={t.list ?? ""} forId={t.assigneeId ?? ""} onDone={() => setEditing(false)} /></li>;
  return (
    <li className={`td-cardw${going === "leave" ? " is-leaving" : ""}`}>
      <div
        className={`td-card t-${tone} is-${state}${imp ? " is-important" : ""}${drag === t.id ? " dragging" : ""}${fresh.has(t.id) ? " is-fresh" : ""}${going ? " is-popping" : ""}`}
        draggable={!isDone}
        onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; setDrag(t.id); }}
        onDragEnd={() => setDrag(null)}
      >
        <div className="td-top">
          <span className="td-tags">
            {imp && !isDone && <span className="td-imptag">⚑ Important</span>}
            <span className={`td-due is-${state}`}>{state === "overdue" ? "⚑ " : ""}{isDone ? "Done" : dueWords(t, today)}</span>
          </span>
          {!isDone && (
            <button type="button" className={`td-flag${imp ? " on" : ""}`} aria-pressed={imp} disabled={pending}
              aria-label={imp ? `Not important: ${t.title}` : `Important: ${t.title}`} title={imp ? "Take the important flag off" : "Flag as important, to the top"}
              onClick={() => flag(t, !imp)}>
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill={imp ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
            </button>
          )}
          <button
            type="button" role="checkbox" aria-checked={isDone} className="td-tick" disabled={pending}
            aria-label={`${isDone ? "Not done" : "Done"}: ${t.title}`} onClick={() => tick(t, !isDone)}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            {going && <Burst />}
          </button>
        </div>
        <button type="button" className="td-body" onClick={() => (open ? open(t) : setEditing(true))} aria-label={`${open ? "Log a call" : "Edit"}: ${t.title}`}>
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

/** What can happen when someone's rung about an account to-do: the Pipeline's own words. */
const HOWS: TouchHow[] = ["call", "no_answer", "text", "email"];

/**
 * Account to-dos › a card's pop-up: ring them from here, then say what
 * happened and either tick it off or pick the day to try again. A quote's
 * call is logged on the Pipeline as well (logContact). Edit is still here for
 * changing the to-do itself.
 */
function ContactPanel({ t, onClose }: { t: Todo; onClose: () => void }) {
  const { run, pending, today, jobIds } = useContext(Ctx);
  const [how, setHow] = useState<TouchHow | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [next, setNext] = useState(shiftDay(today, 2));
  const [editing, setEditing] = useState(false);
  const [lost, setLost] = useState(false);
  const [reason, setReason] = useState<string>(LOST_REASONS[0]);
  const quote = isQuoteList(t.list);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);
  const phone = phoneIn(t);
  const job = jobNumberIn(t);
  const jobId = jobIds[t.id];
  const customer = jobId ? null : customerIn(t);
  const days = [
    { label: "Tomorrow", iso: shiftDay(today, 1) },
    { label: "In 2 days", iso: shiftDay(today, 2) },
    { label: "In 4 days", iso: shiftDay(today, 4) },
    { label: "Next week", iso: shiftDay(today, 7) },
  ];
  const nextWords = new Date(`${next}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const state = dueState(t, today);
  return (
    <div className="qp-scrim mid" onClick={onClose}>
      <div className="qp-panel mid td-contact" role="dialog" aria-modal="true" aria-labelledby="td-contact-h" onClick={(e) => e.stopPropagation()}>
        <div className="qp-ph">
          <span>{t.list ?? "To-do"} · <span className={`td-due is-${state}`}>{state === "overdue" ? "⚑ " : ""}{dueWords(t, today)}</span></span>
          <button type="button" className="qp-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <h2 id="td-contact-h" className="rl-h">{t.title}</h2>
        {editing ? (
          <TodoForm t={t} list={t.list ?? ""} forId={t.assigneeId ?? ""} onDone={() => setEditing(false)} />
        ) : (
          <>
            {t.notes && <p className="td-cnotes">{t.notes}</p>}
            {(phone || jobId || customer) && (
              <div className="qp-links">
                {phone && <a className="qp-btn dark" href={`tel:${phone}`}>Call {phone}</a>}
                {jobId && <a className="qp-btn" href={`https://go.servicetitan.com/#/Job/Index/${jobId}`} target="_blank" rel="noreferrer">Job #{job} in ServiceTitan ↗</a>}
                {/* A quote written on the customer has no job yet: their record is where it is. */}
                {customer && <a className="qp-btn" href={`https://go.servicetitan.com/#/Customer/${customer}`} target="_blank" rel="noreferrer">Customer in ServiceTitan ↗</a>}
              </div>
            )}
            {quote && (
              <div className="td-outcome">
                <span>Did they go ahead?</span>
                <button type="button" className="qp-btn good" disabled={pending} onClick={() => run(() => markWon({ id: t.id, note }), "Won, waiting on payment. It moves on once ServiceTitan marks it sold.", onClose)}>✓ Won, to be paid</button>
                <button type="button" className="qp-btn line" aria-expanded={lost} onClick={() => setLost((v) => !v)}>× Lost</button>
                {lost && (
                  <div className="td-lost">
                    <select id="td-lost-why" className="qp-date" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Why it was lost">
                      {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button type="button" className="qp-btn bad" disabled={pending} onClick={() => run(() => markLostTodo({ id: t.id, reason, note }), "Marked lost.", onClose)}>Mark it lost</button>
                    <span className="qp-note">Dismissed in ServiceTitan too, with the reason on the job. The note below goes with it.</span>
                  </div>
                )}
              </div>
            )}
            <form className="qp-form" onSubmit={(e) => {
              e.preventDefault();
              run(() => logContact({ id: t.id, how, note, nextOn: done ? null : next, done }), done ? "Done, and off the list." : `Moved to ${nextWords}.`, onClose);
            }}>
              <fieldset>
                <legend>What happened?</legend>
                <div className="qp-opts">
                  {HOWS.map((h) => <button key={h} type="button" className={how === h ? "on" : undefined} aria-pressed={how === h} onClick={() => setHow(how === h ? null : h)}>{HOW_LABEL[h]}</button>)}
                </div>
              </fieldset>
              <label className="qp-field"><span>Note <em>optional</em></span>
                <textarea id="td-contact-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paying Friday, or call after 3" maxLength={300} rows={2} />
              </label>
              <fieldset>
                <legend>What now?</legend>
                <div className="qp-opts">
                  <button type="button" className={done ? "on" : undefined} aria-pressed={done} onClick={() => setDone(true)}>✓ All done</button>
                  {days.map((d) => (
                    <button key={d.label} type="button" className={!done && next === d.iso ? "on" : undefined} aria-pressed={!done && next === d.iso} onClick={() => { setDone(false); setNext(d.iso); }}>{d.label}</button>
                  ))}
                  <input id="td-contact-next" className="qp-date" type="date" value={next} min={today} onChange={(e) => { setDone(false); setNext(e.target.value); }} aria-label="Or pick a day to follow up" />
                </div>
              </fieldset>
              <div className="qp-acts">
                <button type="submit" className="qp-btn dark" disabled={pending}>{pending ? "Saving…" : done ? "Save and tick it off" : `Save, follow up ${nextWords}`}</button>
                <button type="button" className="qp-btn line" onClick={() => setEditing(true)}>Edit the to-do</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
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
export function TodoBoard({ todos, done, people, office, meId, all, admin, today, lists: savedLists, allLists, fixed, locked, jobIds }: Props) {
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
  // The order is moved here at once and saved behind it, so a list doesn't
  // jump back to where it was for the second the save takes.
  const [lists, setLists] = useState(savedLists);
  useEffect(() => setLists(savedLists), [savedLists]);
  const [colDrag, setColDrag] = useState<string | null>(null);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 4500); return () => clearTimeout(t); }, [msg]);
  const name = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);

  const [contact, setContact] = useState<Todo | null>(null);
  const run = (fn: () => Promise<TodoResult & { said?: string }>, ok?: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      // `said` is something worth knowing about how it went (a quote that didn't reach the Pipeline).
      setMsg(r.ok ? (r.said ? { ok: true, text: r.said } : ok ? { ok: true, text: ok } : null) : { ok: false, text: r.error ?? "Couldn't do that." });
      if (r.ok) after?.();
      router.refresh();
    });
  // Ticked off: the card stays on the board long enough to celebrate and fold
  // away, even if the refresh that drops it from the list comes back first.
  const [leaving, setLeaving] = useState<Record<string, "pop" | "leave">>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const isImportant = (t: Todo) => flagged[t.id] ?? t.important;
  const flag = (t: Todo, on: boolean) => {
    setFlagged((s) => ({ ...s, [t.id]: on }));
    // Up to the top with the same arrival as a new one, so the eye follows it.
    if (on) { setFresh((f) => new Set([...f, t.id])); setTimeout(() => setFresh((f) => new Set([...f].filter((id) => id !== t.id))), 1600); }
    run(() => editTodo(t.id, { important: on }), on ? "Flagged, it's at the top." : "Flag taken off.");
  };
  const [gone, setGone] = useState<Record<string, Todo>>({});
  const tick = (t: Todo, d: boolean) => {
    if (d) {
      setLeaving((s) => ({ ...s, [t.id]: "pop" }));
      setGone((s) => ({ ...s, [t.id]: t }));
      setTimeout(() => setLeaving((s) => (s[t.id] ? { ...s, [t.id]: "leave" } : s)), 650);
      setTimeout(() => {
        setLeaving((s) => { const n = { ...s }; delete n[t.id]; return n; });
        setGone((s) => { const n = { ...s }; delete n[t.id]; return n; });
      }, 1150);
    }
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

  // What just landed on a list: a to-do added, or moved from another list.
  // Measured against what was on the board last time, not on the first
  // draw, so opening the page doesn't set every card off. Kept a moment
  // and then let go, so a later redraw can't cut the arrival short.
  const placed = useRef<Map<string, string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const where = live.map((t) => `${t.id}:${listOf(t)}`).join("|");
  useEffect(() => {
    const now = new Map(live.map((t) => [t.id, listOf(t)]));
    const before = placed.current;
    placed.current = now;
    if (!before) return;
    const landed = [...now].filter(([id, l]) => before.get(id) !== l).map(([id]) => id);
    if (!landed.length) return;
    setFresh((f) => new Set([...f, ...landed]));
    const t = setTimeout(() => setFresh((f) => new Set([...f].filter((id) => !landed.includes(id)))), 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `where` is the board's placement, which is all this watches
  }, [where]);

  const moveList = (l: string, to: number) => {
    const next = lists.filter((x) => x !== l);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, l);
    if (next.join("\n") === lists.join("\n")) return;
    setLists(next);
    run(() => saveLists(next), "Order saved.");
  };

  const dropOn = (l: string) => {
    const t = live.find((x) => x.id === drag);
    setDrag(null);
    setOver(null);
    if (!t || listOf(t) === l) return;
    setMoved((m) => ({ ...m, [t.id]: l }));
    run(() => editTodo(t.id, { list: l }), `Moved to ${l}.`);
  };

  // Who may change the lists themselves, as opposed to what's on them.
  const shape = all && !fixed && !locked;
  const toneOf = (l: string, i: number) => TONES[Math.max(0, (allLists ?? lists).indexOf(l) >= 0 ? (allLists ?? lists).indexOf(l) : i) % TONES.length];
  const shared: Shared = { run, pending, ticked, tick, name, people, all, meId, today, lists, drag, setDrag, open: fixed ? setContact : null, jobIds: jobIds ?? {}, fresh, leaving, flag, isImportant };
  const doneShown = done.filter(mine);
  const [officePick, setOfficePick] = useState<string[]>(office);
  const [showDone, setShowDone] = useState(false);

  return (
    <Ctx.Provider value={shared}>
      {contact && <ContactPanel key={contact.id} t={contact} onClose={() => setContact(null)} />}
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
          {shape && lists.length < 5 && (
            <span className="td-newwrap">
              <button type="button" className={`qp-chip td-newchip${newList != null ? " on" : ""}`} aria-expanded={newList != null} aria-controls="td-newpop" onClick={() => setNewList(newList == null ? "" : null)}>
                <span aria-hidden="true">+</span> New list
              </button>
              {newList != null && (
                <form id="td-newpop" className="td-form td-newpop" onKeyDown={(e) => { if (e.key === "Escape") setNewList(null); }}
                  onSubmit={(e) => { e.preventDefault(); if (newList.trim()) run(() => saveLists([...lists, newList.trim()]), "List added.", () => setNewList(null)); }}>
                  <label htmlFor="td-newlist">A column of its own</label>
                  <input id="td-newlist" value={newList} onChange={(e) => setNewList(e.target.value)} placeholder="e.g. Marketing" maxLength={40} required autoFocus />
                  <div className="td-formacts">
                    <button type="submit" className="qp-btn dark" disabled={pending || !newList.trim()}>Add list</button>
                    <button type="button" className="qp-btn" onClick={() => setNewList(null)}>Cancel</button>
                  </div>
                </form>
              )}
            </span>
          )}
          <button type="button" className={`qp-chip td-donebtn${showDone ? " on" : ""}`} aria-pressed={showDone} onClick={() => setShowDone((v) => !v)}>Done this week · {doneShown.length}</button>
        </div>
        {all && view !== "all" && view !== meId && <p className="qp-note">Anything you add here goes on {firstName(name.get(view) ?? "their")}&rsquo;s list.</p>}

        <div className="td-board">
          {lists.map((l, i) => {
            const tone = toneOf(l, i);
            // Flagged important at the top; then soonest due first, through to
            // the latest; on the same day, newest first so what was just added
            // is in front of you.
            const items = [...shown, ...Object.values(gone).filter((g) => !shown.some((t) => t.id === g.id) && mine(g))]
              .filter((t) => listOf(t) === l)
              .sort((a, b) => Number(isImportant(b)) - Number(isImportant(a)) || a.dueOn.localeCompare(b.dueOn) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
            const can = !!drag && live.find((x) => x.id === drag)?.list !== l;
            return (
              <section
                key={l} className={`qp-col td-col t-${tone}${drag ? (can ? " can" : "") : ""}${over === l ? " over" : ""}`} aria-labelledby={`td-h-${i}`}
                onDragOver={(e) => { if (drag || (colDrag && colDrag !== l)) { e.preventDefault(); if (over !== l) setOver(l); } }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === l ? null : o)); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (colDrag) { const c = colDrag; setColDrag(null); setOver(null); moveList(c, i); }
                  else dropOn(l);
                }}
              >
                <header
                  className={`qp-colh${shape ? " td-grab" : ""}${colDrag === l ? " dragging" : ""}`}
                  draggable={shape && renaming !== l}
                  onDragStart={(e) => { if (!shape) return; setColDrag(l); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", l); }}
                  onDragEnd={() => { setColDrag(null); setOver(null); }}
                  title={shape ? "Drag to move this list" : undefined}
                >
                  <i className={`qp-dot td-dot t-${tone}`} aria-hidden="true" />
                  {renaming === l ? (
                    <form className="td-rename" onSubmit={(e) => { e.preventDefault(); if (newName.trim() && newName.trim() !== l) run(() => renameList(l, newName), "Renamed.", () => setRenaming(null)); else setRenaming(null); }}>
                      <input id={`td-rn-${i}`} value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} aria-label={`New name for ${l}`} autoFocus onBlur={() => setRenaming(null)} />
                    </form>
                  ) : shape ? (
                    <h2 id={`td-h-${i}`}><button type="button" className="td-hbtn" title="Rename this list" onClick={() => { setRenaming(l); setNewName(l); }}>{l}</button></h2>
                  ) : <h2 id={`td-h-${i}`}>{l}</h2>}
                  <span className="qp-n">{items.length}</span>
                  <span className="td-colacts">
                    {shape && lists.length > 1 && (
                      <span className="td-order" role="group" aria-label={`Move the ${l} list`}>
                        <button type="button" className="td-round td-arrow" aria-label={`Move ${l} left`} title="Move left" disabled={i === 0 || pending} onClick={() => moveList(l, i - 1)}>‹</button>
                        <button type="button" className="td-round td-arrow" aria-label={`Move ${l} right`} title="Move right" disabled={i === lists.length - 1 || pending} onClick={() => moveList(l, i + 1)}>›</button>
                      </span>
                    )}
                    {shape && !items.length && lists.length > 1 && (
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
