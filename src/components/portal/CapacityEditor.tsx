"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CREW_LEVELS, LEVEL_BILLABLE, LEVEL_LABEL, OVERHEAD_FIELDS, OVERHEAD_GROUPS,
  computeCapacity, crewCombos, defaultsFor, overheadsOf, overheadTotal,
  type CapSettings, type Costing, type CrewLevel,
} from "@/lib/portal/crew";
import { saveCapSettings, saveCrew, addCrewPerson, removeCrewPerson } from "@/app/portal/finance/capacity/actions";

type Row = { id: string; name: string; email: string | null; level: CrewLevel | ""; costing: Costing };

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const money2 = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hrs = (n: number) => `${Math.round(n).toLocaleString("en-AU")} hrs`;
const parse = (v: string) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };

const TABS = [
  { k: "crew", label: "The crew" },
  { k: "overheads", label: "Overheads" },
  { k: "rates", label: "What we charge" },
] as const;
type Tab = (typeof TABS)[number]["k"];

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

export type XeroExpense = { label: string; section: string; amount: number };
export type XeroState = { state: "off" | "failed" | "empty" | "ok"; sections: string[]; span: string };

export function CapacityEditor({
  people, settings, dbReady, canManage, initialTab, xeroExpenses = [], xero,
}: {
  people: { id: string; name: string; email: string | null; level: CrewLevel | null; costing: Costing }[];
  settings: CapSettings; dbReady: boolean; canManage: boolean; initialTab?: Tab;
  xeroExpenses?: XeroExpense[];
  xero?: XeroState;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab ?? "crew");

  const [s, setS] = useState<CapSettings>({ ...settings, overheads: { ...overheadsOf(settings) }, xeroMap: { ...(settings.xeroMap ?? {}) } });
  const [rows, setRows] = useState<Row[]>(people.map((p) => ({ id: p.id, name: p.name, email: p.email, level: p.level ?? "", costing: { ...p.costing } })));
  const [add, setAdd] = useState<{ open: boolean; name: string; email: string; level: CrewLevel; msg: string }>({ open: false, name: "", email: "", level: "tradesman", msg: "" });

  const setCosting = (id: string, patch: Partial<Costing>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, costing: { ...r.costing, ...patch } } : r)));
  const setLevel = (id: string, level: CrewLevel) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, level, costing: { ...defaultsFor(level), rateOverride: r.costing.rateOverride } } : r)));
  const setOh = (key: string, v: number) => setS((prev) => ({ ...prev, overheads: { ...overheadsOf(prev), [key]: v } }));

  const xeroMap = s.xeroMap ?? {};
  /** What Xero says a given overhead line came to over the last twelve months. */
  const xeroTotal = (key: string) =>
    xeroExpenses.filter((x) => xeroMap[x.label] === key).reduce((a, x) => a + x.amount, 0);
  const accountsFor = (key: string) => xeroExpenses.filter((x) => xeroMap[x.label] === key);
  const unmapped = xeroExpenses.filter((x) => !xeroMap[x.label]);

  /**
   * Assigning an account moves the money as well as the label: the line's figure
   * becomes what Xero says, right away, and gets saved that way — so the capacity
   * maths and everything downstream keep reading one set of numbers.
   */
  function assign(label: string, key: string) {
    setS((prev) => {
      const map = { ...(prev.xeroMap ?? {}) };
      const was = map[label];
      if (key) map[label] = key; else delete map[label];
      const oh = { ...overheadsOf(prev) };
      const recount = (k: string) => {
        if (!k) return;
        oh[k] = xeroExpenses.filter((x) => (x.label === label ? key === k : map[x.label] === k)).reduce((a, x) => a + x.amount, 0);
      };
      recount(key);
      if (was && was !== key) recount(was);
      return { ...prev, xeroMap: map, overheads: oh };
    });
  }

  const costed = useMemo(() => rows.filter((r) => r.level !== "").map((r) => ({ id: r.id, name: r.name, level: r.level as CrewLevel, costing: r.costing })), [rows]);
  const cap = useMemo(() => computeCapacity(costed, s), [costed, s]);
  const rateById = useMemo(() => new Map(cap.rates.map((x) => [x.id, x])), [cap]);
  const combos = useMemo(() => crewCombos(costed, cap.rates), [costed, cap]);
  const ohTotal = overheadTotal(s);
  const hasHrs = cap.totalBillHrs > 0;
  const show = (n: number) => (hasHrs ? money2(n) : "—");
  const blended = hasHrs ? cap.costPerHr * (1 + s.margin / 100) : null;

  // Grouped so the crew reads as the team does — all the apprentices together,
  // all the tradesmen together — rather than one flat list.
  const grouped = useMemo(() => {
    const order = [...CREW_LEVELS.map((l) => l.key), ""] as (CrewLevel | "")[];
    return order
      .map((lv) => ({ level: lv, rows: rows.filter((r) => r.level === lv) }))
      .filter((g) => g.rows.length > 0);
  }, [rows]);

  function removeRow(id: string, email: string | null) {
    start(async () => {
      const res = await removeCrewPerson({ userId: id, email });
      if (res.ok) { setRows((rs) => rs.filter((r) => r.id !== id)); setDelId(null); }
      else { setMsg(res.error || "Couldn't remove."); setDelId(null); }
    });
  }

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
    <div className="pt-cap">
      {!dbReady && <div className="pt-note pt-note--warn"><strong>Database not connected.</strong> Costing won&rsquo;t save until the Supabase keys are set.</div>}

      {/* the numbers that matter, on every tab */}
      <div className="pt-cap__strip">
        <div className="pt-cap__stripcell">
          <span>Blended charge-out</span>
          <strong>{blended !== null ? <>{money(blended)}<em>/hr</em></> : "—"}</strong>
        </div>
        <div className="pt-cap__stripcell">
          <span>Cost per billable hour</span>
          <strong>{show(cap.costPerHr)}</strong>
        </div>
        <div className="pt-cap__stripcell">
          <span>Billable hours a year</span>
          <strong>{hrs(cap.totalBillHrs)}</strong>
        </div>
        <div className="pt-cap__stripcell">
          <span>Overheads a year</span>
          <strong>{money(ohTotal)}</strong>
        </div>
      </div>

      <div className="pt-cap__tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.k} type="button" role="tab" aria-selected={tab === t.k} className={`pt-cap__tab${tab === t.k ? " is-on" : ""}`} onClick={() => setTab(t.k)}>{t.label}</button>
        ))}
      </div>

      {tab === "crew" && (
        <>
          <section className="pt-panel">
            <h2 className="pt-panel__h">How the year works</h2>
            <p className="pt-panel__sub">The settings every person&rsquo;s costing is worked out against.</p>
            <div className="pt-cap__row3">
              <CapField label="Weeks / year" value={s.weeksYear} onChange={(v) => setS({ ...s, weeksYear: v })} />
              <CapField label="On-costs (super etc.)" value={s.oncosts} onChange={(v) => setS({ ...s, oncosts: v })} post="%" />
              <CapField label="Margin" value={s.margin} onChange={(v) => setS({ ...s, margin: v })} post="%" />
            </div>
          </section>

          {rows.length === 0 && <div className="pf-empty">No team members yet — add one below, or in Admin → Team &amp; access.</div>}

          {grouped.map((g) => (
            <section key={g.level || "unset"} className="pt-panel">
              <h2 className="pt-panel__h">
                {g.level === "" ? "Not costed yet" : LEVEL_LABEL[g.level]}
                <span className="pt-tm__count">{g.rows.length}</span>
              </h2>
              {g.level !== "" && <p className="pt-panel__sub">{CREW_LEVELS.find((l) => l.key === g.level)?.blurb}</p>}

              {g.rows.map((r) => {
                const isOffice = r.level !== "" && !LEVEL_BILLABLE[r.level];
                const rt = rateById.get(r.id);
                const ridesAlong = !isOffice && r.level !== "" && !r.costing.ownVan;
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
                        {!isOffice && (
                          <div className="pt-cap__van">
                            <div className="pt-seg" role="group" aria-label="Van">
                              <button type="button" className={`pt-seg__b${r.costing.ownVan ? " is-on" : ""}`} aria-pressed={r.costing.ownVan} onClick={() => setCosting(r.id, { ownVan: true })}>Own van</button>
                              <button type="button" className={`pt-seg__b pt-seg__b--repair${r.costing.ownVan ? "" : " is-on"}`} aria-pressed={!r.costing.ownVan} onClick={() => setCosting(r.id, { ownVan: false })}>Rides with a tech</button>
                            </div>
                            <span className="pt-cap__vannote">
                              {r.costing.ownVan
                                ? "Charged out at their own rate."
                                : "Not charged — the customer pays for the tech. Their wage is carried as overhead."}
                            </span>
                          </div>
                        )}

                        <div className="pt-cap__grid">
                          <CapField label="Hours / week" value={r.costing.hrsWeek} onChange={(v) => setCosting(r.id, { hrsWeek: v })} />
                          <CapField label="Wage $/hr" value={r.costing.wage} onChange={(v) => setCosting(r.id, { wage: v })} />
                          <CapField label="Leave (days)" value={r.costing.leaveDays} onChange={(v) => setCosting(r.id, { leaveDays: v })} />
                          <CapField label="Pub. hols (days)" value={r.costing.phDays} onChange={(v) => setCosting(r.id, { phDays: v })} />
                          <CapField label="Sick (days)" value={r.costing.sickDays} onChange={(v) => setCosting(r.id, { sickDays: v })} />
                          <CapField label="RDOs (days)" value={r.costing.rdoDays} onChange={(v) => setCosting(r.id, { rdoDays: v })} />
                          {r.level === "apprentice" && <CapField label="School (days)" value={r.costing.schoolDays} onChange={(v) => setCosting(r.id, { schoolDays: v })} />}
                          {!isOffice && !ridesAlong && <CapField label="Driving hrs/wk" value={r.costing.travelHrsWeek} onChange={(v) => setCosting(r.id, { travelHrsWeek: v })} />}
                          {!isOffice && !ridesAlong && <CapField label="Admin hrs/wk" value={r.costing.adminHrsWeek} onChange={(v) => setCosting(r.id, { adminHrsWeek: v })} />}
                          {r.level === "hybrid" && <CapField label="Office hrs/wk" value={r.costing.officeHrsWeek} onChange={(v) => setCosting(r.id, { officeHrsWeek: v })} />}
                          <CapField label="Overtime rate" value={r.costing.otMult} onChange={(v) => setCosting(r.id, { otMult: v })} post="×" />
                          <CapField label="Night rate" value={r.costing.nightMult} onChange={(v) => setCosting(r.id, { nightMult: v })} post="×" />
                        </div>

                        <div className="pt-cap__rates">
                          {rt?.costPerHr != null && <span className="pt-cap__allin">Costs us <strong>{money2(rt.costPerHr)}</strong>/hr all in</span>}
                          <span>Paid <strong>{money2(r.costing.wage)}</strong> normal</span>
                          <span>Overtime <strong>{money2(r.costing.wage * r.costing.otMult)}</strong></span>
                          <span>Nights <strong>{money2(r.costing.wage * r.costing.nightMult)}</strong></span>
                          {rt?.rate != null && (
                            <>
                              <span className="pt-cap__ratesplit">Charged <strong>{money(rt.rate)}</strong></span>
                              <span>Overtime <strong>{money(rt.rate * r.costing.otMult)}</strong></span>
                              <span>Nights <strong>{money(rt.rate * r.costing.nightMult)}</strong></span>
                            </>
                          )}
                        </div>

                        <div className="pt-cap__crewsum">
                          {isOffice ? (
                            <span>Non-billable — counted in office overhead</span>
                          ) : ridesAlong ? (
                            <span>Rides along — {money(r.costing.wage * (1 + s.oncosts / 100) * r.costing.hrsWeek * s.weeksYear)} a year, carried as overhead</span>
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
            </section>
          ))}

          {canManage && (
            <section className="pt-panel">
              <h2 className="pt-panel__h">Add someone</h2>
              {add.open ? (
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
              )}
              {add.msg && <div className="pt-inline is-err" style={{ marginTop: 8 }}>{add.msg}</div>}
            </section>
          )}
        </>
      )}

      {tab === "overheads" && (
        <>
          <div className="pt-note">
            Wages don&rsquo;t belong here — the crew tab already carries every wage, including the time you can&rsquo;t bill and anyone riding along. This is everything else the business has to earn back.
          </div>

          {OVERHEAD_GROUPS.map((g) => {
            const fields = OVERHEAD_FIELDS.filter((f) => f.group === g.key);
            const oh = overheadsOf(s);
            const groupTotal = fields.reduce((a, f) => a + (Number(oh[f.key]) || 0), 0);
            return (
              <section key={g.key} className="pt-panel">
                <div className="pt-ov__charthead">
                  <h2 className="pt-panel__h">{g.label}</h2>
                  <span className="pt-cap__grouptotal">{money(groupTotal)}<em>/yr</em></span>
                </div>
                <p className="pt-panel__sub">{g.blurb}</p>
                <div className="pt-cap__ohgrid">
                  {fields.map((f) => {
                    const accs = accountsFor(f.key);
                    return (
                      <label key={f.key} className="pt-cap__f">
                        <span>{f.label}{f.hint ? <em> {f.hint}</em> : null}</span>
                        <span className="pt-calc__field">
                          <span className="pt-calc__pre">$</span>
                          <input type="number" min="0" value={oh[f.key] ?? 0} onChange={(e) => setOh(f.key, parse(e.target.value))} />
                        </span>
                        {accs.length > 0 && (
                          <span className="pt-cap__fromxero">
                            From Xero: {accs.map((a) => a.label).join(", ")}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <section className="pt-panel">
            <div className="pt-ov__charthead">
              <h2 className="pt-panel__h">Pull it from Xero</h2>
              {xeroExpenses.length > 0 && <span className="pt-cap__grouptotal">{unmapped.length} left</span>}
            </div>
            <p className="pt-panel__sub">
              Every expense account Xero has for the last twelve months, biggest first. File one against an overhead line and that
              line takes the real figure — no more typing what you think you spend. Wages aren&rsquo;t here to be filed: the crew tab
              already carries every one.
            </p>

            {xero?.state === "off" && (
              <div className="pt-note pt-note--warn">
                <strong>Xero isn&rsquo;t connected.</strong> Connect it on the Finance overview and the accounts will list here.
              </div>
            )}
            {xero?.state === "failed" && (
              <div className="pt-note pt-note--warn">
                <strong>Xero didn&rsquo;t answer.</strong> The profit &amp; loss report for {xero.span} came back empty — reload in a
                minute, or disconnect and reconnect from the Finance overview.
              </div>
            )}
            {xero?.state === "empty" && (
              <div className="pt-note pt-note--warn">
                <strong>The report came back with no expense accounts.</strong> Xero returned {xero.sections.length}{" "}
                {xero.sections.length === 1 ? "section" : "sections"} for {xero.span}
                {xero.sections.length > 0 ? <> — {xero.sections.join(", ")}</> : null}. If your expenses live under a heading that
                isn&rsquo;t listed there, tell me what it&rsquo;s called and I&rsquo;ll teach it to read that shape.
              </div>
            )}

            {xeroExpenses.length > 0 && (unmapped.length === 0 ? (
                <div className="pf-empty">Every account is filed.</div>
              ) : (
                <div className="pt-cap__xero">
                  {unmapped.slice(0, 40).map((x) => (
                    <div key={x.label} className="pt-cap__xerorow">
                      <span className="pt-cap__xeroid"><strong>{x.label}</strong><em>{x.section}</em></span>
                      <span className="pt-cap__xeroamt">{money(x.amount)}</span>
                      <select className="pt-cap__type" value="" onChange={(e) => assign(x.label, e.target.value)}>
                        <option value="">File it under…</option>
                        {OVERHEAD_GROUPS.map((g) => (
                          <optgroup key={g.key} label={g.label}>
                            {OVERHEAD_FIELDS.filter((f) => f.group === g.key).map((f) => (
                              <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ))}

              {Object.keys(xeroMap).length > 0 && (
                <>
                  <h3 className="pt-pl__subh" style={{ marginTop: 18 }}>Already filed</h3>
                  <div className="pt-cap__xero">
                    {xeroExpenses.filter((x) => xeroMap[x.label]).map((x) => (
                      <div key={x.label} className="pt-cap__xerorow is-filed">
                        <span className="pt-cap__xeroid">
                          <strong>{x.label}</strong>
                          <em>{OVERHEAD_FIELDS.find((f) => f.key === xeroMap[x.label])?.label ?? xeroMap[x.label]}</em>
                        </span>
                        <span className="pt-cap__xeroamt">{money(x.amount)}</span>
                        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => assign(x.label, "")}>Unfile</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
          </section>

          <section className="pt-panel">
            <div className="pt-ov__charthead">
              <h2 className="pt-panel__h">Everything to recover</h2>
              <span className="pt-cap__grouptotal">{money(ohTotal)}<em>/yr</em></span>
            </div>
            <p className="pt-panel__sub">
              Spread across {hrs(cap.totalBillHrs)} of billable time, that&rsquo;s <strong>{hasHrs ? money2(ohTotal / cap.totalBillHrs) : "—"}</strong> of overhead on every hour you bill, before a wage is paid.
            </p>
          </section>
        </>
      )}

      {tab === "rates" && (
        <>
          <section className="pt-panel">
            <h2 className="pt-panel__h">What a crew charges out at</h2>
            <p className="pt-panel__sub">The shapes you actually send to jobs, at the rates above.</p>
            {combos.length === 0 ? (
              <div className="pf-empty">Give at least one person a billable level and their own van to see the rates.</div>
            ) : (
              <div className="pt-cap__combos">
                {combos.map((c) => (
                  <div key={c.key} className="pt-cap__combo">
                    <div className="pt-cap__comboid">
                      <strong>{c.label}</strong>
                      {c.note && <span>{c.note}</span>}
                    </div>
                    <span className="pt-cap__comborate">{money(c.rate)}<em>/hr</em></span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="pt-panel">
            <h2 className="pt-panel__h">What makes up an hour</h2>
            <p className="pt-panel__sub">Every dollar that has to come back out of one billable hour, before margin.</p>
            <div className="pt-cap__layers">
              {cap.layers.map((l) => (
                <div key={l.key} className="pt-cap__layer"><span className="pt-cap__layer-lbl">{l.label}</span><span className="pt-cap__layer-val">{show(l.perHr)}</span></div>
              ))}
              <div className="pt-cap__layer pt-cap__layer--total"><span className="pt-cap__layer-lbl">Cost / billable hour</span><span className="pt-cap__layer-val">{show(cap.costPerHr)}</span></div>
              <div className="pt-cap__layer pt-cap__layer--charge"><span className="pt-cap__layer-lbl">Plus {s.margin}% margin</span><span className="pt-cap__layer-val">{blended !== null ? money2(blended) : "—"}</span></div>
            </div>
          </section>

          <section className="pt-panel">
            <h2 className="pt-panel__h">The year in numbers</h2>
            <div className="pt-pl__heads">
              <div className="pt-pl__head"><span className="pt-pl__headlabel">Billable hours</span><strong className="pt-pl__headval">{hrs(cap.totalBillHrs)}</strong></div>
              <div className="pt-pl__head"><span className="pt-pl__headlabel">Field utilisation</span><strong className="pt-pl__headval">{cap.paidBillHrs ? Math.round((cap.totalBillHrs / cap.paidBillHrs) * 100) : 0}%</strong></div>
              <div className="pt-pl__head"><span className="pt-pl__headlabel">Total to recover</span><strong className="pt-pl__headval">{money(cap.totalCost)}</strong></div>
              <div className="pt-pl__head"><span className="pt-pl__headlabel">Revenue at that rate</span><strong className="pt-pl__headval">{blended !== null ? money(blended * cap.totalBillHrs) : "—"}</strong></div>
            </div>
          </section>
        </>
      )}

      <div className="pt-cap__savebar">
        {msg && <span className={`pt-inline ${msg === "Saved." ? "is-ok" : "is-err"}`}>{msg}</span>}
        <span className="pt-cap__savenote">Rates flow into the Job calculator, so each person prices at their own rate.</span>
        <button type="button" className="pt-btn pt-btn--orange" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}
