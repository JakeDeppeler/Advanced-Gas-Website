"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addContact, dropContact, editContact, reachedOut, type ContactResult } from "@/app/portal/keep-in-touch/actions";
import {
  byDue, CADENCE_LABEL, CADENCES, HOWS, isDue, KINDS, kindLabel, lastWords, touchState, touchWords,
  type Cadence, type Contact, type Touch,
} from "@/lib/contacts/types";
import { firstName, shiftDay, type Person } from "@/lib/todos/types";

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

const FLAG = "M5 21V4M5 4h11l-2.5 4L16 12H5";
const Flag = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={FLAG} /></svg>
);

type Draft = { name: string; company: string; kind: string; phone: string; email: string; notes: string; ownerId: string; cadence: Cadence };
const draftOf = (c: Contact | null, meId: string | null): Draft => ({
  name: c?.name ?? "", company: c?.company ?? "", kind: c?.kind ?? "", phone: c?.phone ?? "", email: c?.email ?? "",
  notes: c?.notes ?? "", ownerId: c?.ownerId ?? meId ?? "", cadence: c?.cadence ?? "month",
});

/** The fields a contact has, for adding one and for changing one. */
function ContactFields({ d, set, idp }: { d: Draft; set: (p: Partial<Draft>) => void; idp: string }) {
  const { owners, meId } = useContext(Ctx);
  return (
    <div className="pt-kit__fields">
      <label className="pt-field"><span>Name</span><input id={`${idp}-name`} value={d.name} onChange={(e) => set({ name: e.target.value })} maxLength={200} required placeholder="Tom Henley" /></label>
      <label className="pt-field"><span>Company <em>(optional)</em></span><input id={`${idp}-co`} value={d.company} onChange={(e) => set({ company: e.target.value })} maxLength={200} placeholder="Henley Homes" /></label>
      <label className="pt-field"><span>What they are</span>
        <select id={`${idp}-kind`} value={d.kind} onChange={(e) => set({ kind: e.target.value })}>
          <option value="">Choose…</option>
          {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
        </select>
      </label>
      <label className="pt-field"><span>Who looks after them</span>
        <select id={`${idp}-owner`} value={d.ownerId} onChange={(e) => set({ ownerId: e.target.value })}>
          {owners.map((p) => <option key={p.id} value={p.id}>{p.id === meId ? `${p.name} (me)` : p.name}</option>)}
        </select>
      </label>
      <label className="pt-field"><span>Phone <em>(optional)</em></span><input id={`${idp}-ph`} type="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} maxLength={40} placeholder="0400 000 000" /></label>
      <label className="pt-field"><span>Email <em>(optional)</em></span><input id={`${idp}-em`} type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} maxLength={200} /></label>
      <div className="pt-field pt-kit__wide"><span>How often to reach out</span>
        <div className="pt-todo__chips" role="group" aria-label="How often">
          {CADENCES.map((c) => (
            <button key={c.key} type="button" className={`pt-todo__chip${d.cadence === c.key ? " is-on" : ""}`} aria-pressed={d.cadence === c.key} onClick={() => set({ cadence: c.key })}>{c.label}</button>
          ))}
        </div>
      </div>
      <label className="pt-field pt-kit__wide"><span>Notes <em>(optional)</em></span>
        <textarea id={`${idp}-notes`} rows={2} value={d.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={2000} placeholder="What matters to them, what you last talked about, what's coming up." />
      </label>
    </div>
  );
}

function AddPanel({ onDone }: { onDone: () => void }) {
  const { run, pending, meId, today } = useContext(Ctx);
  const [d, setD] = useState<Draft>(draftOf(null, meId));
  const [lastOn, setLastOn] = useState("");
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  return (
    <section className="pt-panel pt-kit__add" aria-labelledby="kit-add-h">
      <h2 id="kit-add-h" className="pt-panel__h">Add someone to keep in touch with</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addContact({ ...d, ownerId: d.ownerId || null, kind: d.kind || null, lastOn: lastOn || undefined }), `${d.name.trim()} is on the list.`, () => { setD(draftOf(null, meId)); setLastOn(""); onDone(); });
        }}
      >
        <ContactFields d={d} set={set} idp="kit-new" />
        <label className="pt-field pt-kit__last"><span>Last time you spoke <em>(leave blank if not yet — they&rsquo;ll be due straight away)</em></span>
          <input id="kit-new-last" type="date" value={lastOn} max={today} onChange={(e) => setLastOn(e.target.value)} />
        </label>
        <div className="pt-todo__submit">
          <button type="submit" className="pt-btn pt-btn--orange" disabled={pending || !d.name.trim()}>Add to the list</button>
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={onDone}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

