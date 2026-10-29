"use client";

import { useMemo, useState } from "react";

type Visit = { id: number; jobNumber: string | null; unit: string | null; start: string; end: string | null; techIds: number[] };
type Tech = { id: number; name: string };
type Busy = Record<number, { appt: number; start: string; end: string }[]>;
type Result = { id: number; did: "swapped" | "taken off" | "skipped" | "failed"; detail?: string };

const TZ = "Australia/Melbourne";
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).replace(",", "");
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-AU", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).replace(" ", "").toLowerCase();
/** The API route's cap per request, so one slow day can't run a function out of time. */
const SLICE = 12;

/**
 * Swap one tech for another on this site's booked visits, a day or several at
 * a time. ServiceTitan's board moves them one by one; a village is twenty a
 * day (Jake, 29 Oct).
 */
export function TechSwap({ visits: initial, techs, busy }: { visits: Visit[]; techs: Tech[]; busy: Busy }) {
  const [visits, setVisits] = useState(initial);
  const nameOf = useMemo(() => new Map(techs.map((t) => [t.id, t.name])), [techs]);

  // Only techs who are actually on some of these visits can come off.
  const onCount = useMemo(() => {
    const c = new Map<number, number>();
    for (const v of visits) for (const t of v.techIds) c.set(t, (c.get(t) ?? 0) + 1);
    return c;
  }, [visits]);
  const fromChoices = techs.filter((t) => onCount.has(t.id));

  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const [days, setDays] = useState<Set<string>>(new Set());
  const [busyNow, setBusyNow] = useState<{ done: number; of: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; lines?: string[] } | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, { label: string; all: Visit[] }>();
    for (const v of visits) {
      const k = dayKey(v.start);
      if (!m.has(k)) m.set(k, { label: dayLabel(v.start), all: [] });
      m.get(k)!.all.push(v);
    }
    return [...m.entries()];
  }, [visits]);

  const chosen = from == null ? [] : visits.filter((v) => days.has(dayKey(v.start)) && v.techIds.includes(from));
  // Booked elsewhere at the same time, on this site or any other job. Shown,
  // not blocked: putting two techs' runs on one person may be the point.
  const clashes = to == null ? [] : chosen.filter((v) => {
    const s = Date.parse(v.start);
    const e = Date.parse(v.end ?? v.start);
    return (busy[to] ?? []).some((b) => b.appt !== v.id && Date.parse(b.start) < e && Date.parse(b.end) > s)
      || visits.some((o) => o.id !== v.id && o.techIds.includes(to) && Date.parse(o.start) < e && Date.parse(o.end ?? o.start) > s);
  });

  async function go() {
    if (from == null || to == null || !chosen.length) return;
    setMsg(null);
    const results: Result[] = [];
    setBusyNow({ done: 0, of: chosen.length });
    try {
      for (let i = 0; i < chosen.length; i += SLICE) {
        const res = await fetch("/api/portal/locations/visits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentIds: chosen.slice(i, i + SLICE).map((v) => v.id), from, to }),
        });
        const r = (await res.json().catch(() => ({}))) as { ok?: boolean; results?: Result[]; error?: string };
        if (!res.ok || !r.ok) throw new Error(r.error || "ServiceTitan didn’t answer.");
        results.push(...(r.results ?? []));
        setBusyNow({ done: Math.min(chosen.length, i + SLICE), of: chosen.length });
        // A failure on every visit of the first slice is the same failure on
        // the rest (a missing permission); stop rather than repeat it.
        if (i === 0 && results.every((x) => x.did === "failed")) break;
      }
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    const moved = new Set(results.filter((r) => r.did === "swapped" || r.did === "taken off").map((r) => r.id));
    setVisits((vs) => vs.map((v) => (moved.has(v.id) ? { ...v, techIds: [...new Set([...v.techIds.filter((t) => t !== from), to])] } : v)));
    setBusyNow(null);
    if (!results.length) return;
    const n = (d: Result["did"]) => results.filter((r) => r.did === d).length;
    const failed = results.filter((r) => r.did === "failed");
    const skipped = results.filter((r) => r.did === "skipped");
    const unit = (id: number) => visits.find((v) => v.id === id)?.unit ?? `visit ${id}`;
    setMsg((m) => m ?? {
      ok: failed.length === 0,
      text: [
        `${moved.size} visit${moved.size === 1 ? "" : "s"} moved from ${nameOf.get(from)} to ${nameOf.get(to)}`,
        n("taken off") ? `${n("taken off")} already had ${nameOf.get(to)}, so ${nameOf.get(from)} just came off` : "",
        skipped.length ? `${skipped.length} left alone, ${nameOf.get(from)} wasn’t on them any more` : "",
        failed.length ? `${failed.length} failed` : "",
        failed.length + moved.size + skipped.length < chosen.length ? `${chosen.length - results.length} not tried` : "",
      ].filter(Boolean).join(" · ") + ".",
      lines: [...new Set(failed.map((f) => f.detail ?? ""))].slice(0, 3).map((d) => `${failed.filter((f) => f.detail === d).slice(0, 4).map((f) => unit(f.id)).join(", ")}: ${d}`),
    });
    setDays(new Set());
  }

  if (!visits.length) return null;
  const firstDay = byDay[0][1].label;
  const lastDay = byDay[byDay.length - 1][1].label;

  return (
    <section className="pt-panel">
      <h2 className="pt-panel__h">Swap a tech</h2>
      <p className="pt-loc__lede">
        {visits.length} visit{visits.length === 1 ? "" : "s"} booked here, {firstDay === lastDay ? firstDay : `${firstDay} to ${lastDay}`}.
        Pick who comes off, who goes on, and which days. Changes go straight into ServiceTitan&rsquo;s dispatch board.
      </p>

      <div className="pt-loc__bar">
        <label className="pt-field">
          <span>Take off</span>
          <select value={from ?? ""} onChange={(e) => { setFrom(e.target.value ? Number(e.target.value) : null); setDays(new Set()); setMsg(null); }}>
            <option value="">Choose a tech</option>
            {fromChoices.map((t) => <option key={t.id} value={t.id}>{t.name} ({onCount.get(t.id)} visits)</option>)}
          </select>
        </label>
        <label className="pt-field">
          <span>Put on</span>
          <select value={to ?? ""} onChange={(e) => { setTo(e.target.value ? Number(e.target.value) : null); setMsg(null); }}>
            <option value="">Choose a tech</option>
            {techs.filter((t) => t.id !== from).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      </div>

      {from != null && (
        <ul className="pt-swap__days" aria-label="Days">
          {byDay.map(([k, d]) => {
            const mine = d.all.filter((v) => v.techIds.includes(from)).length;
            return (
              <li key={k}>
                <label className={`pt-swap__day${mine ? "" : " is-none"}`}>
                  <input
                    type="checkbox"
                    disabled={!mine || busyNow != null}
                    checked={days.has(k)}
                    onChange={() => setDays((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
                  />
                  <strong>{d.label}</strong>
                  <span className="pt-loc__muted">{mine ? `${mine} of ${d.all.length} visits` : `not on any of ${d.all.length}`}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {from != null && to != null && chosen.length > 0 && (
        <>
          <p className="pt-swap__sum">
            <strong>{nameOf.get(to)}</strong> goes on {chosen.length} visit{chosen.length === 1 ? "" : "s"} in place of <strong>{nameOf.get(from)}</strong>.
          </p>
          {clashes.length > 0 && (
            <p className="pt-swap__warn" role="note">
              Heads up: {nameOf.get(to)} is already booked at the same time on {clashes.length} of these
              {" "}({clashes.slice(0, 3).map((v) => `${dayLabel(v.start)} ${time(v.start)}`).join(", ")}{clashes.length > 3 ? ", …" : ""}).
            </p>
          )}
        </>
      )}

      <div className="pt-loc__bar">
        <button type="button" className="pt-btn pt-btn--navy" disabled={busyNow != null || from == null || to == null || chosen.length === 0} onClick={() => void go()}>
          {busyNow ? `Swapping… ${busyNow.done} of ${busyNow.of}` : chosen.length ? `Swap on ${chosen.length} visit${chosen.length === 1 ? "" : "s"}` : "Swap"}
        </button>
      </div>
      {msg && (
        <div className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">
          {msg.text}
          {msg.lines?.map((l) => <div key={l} className="pt-loc__muted">{l}</div>)}
        </div>
      )}
    </section>
  );
}
