"use client";

import { createContext, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addContact, dropContact, editContact, reachedOut, type ContactResult } from "@/app/portal/keep-in-touch/actions";
import {
  byDue, CADENCE_LABEL, CADENCES, HOWS, howPast, isDue, KINDS, kindLabel, lastWords, touchState, touchWords,
  type Cadence, type Contact, type Touch,
} from "@/lib/contacts/types";
import { daysFrom, firstName, shiftDay, type Person } from "@/lib/todos/types";

type Props = { contacts: Contact[]; touches: Touch[]; owners: Person[]; meId: string | null; today: string };

type Shared = {
  run: (fn: () => Promise<ContactResult>, ok?: string, after?: () => void) => void;
  pending: boolean;
  owners: Person[];
  ownerName: (id: string | null) => string | null;
  touchesOf: (id: string) => Touch[];
  meId: string | null;
  today: string;
};
/** Rows and forms are top-level components reading this, so a half-typed note survives the list redrawing. */
const Ctx = createContext<Shared>(null as unknown as Shared);

type Draft = { name: string; company: string; kind: string; phone: string; email: string; notes: string; ownerId: string; cadence: Cadence };
const draftOf = (c: Contact | null, meId: string | null): Draft => ({
  name: c?.name ?? "", company: c?.company ?? "", kind: c?.kind ?? "", phone: c?.phone ?? "", email: c?.email ?? "",
  notes: c?.notes ?? "", ownerId: c?.ownerId ?? meId ?? "", cadence: c?.cadence ?? "month",
});