function ReachForm({ c, onDone }: { c: Contact; onDone: () => void }) {
  const { run, pending, today } = useContext(Ctx);
  const [how, setHow] = useState("call");
  const [on, setOn] = useState(today);
  const [note, setNote] = useState("");
  return (
    <form
      className="pt-kit__reach"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => reachedOut(c.id, { on, how, note }), `Logged: ${HOWS.find((h) => h.key === how)?.past.toLowerCase()} ${c.name}.`, onDone);
      }}
    >
      <div className="pt-field"><span>How</span>
        <div className="pt-todo__chips" role="group" aria-label="How you got in touch">
          {HOWS.map((h) => (
            <button key={h.key} type="button" className={`pt-todo__chip${how === h.key ? " is-on" : ""}`} aria-pressed={how === h.key} onClick={() => setHow(h.key)}>{h.label}</button>
          ))}
        </div>
      </div>
      <div className="pt-field"><span>When</span>
        <div className="pt-todo__due-pick is-compact">
          <input type="date" value={on} max={today} onChange={(e) => setOn(e.target.value)} aria-label="When" required />
          <div className="pt-todo__chips">
            {[{ l: "Today", v: today }, { l: "Yesterday", v: shiftDay(today, -1) }].map((x) => (
              <button key={x.l} type="button" className={`pt-todo__chip${on === x.v ? " is-on" : ""}`} aria-pressed={on === x.v} onClick={() => setOn(x.v)}>{x.l}</button>
            ))}
          </div>
        </div>
      </div>
      <label className="pt-field"><span>What came of it <em>(optional)</em></span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Two jobs coming in November; wants a price on the Clyde North spec." />
      </label>
      <div className="pt-todo__editacts">
        <button type="submit" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending}>Save</button>
        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

function EditForm({ c, onDone }: { c: Contact; onDone: () => void }) {
  const { run, pending, meId } = useContext(Ctx);
  const [d, setD] = useState<Draft>(draftOf(c, meId));
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  return (
    <form
      className="pt-kit__edit"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => editContact(c.id, { ...d, ownerId: d.ownerId || null, kind: d.kind || null }), "Saved.", onDone);
      }}
    >
      <ContactFields d={d} set={set} idp={`kit-${c.id}`} />
      <div className="pt-todo__editacts">
        <button type="submit" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending || !d.name.trim()}>Save</button>
        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={onDone}>Cancel</button>
        <button
          type="button" className="pt-todo__remove" disabled={pending}
          onClick={() => { if (confirm(`Take ${c.name} off the keep-in-touch list? Their history is kept.`)) run(() => dropContact(c.id), `${c.name} is off the list.`); }}
        >
          Take off the list
        </button>
      </div>
    </form>
  );
}

