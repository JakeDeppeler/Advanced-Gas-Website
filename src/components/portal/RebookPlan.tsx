"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Move = {
  appt: number; unit: string; job: string | null; fromStart: string; fromCrew: string;
  start: string; crew: string; change: "none" | "time" | "crew" | "both";
};
type Done = Record<string, { at: string; ok: boolean; detail?: string }>;
type Result = { appt: number; ok: boolean; detail?: string };

const TZ = "Australia/Melbourne";
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).replace(",", "");
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-AU", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).replace(" ", "").toLowerCase();
const first = (crew: string) => crew.split("/").map((n) => n.trim().split(" ")[0]).join(" & ");
/** The route's cap per request. */
const SLICE = 12;

/**
 * A rebooking worked out from the office's list (the units in the order each
 * day should run), shown day by day before anything moves, then applied a
 * slice at a time with progress. What's already moved is skipped, so pressing
 * again after a stop carries on.
 */
export function RebookPlan({ customerId, title, moves, done: initial }: { customerId: number; title: string; moves: Move[]; done: Done }) {
  const router = useRouter();
  const [done, setDone] = useState<Done>(initial);
  const [busy, setBusy] = useState<{ n: number; of: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; lines?: string[] } | null>(null);

  const todo = moves.filter((m) => m.change !== "none" && !done[String(m.appt)]?.ok);
  const failed = moves.filter((m) => done[String(m.appt)] && !done[String(m.appt)].ok);
  const changing = moves.filter((m) => m.change !== "none").length;
  const days = useMemo(() => {
    const m = new Map<string, { label: string; list: Move[] }>();
    for (const v of [...moves].sort((a, b) => a.start.localeCompare(b.start) || a.crew.localeCompare(b.crew) * -1)) {
      const k = dayKey(v.start);
      if (!m.has(k)) m.set(k, { label: dayLabel(v.start), list: [] });
      m.get(k)!.list.push(v);
    }
    return [...m.values()];
  }, [moves]);

  async function go() {
    if (!todo.length) return;
    if (!confirm(`Move ${todo.length} visit${todo.length === 1 ? "" : "s"} in ServiceTitan to match ${title}? If job notifications are on for these units, ServiceTitan may let them know the new time.`)) return;
    setMsg(null);
    const results: Result[] = [];
    setBusy({ n: 0, of: todo.length });
    try {
      for (let i = 0; i < todo.length; i += SLICE) {
        const res = await fetch("/api/portal/locations/rebook", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId, appointmentIds: todo.slice(i, i + SLICE).map((m) => m.appt) }),
        });
        const r = (await res.json().catch(() => ({}))) as { ok?: boolean; results?: Result[]; error?: string };
        if (!res.ok || !r.ok) throw new Error(r.error || "ServiceTitan didn’t answer.");
        results.push(...(r.results ?? []));
        const at = new Date().toISOString();
        setDone((d) => ({ ...d, ...Object.fromEntries((r.results ?? []).map((x) => [String(x.appt), { at, ok: x.ok, detail: x.detail }])) }));
        setBusy({ n: Math.min(todo.length, i + SLICE), of: todo.length });
        // Every one of the first slice failing is one cause (a permission); stop rather than repeat it.
        if (i === 0 && results.length && results.every((x) => !x.ok)) break;
      }
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(null);
    const bad = results.filter((r) => !r.ok);
    if (results.length) setMsg((m) => m ?? {
      ok: !bad.length,
      text: `${results.length - bad.length} visit${results.length - bad.length === 1 ? "" : "s"} moved${bad.length ? ` · ${bad.length} didn’t` : ""}.`,
      lines: [...new Set(bad.map((b) => b.detail ?? ""))].slice(0, 3).map((d) => `${bad.filter((b) => b.detail === d).slice(0, 4).map((b) => moves.find((m) => m.appt === b.appt)?.unit).join(", ")}: ${d}`),
    });
    router.refresh();
  }

  return (
    <section className="pt-panel rb">
      <h2 className="pt-panel__h">Rebook to {title}</h2>
      <p className="pt-loc__lede">
        Each day runs in the list&rsquo;s order, in the day&rsquo;s existing slots and crews. {changing} of {moves.length} visits change
        ({moves.length - changing} are already right){Object.values(done).some((d) => d.ok) ? <>; <b>{moves.filter((m) => done[String(m.appt)]?.ok).length} moved so far</b></> : null}.
        Nothing moves until you press the button.
      </p>
      <div className="rb-bar">
        <button type="button" className="pk-btn" disabled={!!busy || !todo.length} onClick={go}>
          {busy ? `Moving… ${busy.n} of ${busy.of}` : todo.length ? `Move ${todo.length} visit${todo.length === 1 ? "" : "s"} in ServiceTitan` : "All moved"}
        </button>
        {failed.length > 0 && !busy && <span className="rb-bad">{failed.length} didn&rsquo;t move: press again to retry</span>}
      </div>
      {msg && (
        <div className={`pt-note${msg.ok ? "" : " pt-note--warn"}`} role="status">
          {msg.text}
          {msg.lines?.map((l) => <div key={l}>{l}</div>)}
        </div>
      )}
      <div className="rb-days">
        {days.map((d) => (
          <details key={d.label} className="rb-day">
            <summary><b>{d.label}</b><span>{d.list.filter((m) => m.change !== "none").length} change · {d.list.length} visits</span></summary>
            <table className="rb-t">
              <tbody>
                {d.list.map((m) => {
                  const st = done[String(m.appt)];
                  return (
                    <tr key={m.appt} className={m.change === "none" ? "same" : undefined}>
                      <td className="t">{time(m.start)}</td>
                      <td><b>{m.unit}</b></td>
                      <td>{first(m.crew)}</td>
                      <td className="was">{m.change === "none" ? "already here" : `was ${dayKey(m.fromStart) === dayKey(m.start) ? "" : `${dayLabel(m.fromStart)} `}${time(m.fromStart)}${m.change === "crew" || m.change === "both" ? `, ${first(m.fromCrew)}` : ""}`}</td>
                      <td className="st">{st ? (st.ok ? "✓ moved" : <span className="rb-bad" title={st.detail}>didn&rsquo;t move</span>) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>
        ))}
      </div>
    </section>
  );
}
