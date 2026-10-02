"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveKm, saveStock, saveWalkaroundPhoto, saveWeekly } from "@/app/trade/monday/actions";
import { shrink } from "@/components/portal/shrinkPhoto";
import {
  PHOTO_ANGLES, VAN_STOCK, WEEKLY_CHECK, itemKey,
  type CheckItems,
} from "@/lib/portal/vanChecks";
import {
  MONDAY_STEPS, WALKAROUND_TIDY, angleKey, tidyKey, weekSteps,
  type Step, type StepKey,
} from "@/components/portal/mondayJobs";

const CAMERA = "M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z";
const TICK = "M5 12l5 5L20 7";

export type MondayStart = {
  vanId: string;
  vanName: string;
  steps: Step[];
  /** Angles already photographed this week. */
  shot: string[];
  weeklyItems: CheckItems;
  weeklyNotes: string;
  stockItems: CheckItems;
  lastKm: { odometer: number; on: string } | null;
  start: StepKey;
};

const digits = (v: string) => { const n = parseInt(v.replace(/[^0-9]/g, ""), 10); return Number.isNaN(n) ? null : n; };

/**
 * The four Monday jobs, one at a time.
 *
 * Each step commits on its own as it is finished, rather than everything
 * landing at the end: a tech who takes the photos and then gets called to a job
 * keeps the photos. The photos go up one at a time as they are taken, for the
 * same reason — and because a van parked behind a factory in Pakenham has one
 * bar of signal, and six at once is what fails.
 */