function Row({ c }: { c: Contact }) {
  const { ownerName, touchesOf, today } = useContext(Ctx);
  const [open, setOpen] = useState<null | "reach" | "edit" | "history">(null);
  const state = touchState(c, today);
  const history = touchesOf(c.id);
  const owner = ownerName(c.ownerId);
  const due = isDue(state);
  return (
    <li className={`pt-kit__row is-${state}`}>
      <div className="pt-kit__who">
        <span className="pt-kit__name">{c.name}{c.company && <span className="pt-kit__co"> · {c.company}</span>}</span>
        <span className="pt-kit__tags">
          <span>{kindLabel(c.kind)}</span>
          <span>{CADENCE_LABEL[c.cadence]}</span>
          <span>{owner ? `${firstName(owner)} looks after them` : "Nobody looks after them"}</span>
        </span>
        {(c.phone || c.email) && (
          <span className="pt-kit__reachby">
            {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>{c.phone}</a>}
            {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
          </span>
        )}
        {c.notes && <span className="pt-kit__notes">{c.notes}</span>}
      </div>
      <div className="pt-kit__when">
        <span className={`pt-kit__due is-${state}`}>{state === "overdue" && <Flag />}{touchWords(c, today)}</span>
        <span className="pt-kit__last">{lastWords(c, today)}</span>
      </div>
      <div className="pt-kit__acts">
        <button type="button" className={`pt-btn pt-btn--sm ${due ? "pt-btn--navy" : "pt-btn--ghost"}`} aria-expanded={open === "reach"} onClick={() => setOpen(open === "reach" ? null : "reach")}>
          Reached out
        </button>
        <span className="pt-kit__links">
          <button type="button" className="pt-todo__editbtn" aria-expanded={open === "edit"} onClick={() => setOpen(open === "edit" ? null : "edit")}>Change</button>
          {history.length > 0 && (
            <button type="button" className="pt-todo__editbtn" aria-expanded={open === "history"} onClick={() => setOpen(open === "history" ? null : "history")}>History ({history.length})</button>
          )}
        </span>
      </div>
      {open === "reach" && <div className="pt-kit__more"><ReachForm c={c} onDone={() => setOpen(null)} /></div>}
      {open === "edit" && <div className="pt-kit__more"><EditForm c={c} onDone={() => setOpen(null)} /></div>}
      {open === "history" && (
        <div className="pt-kit__more">
          <ol className="pt-kit__hist">
            {history.map((t) => (
              <li key={t.id}>
                <strong>{HOWS.find((h) => h.key === t.how)?.past ?? "In touch"}</strong>{" "}
                {new Date(`${t.on}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
                {t.byName && <span> · {firstName(t.byName)}</span>}
                {t.note && <p>{t.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </li>
  );
}

export function KeepInTouchBoard({ contacts, touches, owners, meId, today }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, setAdding] = useState(contacts.length === 0);
  const [who, setWho] = useState<string>("all");
  const [find, setFind] = useState("");

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
    .filter((c) => who === "all" || (who === "me" ? c.ownerId === meId : c.ownerId === who))
    .filter((c) => !needle || [c.name, c.company, c.notes, kindLabel(c.kind)].some((x) => x?.toLowerCase().includes(needle)))
    .sort(byDue);
  const dueNow = shown.filter((c) => isDue(touchState(c, today)));
  const later = shown.filter((c) => !isDue(touchState(c, today)));
  const dueFor = (id: string) => contacts.filter((c) => c.ownerId === id && isDue(touchState(c, today))).length;

  return (
    <Ctx.Provider value={shared}>
      <div className="pt-kit">
        <div className="pt-kit__bar">
          <nav className="pt-seg" aria-label="Whose">
            <button type="button" className={`pt-seg__b${who === "all" ? " is-on" : ""}`} aria-pressed={who === "all"} onClick={() => setWho("all")}>Everyone</button>
            {owners.map((p) => {
              const n = dueFor(p.id);
              return (
                <button key={p.id} type="button" className={`pt-seg__b${who === p.id ? " is-on" : ""}`} aria-pressed={who === p.id} onClick={() => setWho(p.id)}>
                  {p.id === meId ? "Mine" : firstName(p.name)}{n > 0 && <span className="pt-kit__segn" aria-label={`${n} due`}>{n}</span>}
                </button>
              );
            })}
          </nav>
          <input className="pt-kit__find" type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a name or company" aria-label="Find a name or company" />
          {!adding && <button type="button" className="pt-btn pt-btn--orange pt-btn--sm" onClick={() => setAdding(true)}>Add someone</button>}
        </div>
        {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"} pt-kit__msg`} role="status">{msg.text}</p>}

        {adding && <AddPanel onDone={() => setAdding(false)} />}

        <section className="pt-panel pt-kit__list" aria-labelledby="kit-due-h">
          <h2 id="kit-due-h" className="pt-panel__h">Due now <span className="pt-kit__count">{dueNow.length}</span></h2>
          <p className="pt-panel__sub">Overdue first. Log the call, text or visit with &ldquo;Reached out&rdquo; and their clock starts again.</p>
          {dueNow.length ? (
            <ul className="pt-kit__rows">{dueNow.map((c) => <Row key={c.id} c={c} />)}</ul>
          ) : (
            <p className="pt-todo__empty">{contacts.length ? "Nobody's due — everyone's been reached out to on time." : "Nobody on the list yet. Add the people worth a call every month."}</p>
          )}
        </section>

        {later.length > 0 && (
          <section className="pt-panel pt-kit__list" aria-labelledby="kit-later-h">
            <h2 id="kit-later-h" className="pt-panel__h">Coming up <span className="pt-kit__count">{later.length}</span></h2>
            <ul className="pt-kit__rows">{later.map((c) => <Row key={c.id} c={c} />)}</ul>
          </section>
        )}
      </div>
    </Ctx.Provider>
  );
}