/** The fields a contact has, for adding one and for changing one. */
function ContactFields({ d, set, idp }: { d: Draft; set: (p: Partial<Draft>) => void; idp: string }) {
  const { owners, meId } = useContext(Ctx);
  return (
    <>
      <div className="rl-two">
        <label className="qp-field"><span>Name</span><input id={`${idp}-name`} value={d.name} onChange={(e) => set({ name: e.target.value })} maxLength={200} required placeholder="Tom Henley" /></label>
        <label className="qp-field"><span>Company <em>optional</em></span><input id={`${idp}-co`} value={d.company} onChange={(e) => set({ company: e.target.value })} maxLength={200} placeholder="Henley Homes" /></label>
      </div>
      <div className="rl-two">
        <label className="qp-field"><span>What they are</span>
          <select id={`${idp}-kind`} value={d.kind} onChange={(e) => set({ kind: e.target.value })}>
            <option value="">Choose…</option>
            {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </label>
        <label className="qp-field"><span>Who looks after them</span>
          <select id={`${idp}-owner`} value={d.ownerId} onChange={(e) => set({ ownerId: e.target.value })}>
            {owners.map((p) => <option key={p.id} value={p.id}>{p.id === meId ? `${p.name} (me)` : p.name}</option>)}
          </select>
        </label>
      </div>
      <div className="rl-two">
        <label className="qp-field"><span>Phone <em>optional</em></span><input id={`${idp}-ph`} type="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} maxLength={40} placeholder="0400 000 000" /></label>
        <label className="qp-field"><span>Email <em>optional</em></span><input id={`${idp}-em`} type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} maxLength={200} /></label>
      </div>
      <fieldset><legend>How often to reach out</legend>
        <div className="qp-opts">
          {CADENCES.map((c) => (
            <button key={c.key} type="button" className={d.cadence === c.key ? "on" : undefined} aria-pressed={d.cadence === c.key} onClick={() => set({ cadence: c.key })}>{c.label}</button>
          ))}
        </div>
      </fieldset>
      <label className="qp-field"><span>Notes <em>optional</em></span>
        <textarea id={`${idp}-notes`} rows={3} value={d.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={2000} placeholder="What matters to them, what you last talked about, what's coming up." />
      </label>
    </>
  );
}

function AddForm({ onDone }: { onDone: () => void }) {
  const { run, pending, meId, today } = useContext(Ctx);
  const [d, setD] = useState<Draft>(draftOf(null, meId));
  const [lastOn, setLastOn] = useState("");
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  return (
    <form
      className="qp-form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addContact({ ...d, ownerId: d.ownerId || null, kind: d.kind || null, lastOn: lastOn || undefined }), `${d.name.trim()} is on the list.`, onDone);
      }}
    >
      <ContactFields d={d} set={set} idp="kit-new" />
      <label className="qp-field"><span>Last time you spoke <em>blank if not yet, and they&rsquo;re due straight away</em></span>
        <input id="kit-new-last" type="date" value={lastOn} max={today} onChange={(e) => setLastOn(e.target.value)} />
      </label>
      <div className="qp-acts">
        <button type="submit" className="qp-btn dark" disabled={pending || !d.name.trim()}>Add to the list</button>
        <button type="button" className="qp-btn" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

function ReachForm({ c, onDone }: { c: Contact; onDone: () => void }) {
  const { run, pending, today } = useContext(Ctx);
  const [how, setHow] = useState("call");
  const [on, setOn] = useState(today);
  const [note, setNote] = useState("");
  return (
    <form
      className="qp-form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => reachedOut(c.id, { on, how, note }), `Logged: ${HOWS.find((h) => h.key === how)?.past.toLowerCase()} ${c.name}.`, onDone);
      }}
    >
      <fieldset><legend>How</legend>
        <div className="qp-opts">
          {HOWS.map((h) => (
            <button key={h.key} type="button" className={how === h.key ? "on" : undefined} aria-pressed={how === h.key} onClick={() => setHow(h.key)}>{h.label}</button>
          ))}
        </div>
      </fieldset>
      <fieldset><legend>When</legend>
        <div className="qp-opts">
          {[{ l: "Today", v: today }, { l: "Yesterday", v: shiftDay(today, -1) }].map((x) => (
            <button key={x.l} type="button" className={on === x.v ? "on" : undefined} aria-pressed={on === x.v} onClick={() => setOn(x.v)}>{x.l}</button>
          ))}
          <input className="qp-date" id={`kit-on-${c.id}`} type="date" value={on} max={today} onChange={(e) => setOn(e.target.value)} aria-label="When" required />
        </div>
      </fieldset>
      <label className="qp-field"><span>What came of it <em>optional</em></span>
        <textarea id={`kit-note-${c.id}`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Two jobs coming in November; wants a price on the Clyde North spec." />
      </label>
      <div className="qp-acts">
        <button type="submit" className="qp-btn dark" disabled={pending}>Save</button>
        <button type="button" className="qp-btn" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

function EditForm({ c, onDone, onGone }: { c: Contact; onDone: () => void; onGone: () => void }) {
  const { run, pending, meId } = useContext(Ctx);
  const [d, setD] = useState<Draft>(draftOf(c, meId));
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  return (
    <form
      className="qp-form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => editContact(c.id, { ...d, ownerId: d.ownerId || null, kind: d.kind || null }), "Saved.", onDone);
      }}
    >
      <ContactFields d={d} set={set} idp={`kit-${c.id}`} />
      <div className="qp-acts">
        <button type="submit" className="qp-btn dark" disabled={pending || !d.name.trim()}>Save</button>
        <button type="button" className="qp-btn" onClick={onDone}>Cancel</button>
        <button
          type="button" className="td-del" disabled={pending}
          onClick={() => { if (confirm(`Take ${c.name} off the keep-in-touch list? Their history is kept.`)) run(() => dropContact(c.id), `${c.name} is off the list.`, onGone); }}
        >
          Take off the list
        </button>
      </div>
    </form>
  );
}

