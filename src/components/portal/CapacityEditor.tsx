"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CREW_LEVELS, LEVEL_BILLABLE, defaultsFor, computeCapacity, type CrewLevel, type Costing, type CapSettings } from "@/lib/portal/crew";
import { saveCapSettings, saveCrew, addCrewPerson, removeCrewPerson } from "@/app/portal/finance/capacity/actions";

type Row = { id: string; name: string; email: string | null; level: CrewLevel | ""; costing: Costing };

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const money2 = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hrs = (n: number) => `${Math.round(n).toLocaleString("en-AU")} hrs`;
const parse = (v: string) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };

function CapField({ label, value, onChange, post }: { label: string; value: number; onChange: (n: number) => void; post?: string }) {
  return (
    <label className="pt-cap__f">
      <span>{label}</span>
      <span className="pt-calc__field">
        <input type="number" min="0" value={value} onChange={(e) => onChange(parse(e.target.value))} />
        {post && <span className="pt-calc__post">{post}</span>}
      </span>
    </label>
  );
}

export function CapacityEditor({ people, settings, dbReady, canManage }: { people: { id: string; name: string; email: string | null; level: CrewLevel | null; costing: Costing }[]; settings: CapSettings; dbReady: boolean; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [delId, setDelId] = useState<string | null>(null);

  const [s, setS] = useState<CapSettings>(settings);
  const [rows, setRows] = useState<Row[]>(people.map((p) => ({ id: p.id, name: p.name, email: p.email, level: p.level ?? "", costing: { ...p.costing } })));

  function removeRow(id: string, email: string | null) {
    start(async () => {
      const res = await removeCrewPerson({ userId: id, email });
      if (res.ok) { setRows((rs) => rs.filter((r) => r.id !== id)); setDelId(null); }
      else { setMsg(res.error || "Couldn't remove."); setDelId(null); }
    });
  }
  const [add, setAdd] = useState<{ open: boolean; name: string; email: string; level: CrewLevel; msg: string }>({ open: false, name: "", email: "", level: "tradesman", msg: "" });

  function addPerson() {
    setAdd((a) => ({ ...a, msg: "" }));
    start(async () => {
      const res = await addCrewPerson({ name: add.name, email: add.email, level: add.level });
      if (res.ok && res.id) {
        setRows((rs) => [...rs, { id: res.id as string, name: add.name.trim(), email: add.email.trim() || null, level: add.level, costing: { ...defaultsFor(add.level) } }]);
        setAdd({ open: false, name: "", email: "", level: "tradesman", msg: "" });
      } else {
        setAdd((a) => ({ ...a, msg: res.error || "Couldn't add them." }));
      }
    });
  }

  const setCosting = (id: string, patch: Partial<Costing>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, costing: { ...r.costing, ...patch } } : r)));
  const setLevel = (id: string, level: CrewLevel) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, level, costing: { ...defaultsFor(level), rateOverride: r.costing.rateOverride } } : r)));

  const costed = useMemo(() => rows.filter((r) => r.level !== "").map((r) => ({ id: r.id, name: r.name, level: r.level as CrewLevel, costing: r.costing })), [rows]);
  const cap = useMemo(() => computeCapacity(costed, s), [costed, s]);
  const rateById = useMemo(() => new Map(cap.rates.map((x) => [x.id, x])), [cap]);
  const hasHrs = cap.totalBillHrs > 0;
  const show = (n: number) => (hasHrs ? money2(n) : "—");

  function save() {
    setMsg("");
    start(async () => {
      for (const r of rows) if (r.level !== "") await saveCrew({ userId: r.id, level: r.level, costing: r.costing });
      const res = await saveCapSettings(s);
      setMsg(res.ok ? "Saved." : res.error || "Couldn't save.");
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="pt-calc">
      <div className="pt-calc__inputs">
        {!dbReady && <div className="pt-note pt-note--warn"><strong>Database not connected.</strong> Costing won&rsquo;t save until the Supabase keys are set.</div>}

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">Settings</h3>
          <div className="pt-cap__row3">
            <CapField label="Weeks / year" value={s.weeksYear} onChange={(v) => setS({ ...s, weeksYear: v })} />
            <CapField label="On-costs (super etc.)" value={s.oncosts} onChange={(v) => setS({ ...s, oncosts: v })} post="%" />
            <CapField label="Margin" value={s.margin} onChange={(v) => setS({ ...s, margin: v })} post="%" />
          </div>
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">The crew</h3>
          <p className="pt-calc__hint">Your team members. Give each a level, tweak their numbers, and their charge-out rate falls out automatically — override it if you need to.</p>
          {rows.length === 0 && <div className="pf-empty">No team members yet — add them in Admin → Team &amp; access.</div>}
          {rows.map((r) => {
            const isOffice = r.level !== "" && !LEVEL_BILLABLE[r.level];
            const rt = rateById.get(r.id);
            return (
              <div key={r.id} className="pt-cap__crew">
                <div className="pt-cap__crewhead">
                  <span className="pt-cap__name pt-cap__name--ro">{r.name}</span>
                  <select className="pt-cap__type" value={r.level} onChange={(e) => setLevel(r.id, e.target.value as CrewLevel)}>
                    <option value="" disabled>Choose a level…</option>
                    {CREW_LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                  </select>
                  {canManage && (delId === r.id ? (
                    <span className="pt-cap__del">
                      <button type="button" className="pt-btn pt-btn--danger pt-btn--sm" disabled={pending} onClick={() => removeRow(r.id, r.email)}>Remove</button>
                      <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={pending} onClick={() => setDelId(null)}>Cancel</button>
                    </span>
                  ) : (
                    <button type="button" className="pf-x" aria-label={`Remove ${r.name}`} onClick={() => setDelId(r.id)}>×</button>
                  ))}
                </div>
                {r.level === "" ? (
                  <div className="pt-cap__unset">Pick a level to cost this person in.</div>
                ) : (
                  <>
                    <div className="pt-cap__grid">
                      <CapField label="Hours / week" value={r.costing.hrsWeek} onChange={(v) => setCosting(r.id, { hrsWeek: v })} />
                      <CapField label="Wage $/hr" value={r.costing.wage} onChange={(v) => setCosting(r.id, { wage: v })} />
                      {!isOffice && <CapField label="Leave (days)" value={r.costing.leaveDays} onChange={(v) => setCosting(r.id, { leaveDays: v })} />}
                      {!isOffice && <CapField label="Pub. hols (days)" value={r.costing.phDays} onChange={(v) => setCosting(r.id, { phDays: v })} />}
                      {!isOffice && <CapField label="Sick (days)" value={r.costing.sickDays} onChange={(v) => setCosting(r.id, { sickDays: v })} />}
                      {r.level === "apprentice" && <CapField label="School (days)" value={r.costing.schoolDays} onChange={(v) => setCosting(r.id, { schoolDays: v })} />}
                      {!isOffice && <CapField label="Driving hrs/wk" value={r.costing.travelHrsWeek} onChange={(v) => setCosting(r.id, { travelHrsWeek: v })} />}
                      {!isOffice && <CapField label="Admin hrs/wk" value={r.costing.adminHrsWeek} onChange={(v) => setCosting(r.id, { adminHrsWeek: v })} />}
                      {r.level === "hybrid" && <CapField label="Office hrs/wk" value={r.costing.officeHrsWeek} onChange={(v) => setCosting(r.id, { officeHrsWeek: v })} />}
                    </div>
                    <div className="pt-cap__crewsum">
                      {isOffice ? (
                        <span>Non-billable — counted in office overhead</span>
                      ) : (
                        <>
                          <span>Billable <strong>{hrs(rt?.billHrs ?? 0)}</strong></span>
                          <span className="pt-cap__rate">
                            Rate
                            <strong>{rt?.rate != null ? money(rt.rate) : "—"}</strong>
                            <span className="pt-cap__override">
                              override
                              <input type="number" min="0" placeholder={rt?.autoRate != null ? String(Math.round(rt.autoRate)) : "auto"} value={r.costing.rateOverride ?? ""} onChange={(e) => setCosting(r.id, { rateOverride: e.target.value === "" ? null : parse(e.target.value) })} />
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {canManage && (add.open ? (
            <div className="pt-cap__addform">
              <input className="pt-cap__name" placeholder="Name" value={add.name} onChange={(e) => setAdd((a) => ({ ...a, name: e.target.value }))} />
              <input className="pt-cap__addemail" placeholder="Email (optional — for portal login)" value={add.email} onChange={(e) => setAdd((a) => ({ ...a, email: e.target.value }))} />
              <select className="pt-cap__type" value={add.level} onChange={(e) => setAdd((a) => ({ ...a, level: e.target.value as CrewLevel }))}>
                {CREW_LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
              </select>
              <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setAdd({ open: false, name: "", email: "", level: "tradesman", msg: "" })} disabled={pending}>Cancel</button>
              <button type="button" className="pt-btn pt-btn--orange pt-btn--sm" onClick={addPerson} disabled={pending || !add.name.trim()}>Add</button>
            </div>
          ) : (
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setAdd((a) => ({ ...a, open: true }))}>+ Add a person</button>
          ))}
          {add.msg && <div className="pt-inline is-err" style={{ marginTop: 8 }}>{add.msg}</div>}
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">The other overheads (per year)</h3>
          <p className="pt-calc__hint">Office &amp; non-billable staff come from the crew above. Add the rest here.</p>
          <div className="pt-calc__row"><span>Vehicles <em>(rego, insurance, fuel, servicing)</em></span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" value={s.vehicles} onChange={(e) => setS({ ...s, vehicles: parse(e.target.value) })} /></span></div>
          <div className="pt-calc__row"><span>Standard <em>(tools, marketing, rent, software)</em></span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" value={s.standard} onChange={(e) => setS({ ...s, standard: parse(e.target.value) })} /></span></div>
        </div>
      </div>

      <div className="pt-calc__result">
        <div className="pt-calc__result-lead">Blended charge-out</div>
        <div className="pt-calc__big">{hasHrs ? <>{money(cap.costPerHr * (1 + s.margin / 100))}<span> /hr</span></> : "—"}</div>
        {!hasHrs && <p className="pt-calc__note" style={{ marginTop: 0 }}>Give at least one person a billable level (Tradesman, Apprentice…) to see the rates.</p>}

        <div className="pt-calc__breakdown">
          <div><span>Billable hours / year</span><strong>{hrs(cap.totalBillHrs)}</strong></div>
          <div><span>Field utilisation</span><strong>{cap.paidBillHrs ? Math.round((cap.totalBillHrs / cap.paidBillHrs) * 100) : 0}%</strong></div>
          <div className="pt-calc__break-total"><span>Cost per billable hour</span><strong>{show(cap.costPerHr)}</strong></div>
        </div>

        <div className="pt-cap__layers">
          <div className="pt-cap__layers-h">What makes up the hour</div>
          {cap.layers.map((l) => (
            <div key={l.key} className="pt-cap__layer"><span className="pt-cap__layer-lbl">{l.label}</span><span className="pt-cap__layer-val">{show(l.perHr)}</span></div>
          ))}
          <div className="pt-cap__layer pt-cap__layer--total"><span className="pt-cap__layer-lbl">Cost / billable hour</span><span className="pt-cap__layer-val">{show(cap.costPerHr)}</span></div>
        </div>

        <div className="pt-calc__charge">
          <span>Total to recover / yr</span>
          <strong>{money(cap.totalCost)}</strong>
        </div>

        <div className="pt-cap__save">
          {msg && <span className={`pt-inline ${msg === "Saved." ? "is-ok" : "is-err"}`}>{msg}</span>}
          <button type="button" className="pt-btn pt-btn--orange" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save"}</button>
        </div>
        <p className="pt-calc__note">Rates flow into the Job calculator, so each person prices at their own rate. Saved for the whole team.</p>
      </div>
    </div>
  );
}
