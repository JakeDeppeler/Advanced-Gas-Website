"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveCheckPhoto, saveKm, saveStock, saveWeekly, sendWeekly } from "@/app/trade/van/actions";
import { shrink } from "@/components/portal/shrinkPhoto";
import { PHOTO_ANGLES, VAN_STOCK, VEHICLE_CHECK, VEHICLE_ITEMS, itemKey, vehicleKey, type CheckItems } from "@/lib/portal/vanChecks";
import {
  FUEL_LEVELS, MONDAY_STEPS, SENT_KEY, TIDY_LINES, angleKey, weekSteps,
  type Step, type StepKey,
} from "@/components/portal/mondayJobs";
import { TRADE_ICON } from "@/lib/portal/tradeNav";

const I = ({ d, size = 20 }: { d: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export type WeeklyStart = {
  weekLabel: string;
  steps: Step[];
  shot: string[];
  photoKeys: string[];
  weeklyItems: CheckItems;
  stockItems: CheckItems;
  lastKm: { odometer: number; on: string } | null;
  km: { odometer: number | null; fuel: string | null } | null;
  start: StepKey;
};

const digits = (v: string) => { const n = parseInt(v.replace(/[^0-9]/g, ""), 10); return Number.isNaN(n) ? null : n; };

/**
 * The weekly van check, one step at a time.
 *
 * Each step commits as it is finished rather than everything at the end: a
 * tech who takes the photos and gets called to a job keeps the photos. Photos
 * go up one at a time as they're taken, because a van parked behind a factory
 * has one bar of signal and six at once is what fails.
 */
export function WeeklyCheck(p: WeeklyStart) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [step, setStep] = useState<StepKey>(p.start);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  const [shot, setShot] = useState<string[]>(p.shot);
  const [photoKeys, setPhotoKeys] = useState<string[]>(p.photoKeys);
  const [items, setItems] = useState<CheckItems>(p.weeklyItems);
  const [counts, setCounts] = useState<Record<string, number | null>>(() => {
    const out: Record<string, number | null> = {};
    for (const g of VAN_STOCK) for (const it of g.items) {
      const k = itemKey(g.group, it.item);
      out[k] = p.stockItems[k]?.qty ?? null;
    }
    return out;
  });
  const [km, setKm] = useState(p.km?.odometer != null ? String(p.km.odometer) : "");
  const [fuel, setFuel] = useState<string | null>(p.km?.fuel ?? null);
  const [kmSaved, setKmSaved] = useState(!!p.km);

  const camera = useRef<HTMLInputElement>(null);
  const shooting = useRef<{ key: string; label: string } | null>(null);

  const lowNow = VAN_STOCK.reduce((n, g) => n + g.items.filter((it) => { const q = counts[itemKey(g.group, it.item)]; return q != null && q <= it.min; }).length, 0);
  const counted = Object.values(counts).some((v) => v != null);
  const stockStep = p.steps.find((s) => s.key === "stock");

  // The step list reads from the same function the server uses, fed this
  // component's state — so it updates as you work and still says exactly what
  // a reload would say.
  const steps = useMemo(() => {
    const today = new Date();
    const iso = today.toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
    return weekSteps({
      weekly: { checkedOn: iso, items },
      photos: shot.length,
      stock: stockStep?.done || counted ? { checkedOn: iso, low: lowNow } : null,
      km: kmSaved ? { logDate: iso, odometer: digits(km), fuel } : null,
      today,
    });
  }, [items, shot, counted, lowNow, stockStep, kmSaved, km, fuel]);

  const done = steps.filter((s) => s.done).length;
  const idx = MONDAY_STEPS.findIndex((s) => s.key === step);
  const current = MONDAY_STEPS[idx];
  const cur = steps[idx];
  const flagged = VEHICLE_ITEMS.filter((i) => items[vehicleKey(i)]?.state === "action");
  const sentAt = items[SENT_KEY]?.note;

  const setEntry = (k: string, patch: Partial<CheckItems[string]>) => setItems((s) => ({ ...s, [k]: { ...s[k], ...patch } }));

  function shootFor(key: string, label: string) {
    shooting.current = { key, label };
    camera.current?.click();
  }

  async function onPicked(files: FileList | null) {
    const target = shooting.current;
    if (!files?.length || !target) return;
    setMsg(null);
    const file = await shrink(files[0]);
    if (camera.current) camera.current.value = "";
    start(async () => {
      const fd = new FormData();
      fd.set("label", target.label);
      fd.set("itemKey", target.key);
      fd.set("photo", file);
      const res = await saveCheckPhoto(fd);
      if (!res.ok) { setMsg({ text: res.error || "Couldn't save that photo." }); return; }
      setPhotoKeys((s) => (s.includes(target.key) ? s : [...s, target.key]));
      const angle = PHOTO_ANGLES.find((a) => angleKey(a) === target.key);
      if (angle) setShot((s) => (s.includes(angle) ? s : [...s, angle]));
      router.refresh();
    });
  }

  function pick(keys: string[]): CheckItems {
    const out: CheckItems = {};
    for (const k of keys) if (items[k]) out[k] = items[k];
    return out;
  }

  function go(next: StepKey | null) {
    setMsg(null);
    start(async () => {
      if (step === "tidy") {
        const res = await saveWeekly({ items: pick(TIDY_LINES.map((t) => t.key)) });
        if (!res.ok) { setMsg({ text: res.error || "Couldn't save." }); return; }
      }
      if (step === "check") {
        const res = await saveWeekly({ items: pick(VEHICLE_ITEMS.map(vehicleKey)) });
        if (!res.ok) { setMsg({ text: res.error || "Couldn't save." }); return; }
      }
      if (step === "stock") {
        const out: CheckItems = {};
        for (const g of VAN_STOCK) for (const it of g.items) {
          const k = itemKey(g.group, it.item);
          if (counts[k] != null) out[k] = { qty: counts[k] };
        }
        if (Object.keys(out).length) {
          const res = await saveStock({ items: out });
          if (!res.ok) { setMsg({ text: res.error || "Couldn't save the count." }); return; }
        }
      }
      if (step === "km") {
        const n = digits(km);
        if (n == null) { setMsg({ text: "Put the number off the dash in." }); return; }
        if (!kmSaved || n !== p.km?.odometer || fuel !== p.km?.fuel) {
          const res = await saveKm({ odometer: n, fuel });
          if (!res.ok) { setMsg({ text: res.error || "Couldn't save the reading." }); return; }
          setKmSaved(true);
        }
      }
      if (step === "send") {
        const res = await sendWeekly();
        if (!res.ok) { setMsg({ text: res.error || "Couldn't send it." }); return; }
        setItems((s) => ({ ...s, [SENT_KEY]: { state: "ok", note: new Date().toISOString() } }));
        setMsg({ ok: true, text: res.flagged ? `Sent. ${res.flagged === 1 ? "One line went" : `${res.flagged} lines went`} to the office as service requests.` : "Sent to the office." });
      }
      router.refresh();
      if (next) setStep(next);
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
    <div className="tr-split tr-split--left" style={{ ["--tr-side" as string]: "290px" }}>
      <input ref={camera} type="file" accept="image/*" capture="environment" onChange={(e) => onPicked(e.target.files)} hidden />

      <aside className="tr-card tr-steps">
        <div className="tr-steps__h">
          <strong>{p.weekLabel}</strong>
          <span className="tr-small">{done} of {steps.length} done{sentAt ? ` · sent ${new Date(sentAt).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", hour: "numeric", minute: "2-digit" }).replace(",", "")}` : ""}</span>
          <div className="tr-bar tr-bar--thin" style={{ marginTop: 10 }} aria-hidden="true"><span style={{ width: `${(done / steps.length) * 100}%` }} /></div>
        </div>
        {steps.map((s, i) => (
          <button key={s.key} type="button" aria-current={s.key === step ? "step" : undefined} onClick={() => { setMsg(null); setStep(s.key); }} className={`tr-step${s.key === step ? " is-on" : ""}`}>
            <span className={`tr-step__c${s.done ? " is-done" : ""}`}>{s.done ? <I d={TRADE_ICON.tick} size={18} /> : i + 1}</span>
            <span className="tr-step__t">
              <strong>{s.title}</strong>
              <span className={s.warn ? "is-warn" : undefined}>{s.status}</span>
            </span>
          </button>
        ))}
      </aside>

      <section className="tr-card tr-stack" style={{ gap: 18, padding: "22px 22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <span className="tr-kicker" style={{ textTransform: "none", letterSpacing: 0 }}>Step {idx + 1} of {MONDAY_STEPS.length}</span>
            <h2 style={{ fontSize: 26, lineHeight: "32px", fontWeight: 900, marginTop: 2 }}>{current.title}</h2>
            <p className="tr-muted" style={{ marginTop: 4 }}>{current.hint}</p>
          </div>
          {cur.done && <span className="tr-chip tr-chip--good">Done ✓</span>}
        </div>

        {step === "walkaround" && (
          <div className="tr-shots">
            {PHOTO_ANGLES.map((a) => {
              const on = shot.includes(a);
              return (
                <button key={a} type="button" aria-pressed={on} onClick={() => shootFor(angleKey(a), a)} className={`tr-shot${on ? " is-on" : ""}`} disabled={busy}>
                  <I d={on ? TRADE_ICON.tick : TRADE_ICON.camera} size={24} />
                  {a}
                  <span>{on ? "Taken · tap for another" : "Tap to take"}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === "tidy" && (
          <div className="tr-rows">
            {TIDY_LINES.map((t) => {
              const on = items[t.key]?.state === "ok";
              return (
                <label key={t.key} className="tr-tick" style={{ borderTop: "1px solid var(--tr-line)", padding: "4px 0" }}>
                  <input type="checkbox" checked={on} onChange={() => setEntry(t.key, { state: on ? null : "ok" })} />
                  {t.label}
                </label>
              );
            })}
          </div>
        )}

        {step === "check" && (
          <>
            {flagged.map((item) => {
              const k = vehicleKey(item);
              const e = items[k] ?? {};
              const hasPhoto = photoKeys.includes(k);
              return (
                <div key={k} className="tr-flag">
                  <div className="tr-flag__h">
                    <span className="tr-row__ic" style={{ width: 36, height: 36 }}><I d={TRADE_ICON.warn} size={18} /></span>
                    <strong>{item}: needs a look</strong>
                    <em>{e.reported ? "Sent to the office" : "Goes to the office as a service request"}</em>
                  </div>
                  <textarea className="tr-input" aria-label={`What's wrong with ${item}`} placeholder="What did you find?" value={e.note ?? ""} onChange={(ev) => setEntry(k, { note: ev.target.value })} />
                  <div className="tr-flag__opts">
                    <button type="button" aria-pressed={e.drive === true} className={e.drive === true ? "is-on" : undefined} onClick={() => setEntry(k, { drive: true })}>Can still drive it</button>
                    <button type="button" aria-pressed={e.drive === false} className={e.drive === false ? "is-stop" : undefined} onClick={() => setEntry(k, { drive: false })}>Don&rsquo;t drive it</button>
                    <button type="button" className={hasPhoto ? "is-on" : undefined} onClick={() => shootFor(k, item)} disabled={busy}>
                      {hasPhoto ? "✓ Photo added" : "+ Add photo"}
                    </button>
                  </div>
                </div>
              );
            })}
            {VEHICLE_CHECK.map((g) => (
              <div key={g.group}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <span className="tr-label">{g.group}</span>
                  <button
                    type="button" className="tr-link" style={{ background: "none", border: 0, font: "inherit", fontSize: 15, cursor: "pointer", minHeight: 40 }}
                    onClick={() => setItems((s) => {
                      const out = { ...s };
                      for (const it of g.items) if (!out[vehicleKey(it)]?.state) out[vehicleKey(it)] = { ...out[vehicleKey(it)], state: "ok" };
                      return out;
                    })}
                  >
                    Mark the rest OK
                  </button>
                </div>
                <div className="tr-checkgrid">
                  {g.items.map((it) => {
                    const k = vehicleKey(it);
                    const v = items[k]?.state;
                    return (
                      <div className="tr-checkrow" key={it}>
                        <span>{it}</span>
                        <span className="tr-ok">
                          <button type="button" aria-pressed={v === "ok"} className={v === "ok" ? "is-ok" : undefined} onClick={() => setEntry(k, { state: "ok" })}>OK</button>
                          <button type="button" aria-pressed={v === "action"} className={v === "action" ? "is-bad" : undefined} onClick={() => setEntry(k, { state: "action" })}>Needs a look</button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {step === "stock" && (
          <>
            {VAN_STOCK.map((g) => (
              <details key={g.group} open>
                <summary className="tr-label" style={{ cursor: "pointer", padding: "6px 0" }}>{g.group}</summary>
                <div className="tr-rows">
                  {g.items.map((it) => {
                    const k = itemKey(g.group, it.item);
                    const q = counts[k];
                    const low = q != null && q <= it.min;
                    const set = (n: number | null) => setCounts((s) => ({ ...s, [k]: n }));
                    return (
                      <div className="tr-row" key={it.item} style={{ minHeight: 64 }}>
                        <span className="tr-row__k">
                          <strong style={{ fontSize: 16.5 }}>{it.item}</strong>
                          <span className={low ? "is-warn" : undefined}>{low ? "Low · " : ""}keep {it.min} {it.unit}</span>
                        </span>
                        <span className="tr-count">
                          <button type="button" aria-label={`One less ${it.item}`} onClick={() => set(Math.max(0, (q ?? 0) - 1))}>&minus;</button>
                          {q == null ? <em>—</em> : <strong>{q}</strong>}
                          <button type="button" aria-label={`One more ${it.item}`} onClick={() => set((q ?? 0) + 1)}>+</button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </details>
            ))}
            <p className={lowNow ? "tr-note tr-note--warn" : "tr-small"}>
              {lowNow
                ? `${lowNow} ${lowNow === 1 ? "line is" : "lines are"} at or under the minimum. They go on your order from the last step.`
                : "Count what's actually on the van. Anything left at — isn't counted."}
            </p>
          </>
        )}

        {step === "km" && (
          <>
            <label className="tr-field" style={{ maxWidth: 420 }}>
              Odometer today
              <input type="text" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} placeholder="e.g. 6,720" />
            </label>
            <p className="tr-small">
              {p.lastKm
                ? `Last reading ${p.lastKm.odometer.toLocaleString("en-AU")} km on ${new Date(`${p.lastKm.on}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}.`
                : "No earlier reading to compare against."}
              {kmNote ? ` ${kmNote}` : ""}
            </p>
            <div className="tr-stack tr-stack--sm">
              <span style={{ fontWeight: 800 }}>Fuel</span>
              <div className="tr-pills">
                {FUEL_LEVELS.map((f) => (
                  <button key={f} type="button" aria-pressed={fuel === f} className={`tr-pill${fuel === f ? " is-on" : ""}`} onClick={() => setFuel(f)}>{f}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === "send" && (
          <>
            <div className="tr-rows">
              {steps.slice(0, -1).map((s) => (
                <div className="tr-row" key={s.key}>
                  <span className={`tr-step__c${s.done ? " is-done" : ""}`}>{s.done ? <I d={TRADE_ICON.tick} size={18} /> : "!"}</span>
                  <span className="tr-row__k">
                    <strong style={{ fontSize: 16.5 }}>{s.title}</strong>
                    <span className={s.warn ? "is-warn" : undefined}>{s.status}</span>
                  </span>
                  {!s.done && <button type="button" className="tr-btn tr-btn--sm" onClick={() => setStep(s.key)}>Finish it</button>}
                </div>
              ))}
            </div>
            {flagged.length > 0 && (
              <p className="tr-note tr-note--warn">
                {flagged.length === 1 ? `${flagged[0]} goes` : `${flagged.length} lines go`} to the office as {flagged.length === 1 ? "a service request" : "service requests"} when you send.
              </p>
            )}
            {lowNow > 0 && (
              <Link href="/trade/van/parts?low=1" className="tr-banner">
                {lowNow} low on the van — put them on your order <I d={TRADE_ICON.chevron} />
              </Link>
            )}
          </>
        )}

        {msg && <p className={msg.ok ? "tr-note tr-note--good" : "tr-note tr-note--warn"} role="status">{msg.text}</p>}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", paddingTop: 4 }}>
          <button type="button" className="tr-btn" disabled={idx === 0 || busy} onClick={() => setStep(MONDAY_STEPS[Math.max(0, idx - 1)].key)}>Back</button>
          {step === "walkaround" ? (
            <button type="button" className="tr-btn tr-btn--go" disabled={busy} onClick={() => setStep("tidy")}>Next</button>
          ) : (
            <button type="button" className="tr-btn tr-btn--go" disabled={busy} onClick={() => go(nextKey)}>
              {busy ? "Saving…" : step === "send" ? (sentAt ? "Send again" : "Send to the office") : "Save & next"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