const ago = (on: string, today: string) => {
  const d = daysFrom(on, today);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : d < 14 ? `${d} days ago` : new Date(`${on}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
};

/** A contact on the board, in its column's colour; the whole card opens them. */
function Card({ c, tone, onOpen }: { c: Contact; tone: string; onOpen: () => void }) {
  const { ownerName, today } = useContext(Ctx);
  const state = touchState(c, today);
  const owner = ownerName(c.ownerId);
  return (
    <li className="td-cardw">
      <button type="button" className={`td-card kt-card t-${tone} is-${state}`} onClick={onOpen} aria-label={`Open ${c.name}`}>
        <span className="td-top"><span className={`td-due is-${state}`}>{state === "overdue" ? "⚑ " : ""}{touchWords(c, today)}</span></span>
        <b className="td-title">{c.name}</b>
        {(c.company || c.kind) && <span className="td-notes">{[c.company, kindLabel(c.kind)].filter(Boolean).join(" · ")}</span>}
        <span className="td-foot">
          <span className="td-who"><span className="qp-av" aria-hidden="true">{(owner ?? "?").slice(0, 1)}</span>{owner ? firstName(owner) : "Nobody"}</span>
          <span className="td-from">{c.lastOn ? `last ${ago(c.lastOn, today)}` : "never yet"}</span>
        </span>
      </button>
    </li>
  );
}

/** One person, in the middle of the screen: who they are, the clock, and log / change / history. */
function ContactPanel({ c, onClose }: { c: Contact; onClose: () => void }) {
  const { ownerName, touchesOf, today } = useContext(Ctx);
  const [mode, setMode] = useState<null | "reach" | "edit">(null);
  const state = touchState(c, today);
  const owner = ownerName(c.ownerId);
  const history = touchesOf(c.id);
  return (
    <>
      <h2 id="kit-panel-h" className="rl-h">{c.name}</h2>
      {c.company && <p className="rl-tagline">{c.company}</p>}
      {mode === "edit" ? <EditForm c={c} onDone={() => setMode(null)} onGone={onClose} />
        : mode === "reach" ? <ReachForm c={c} onDone={() => setMode(null)} />
        : (
          <>
            <dl className="qp-facts">
              <div><dt>Next</dt><dd className={state === "overdue" ? "late" : undefined}>{touchWords(c, today)}</dd></div>
              <div><dt>Last time</dt><dd>{lastWords(c, today)}</dd></div>
              <div><dt>What they are</dt><dd>{kindLabel(c.kind)}</dd></div>
              <div><dt>How often</dt><dd>{CADENCE_LABEL[c.cadence]}</dd></div>
              <div><dt>Looks after them</dt><dd>{owner ?? "Nobody"}</dd></div>
            </dl>
            {(c.phone || c.email) && (
              <div className="qp-links">
                {c.phone && <a className="qp-btn line" href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>Call {c.phone}</a>}
                {c.email && <a className="qp-btn line" href={`mailto:${c.email}`}>Email</a>}
              </div>
            )}
            {c.notes && <p className="pl-notes">{c.notes}</p>}
            <div className="qp-acts">
              <button type="button" className="qp-btn dark" onClick={() => setMode("reach")}>Reached out</button>
              <button type="button" className="qp-btn line" onClick={() => setMode("edit")}>Change</button>
            </div>
            <section className="qp-hist">
              <h3>Every time we&rsquo;ve been in touch</h3>
              {history.length ? (
                <ol>
                  {history.map((t) => (
                    <li key={t.id}>
                      <span className="qp-hwhen">{new Date(`${t.on}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" })}</span>
                      <span><b>{howPast(t.how)}</b>{t.byName ? ` · ${firstName(t.byName)}` : ""}{t.note && <em> · {t.note}</em>}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="qp-note">Nothing logged yet.</p>}
            </section>
          </>
        )}
    </>
  );
}

const COLS = [
  { k: "due", label: "Due now", tone: "orange", empty: "Nobody due. Everyone's been reached out to on time." },
  { k: "soon", label: "This week", tone: "gold", empty: "Nobody due in the next week." },
  { k: "later", label: "Coming up", tone: "forest", empty: "Nobody further out." },
] as const;