export function MondayJobs(p: MondayStart) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [step, setStep] = useState<StepKey>(p.start);
  const [msg, setMsg] = useState("");

  const [shot, setShot] = useState<string[]>(p.shot);
  const [tidy, setTidy] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(WALKAROUND_TIDY.map((t) => [t, p.weeklyItems[tidyKey(t)]?.state === "ok"])),
  );
  const [ticks, setTicks] = useState<CheckItems>(p.weeklyItems);
  const [notes, setNotes] = useState(p.weeklyNotes);
  const [counts, setCounts] = useState<Record<string, number | null>>(() => {
    const out: Record<string, number | null> = {};
    for (const g of VAN_STOCK) for (const it of g.items) {
      const k = itemKey(g.group, it.item);
      out[k] = p.stockItems[k]?.qty ?? null;
    }
    return out;
  });
  const [km, setKm] = useState("");

  const camera = useRef<HTMLInputElement>(null);
  const shooting = useRef<string | null>(null);

  // The step rail reads from the same function the home screen and the server
  // use, fed the state in this component — so the rail updates as you work and
  // still says exactly what a reload would say.
  const steps = useMemo(() => {
    const items: CheckItems = { ...ticks };
    for (const t of WALKAROUND_TIDY) items[tidyKey(t)] = { state: tidy[t] ? "ok" : null };
    const counted = Object.values(counts).some((v) => v != null);
    const today = new Date();
    return weekSteps({
      weekly: { checkedOn: today.toLocaleDateString("en-CA"), items },
      photos: shot.length,
      stock: counted ? { checkedOn: today.toLocaleDateString("en-CA") } : null,
      km: p.steps.find((s) => s.key === "km")?.done ? { logDate: today.toLocaleDateString("en-CA"), odometer: digits(km) } : null,
      today,
    });
  }, [ticks, tidy, counts, shot, km, p.steps]);

  const done = steps.filter((s) => s.done).length;
  const idx = MONDAY_STEPS.findIndex((s) => s.key === step);
  const current = MONDAY_STEPS[idx];
  const flagged = WEEKLY_CHECK.filter((t) => ticks[itemKey("weekly", t.item)]?.state === "action");
  const short = VAN_STOCK.flatMap((g) =>
    g.items
      .filter((it) => { const q = counts[itemKey(g.group, it.item)]; return q != null && q <= it.min; })
      .map((it) => it.item),
  );

  function shootFor(angle: string) {
    shooting.current = angle;
    camera.current?.click();
  }

  async function onPicked(files: FileList | null) {
    const angle = shooting.current;
    if (!files?.length || !angle) return;
    setMsg("");
    const file = await shrink(files[0]);
    if (camera.current) camera.current.value = "";
    start(async () => {
      const fd = new FormData();
      fd.set("label", angle);
      fd.set("itemKey", angleKey(angle));
      fd.set("photo", file);
      const res = await saveWalkaroundPhoto(fd);
      if (!res.ok) { setMsg(res.error || "Couldn't save that photo."); return; }
      setShot((s) => (s.includes(angle) ? s : [...s, angle]));
      router.refresh();
    });
  }

  function go(next: StepKey | null) {
    setMsg("");
    start(async () => {
      if (step === "walkaround" || step === "check") {
        const items: CheckItems = { ...ticks };
        for (const t of WALKAROUND_TIDY) items[tidyKey(t)] = { state: tidy[t] ? "ok" : null };
        const res = await saveWeekly({ items, notes });
        if (!res.ok) { setMsg(res.error || "Couldn't save."); return; }
      }
      if (step === "stock") {
        const items: CheckItems = {};
        for (const g of VAN_STOCK) for (const it of g.items) {
          const k = itemKey(g.group, it.item);
          if (counts[k] != null) items[k] = { qty: counts[k] };
        }
        const res = await saveStock({ items });
        if (!res.ok) { setMsg(res.error || "Couldn't save the count."); return; }
      }
      if (step === "km") {
        const n = digits(km);
        if (n == null) { setMsg("Put the number off the dash in."); return; }
        const res = await saveKm({ odometer: n });
        if (!res.ok) { setMsg(res.error || "Couldn't save the reading."); return; }
      }
      router.refresh();
      if (next) setStep(next);
      else router.push("/trade");
    });
  }

  const nextKey = idx < MONDAY_STEPS.length - 1 ? MONDAY_STEPS[idx + 1].key : null;
  const kmNum = digits(km);
  const kmNote = kmNum == null || !p.lastKm
    ? null
    : kmNum < p.lastKm.odometer
      ? "That's lower than the last reading. Check the number."
      : `${(kmNum - p.lastKm.odometer).toLocaleString("en-AU")} km since then.`;

  return (
    <div className="tr-md" style={{ ["--tr-md" as string]: "300px minmax(0, 1fr)" }}>
      <input
        ref={camera} type="file" accept="image/*" capture="environment"
        onChange={(e) => onPicked(e.target.files)} hidden
      />

      <aside className="tr-md__col tr-md__col--steps">
        {steps.map((s, i) => (
          <button
            key={s.key} type="button" aria-pressed={s.key === step}
            onClick={() => setStep(s.key)}
            className={`tr-pick${s.key === step ? " is-on" : ""}`}
          >
            <span className={`tr-pick__chip${s.done ? " tr-pick__chip--done" : ""}`}>{s.done ? "✓" : i + 1}</span>
            <span className="tr-pick__t">
              <strong>{s.title}</strong>
              <span>{s.key === step && !s.done ? "Doing now" : s.status}</span>
            </span>
          </button>
        ))}
        <div style={{ padding: "14px 12px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--pt-ink-2)" }}>{done} of {steps.length} done</span>
          <div className="tr-bar" aria-hidden="true"><span style={{ width: `${(done / steps.length) * 100}%` }} /></div>
        </div>
      </aside>

      <section className="tr-card tr-stack" style={{ gap: 18 }}>
        <div>
          <h2 style={{ fontSize: 24, lineHeight: "30px" }}>{current.title}</h2>
          <span className="tr-sub">{current.hint}</span>
        </div>

        {step === "walkaround" && (
          <>
            <div className="tr-shots">
              {PHOTO_ANGLES.map((a) => {
                const on = shot.includes(a);
                return (
                  <button key={a} type="button" aria-pressed={on} onClick={() => shootFor(a)} className={`tr-shot${on ? " is-on" : ""}`}>
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={on ? TICK : CAMERA} />
                    </svg>
                    <strong>{a}</strong>
                    <span>{on ? "Taken · tap to add another" : "Tap to take"}</span>
                  </button>
                );
              })}
            </div>
            <div className="tr-pills">
              {WALKAROUND_TIDY.map((t) => (
                <button
                  key={t} type="button" aria-pressed={!!tidy[t]}
                  onClick={() => setTidy((s) => ({ ...s, [t]: !s[t] }))}
                  className={`tr-pill${tidy[t] ? " is-on" : ""}`}
                >
                  {tidy[t] ? "✓ " : ""}{t}
                </button>
              ))}
            </div>
          </>
        )}

        {step === "check" && (
          <>
            <div className="tr-rows">
              {WEEKLY_CHECK.map((t) => {
                const k = itemKey("weekly", t.item);
                const v = ticks[k]?.state;
                const set = (state: "ok" | "action") => setTicks((s) => ({ ...s, [k]: { ...s[k], state } }));
                return (
                  <div className="tr-row" key={t.item}>
                    <span className="tr-row__k"><strong>{t.item}</strong>{t.looking && <span>{t.looking}</span>}</span>
                    <span style={{ flex: "none", display: "flex", gap: 8 }}>
                      <button type="button" aria-pressed={v === "ok"} onClick={() => set("ok")} className={`tr-seg${v === "ok" ? " is-on" : ""}`}>OK</button>
                      <button type="button" aria-pressed={v === "action"} onClick={() => set("action")} className={`tr-seg${v === "action" ? " is-bad" : ""}`}>Needs a look</button>
                    </span>
                  </div>
                );
              })}
            </div>
            {flagged.length > 0 && (
              <>
                <label className="tr-field">
                  What&rsquo;s wrong
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tell the office what you found" />
                </label>
                <span className="tr-note tr-note--warn">
                  {flagged.length === 1 ? "One line is" : `${flagged.length} lines are`} flagged. Saving puts them on the
                  van&rsquo;s record for the office to pick up.
                </span>
              </>
            )}
          </>
        )}

        {step === "stock" && (
          <>
            <div className="tr-stock">
              {VAN_STOCK.map((g) => (
                <details key={g.group} open>
                  <summary>{g.group}</summary>
                  <div className="tr-rows">
                    {g.items.map((it) => {
                      const k = itemKey(g.group, it.item);
                      const q = counts[k];
                      const low = q != null && q <= it.min;
                      const set = (n: number | null) => setCounts((s) => ({ ...s, [k]: n }));
                      return (
                        <div className="tr-row" key={it.item}>
                          <span className="tr-row__k">
                            <strong>{it.item}</strong>
                            <span style={low ? { color: "var(--pt-accent)", fontWeight: 700 } : undefined}>
                              {low ? "At or under the minimum · " : ""}keep {it.min} {it.unit} on the van
                            </span>
                          </span>
                          <span className="tr-count">
                            <button type="button" aria-label={`One less ${it.item}`} onClick={() => set(Math.max(0, (q ?? 0) - 1))}>&minus;</button>
                            {q == null
                              ? <span className="tr-count__none">not counted</span>
                              : <strong>{q}</strong>}
                            <button type="button" aria-label={`One more ${it.item}`} onClick={() => set((q ?? 0) + 1)}>+</button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
            <span className={short.length ? "tr-note tr-note--warn" : "tr-foot"}>
              {short.length
                ? `${short.length} ${short.length === 1 ? "item is" : "items are"} at or under the minimum. Order at the minimum, not when it runs out.`
                : "Count what's actually on the van, not what should be. Anything left blank is treated as not counted."}
            </span>
          </>
        )}

        {step === "km" && (
          <>
            <label className="tr-field tr-field--big" style={{ maxWidth: 420 }}>
              Odometer today
              <input type="text" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} placeholder="e.g. 6,720" />
            </label>
            <span className="tr-sub">
              {p.lastKm
                ? `Last reading ${p.lastKm.odometer.toLocaleString("en-AU")} km on ${new Date(`${p.lastKm.on}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}.`
                : "No earlier reading to compare against."}
              {kmNote ? ` ${kmNote}` : ""}
            </span>
          </>
        )}

        {msg && <span className="tr-note tr-note--warn">{msg}</span>}

        <div className="tr-btns tr-save">
          <button type="button" className="tr-btn" disabled={idx === 0} onClick={() => setStep(MONDAY_STEPS[Math.max(0, idx - 1)].key)}>
            Back
          </button>
          <button type="button" className="tr-btn tr-btn--go" disabled={busy} onClick={() => go(nextKey)}>
            {busy ? "Saving…" : nextKey ? "Save & next" : "Save & finish"}
          </button>
        </div>
      </section>
    </div>
  );
}