export function KeepInTouchBoard({ contacts, touches, owners, meId, today }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [who, setWho] = useState<string>("all");
  const [find, setFind] = useState("");
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); }, [msg]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpenId(null); setAdding(false); } };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);

  const run = (fn: () => Promise<ContactResult>, ok?: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (ok ? { ok: true, text: ok } : null) : { ok: false, text: r.error ?? "Couldn't do that." });
      if (r.ok) after?.();
      router.refresh();
    });

  const names = useMemo(() => new Map(owners.map((p) => [p.id, p.name])), [owners]);
  const byContact = useMemo(() => {
    const m = new Map<string, Touch[]>();
    for (const t of touches) m.set(t.contactId, [...(m.get(t.contactId) ?? []), t]);
    return m;
  }, [touches]);
  const shared: Shared = {
    run, pending, owners, meId, today,
    ownerName: (id) => (id ? names.get(id) ?? null : null),
    touchesOf: (id) => byContact.get(id) ?? [],
  };

  const needle = find.trim().toLowerCase();
  const shown = contacts
    .filter((c) => who === "all" || c.ownerId === who)
    .filter((c) => !needle || [c.name, c.company, c.notes, kindLabel(c.kind)].some((x) => x?.toLowerCase().includes(needle)))
    .sort(byDue);
  const colOf = (c: Contact) => { const s = touchState(c, today); return isDue(s) ? "due" : s === "soon" ? "soon" : "later"; };
  const ids = new Set(shown.map((c) => c.id));
  // The log, newest first: who was last reached, how, and by whom.
  const recent = touches.filter((t) => ids.has(t.contactId)).sort((a, b) => b.on.localeCompare(a.on)).slice(0, 30);
  const nameOf = new Map(contacts.map((c) => [c.id, c]));
  const dueFor = (id: string) => contacts.filter((c) => (id === "all" || c.ownerId === id) && isDue(touchState(c, today))).length;
  const opened = contacts.find((c) => c.id === openId) ?? null;
  const chips = [
    ...(meId ? [{ id: meId, label: "Mine" }] : []),
    // Two people with one first name (Dean and Dean) get their whole names, as on the to-do board.
    ...owners.filter((p) => p.id !== meId).map((p) => ({ id: p.id, label: owners.filter((x) => firstName(x.name) === firstName(p.name)).length > 1 ? p.name : firstName(p.name) })),
    { id: "all", label: "Everyone" },
  ];

  return (
    <Ctx.Provider value={shared}>
      <div className="td">
        <div className="qp-bar">
          <div className="qp-people" role="group" aria-label="Whose">
            {chips.map((o) => {
              const n = dueFor(o.id);
              return (
                <button key={o.id} type="button" className={`qp-chip${who === o.id ? " on" : ""}`} aria-pressed={who === o.id} onClick={() => setWho(o.id)}>
                  {o.id !== "all" && <span className="qp-av" aria-hidden="true">{(o.label === "Mine" ? names.get(meId ?? "") ?? "M" : o.label).slice(0, 1)}</span>}
                  {o.label}
                  {n > 0 && <span className="td-late" title={`${n} due`}>⚑ {n}</span>}
                </button>
              );
            })}
          </div>
          <input className="qp-find kt-find" id="kit-find" type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a name or company" aria-label="Find a name or company" />
          <button type="button" className="qp-btn dark kt-add" onClick={() => setAdding(true)}>+ Add someone</button>
        </div>

        <div className="td-board kt-board">
          {COLS.map((col, i) => {
            const items = shown.filter((c) => colOf(c) === col.k);
            return (
              <section key={col.k} className={`qp-col td-col t-${col.tone}`} aria-labelledby={`kt-h-${i}`}>
                <header className="qp-colh">
                  <i className={`qp-dot td-dot t-${col.tone}`} aria-hidden="true" />
                  <h2 id={`kt-h-${i}`}>{col.label}</h2>
                  <span className="qp-n">{items.length}</span>
                </header>
                <ul className="qp-list td-list">
                  {items.map((c) => <Card key={c.id} c={c} tone={col.tone} onOpen={() => setOpenId(c.id)} />)}
                  {!items.length && <li className="qp-empty">{contacts.length ? col.empty : "Nobody on the list yet."}</li>}
                </ul>
              </section>
            );
          })}
          <section className="qp-col td-col kt-log" aria-labelledby="kt-h-log">
            <header className="qp-colh">
              <i className="qp-dot td-dot t-dark" aria-hidden="true" />
              <h2 id="kt-h-log">Last contacted</h2>
              <span className="qp-n">{recent.length}</span>
            </header>
            <ul className="qp-list td-list kt-loglist">
              {recent.map((t) => {
                const c = nameOf.get(t.contactId);
                return (
                  <li key={t.id}>
                    <button type="button" onClick={() => setOpenId(t.contactId)}>
                      <span className="kt-when">{ago(t.on, today)}</span>
                      <b>{c?.name ?? "Someone"}</b>
                      <span>{howPast(t.how)}{t.byName ? ` by ${firstName(t.byName)}` : ""}</span>
                      {t.note && <em>{t.note}</em>}
                    </button>
                  </li>
                );
              })}
              {!recent.length && <li className="qp-empty">Nothing logged yet.</li>}
            </ul>
          </section>
        </div>
      </div>

      {(opened || adding) && (
        <div className="qp-scrim mid" onClick={() => { setOpenId(null); setAdding(false); }}>
          <div className="qp-panel mid" role="dialog" aria-modal="true" aria-labelledby={opened ? "kit-panel-h" : "kit-add-h"} onClick={(e) => e.stopPropagation()}>
            <div className="qp-ph">
              <span>{opened ? "Keep in touch" : "Someone new"}</span>
              <button type="button" className="qp-x" onClick={() => { setOpenId(null); setAdding(false); }} aria-label="Close">×</button>
            </div>
            {opened ? <ContactPanel key={opened.id} c={opened} onClose={() => setOpenId(null)} /> : (
              <>
                <h2 id="kit-add-h" className="rl-h">Add someone to keep in touch with</h2>
                <AddForm onDone={() => setAdding(false)} />
              </>
            )}
          </div>
        </div>
      )}
      {msg && <p className={`qp-toast${msg.ok ? "" : " bad"}`} role="status">{msg.text}</p>}
    </Ctx.Provider>
  );
}
