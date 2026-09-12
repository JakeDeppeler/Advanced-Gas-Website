"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CREW_LEVELS, LEVEL_BILLABLE, LEVEL_LABEL, LEVEL_PLURAL, OVERHEAD_FIELDS, OVERHEAD_GROUPS,
  computeCapacity, countedElsewhere, crewCombos, defaultsFor, officeCost, overheadsOf, overheadSplit, overheadTotal,
  scaleOf, suggestOverhead,
  type CapSettings, type Costing, type CrewLevel,
  WORK_MODES, MODE_DEFAULTS, assumptionsFor, modeOf, type WorkMode,
} from "@/lib/portal/crew";
import { saveCapSettings, saveCrew, addCrewPerson, removeCrewPerson } from "@/app/portal/finance/capacity/actions";
import { money, money2, hrs, pct } from "@/lib/portal/format";

type Row = { id: string; name: string; email: string | null; level: CrewLevel | ""; costing: Costing };

const parse = (v: string) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };

const TABS = [
  { k: "crew", label: "The crew" },
  { k: "overheads", label: "What it costs" },
  { k: "rates", label: "What we charge" },
  // "Another van" moved to Finance -> Future planning: it is a question about
  // next year, and it was the only tab here that wasn't about today.
  // "What the words mean" is the disclosure in the corner of the tab row.
] as const;
type Tab = (typeof TABS)[number]["k"];

function Stat({ label, value, sub, open, onToggle }: {
  label: string; value: React.ReactNode; sub?: string; open: boolean; onToggle: () => void;
}) {
  return (
    <div className={`pt-cap__stripcell${open ? " is-open" : ""}`}>
      <span>
        {label}
        <button type="button" className="pt-cap__info" aria-expanded={open} aria-label={`What ${label.toLowerCase()} means`} onClick={onToggle}>i</button>
      </span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

/**
 * The explanations live outside the strip on purpose. The strip clips its own
 * corners to stay rounded, and anything absolutely positioned inside it gets
 * clipped with them — which is why the first version opened into nothing.
 */
const STAT_NOTES: Record<string, { label: string; body: string }> = {
  charge: { label: "What we charge an hour", body: "What a job is quoted at. It is what an hour costs us, plus the margin — the money the business keeps once every wage and every overhead has been paid. Change the margin above and this moves with it." },
  cost: { label: "What an hour costs us", body: "Everything one hour of work has to pay for before the business makes a cent: the wage for that hour, plus that hour's share of every overhead — the factory, the office wages, the vans, the insurance, the time the crew is paid for but can't bill. Quote below this and the job loses money however it felt on the day." },
  oh: { label: "Overhead on every hour", body: "The overhead half of what an hour costs. Every hour you bill has to carry this much of the factory, the office, the vans and the marketing before a single wage is paid. Put another van on and the fixed part of it spreads thinner — see the Another van tab." },
  hrs: { label: "Hours we can bill a year", body: "The hours a customer actually pays for, across the year. Counted per van, not per head — a tech and an apprentice on the one job are on site for one van-hour, not two. Everything above divides by this number, which is why it matters more than headcount." },
};

const GLOSSARY: { term: string; body: string }[] = [
  { term: "Paid hours", body: "Every hour someone is paid for in a year — 38 a week across 52 weeks is 1,976. It includes leave, sick days, RDOs, public holidays and trade school, because you pay for all of them." },
  { term: "Billable hours", body: "The hours a customer actually pays for. Paid hours less the days off, less driving, admin and office time. This is the only number the overhead can be divided by, which is why it matters more than headcount." },
  { term: "Utilisation", body: "Billable hours as a share of paid hours. It has a ceiling below 100% that nobody can beat — leave, sick, RDOs, holidays and school are entitlements. The ceiling is the honest best case; the gap below it is travel, admin and office time, and that is the part worth working on." },
  { term: "Overhead", body: "Everything the business spends that isn't the labour going on a job. Rent, fuel, insurance, software, marketing, the office wages. It has to be earned back across the billable hours before a wage is paid." },
  { term: "Fixed overhead", body: "The part that doesn't move when another van goes on the road — the factory, the office, the accountant, the marketing. More vans means the same money spread thinner, which is why the rate can fall." },
  { term: "Per-van overhead", body: "The part that arrives with each van — its fuel, servicing, insurance, tools and phone. It grows one van at a time, so it never spreads thinner." },
  { term: "Cost per billable hour", body: "What one hour you can bill actually costs: the wage for it, plus that hour's share of every overhead. Charge below this and the job loses money no matter how it felt on the day." },
  { term: "Charge-out rate", body: "Cost per billable hour plus the margin. What goes on the quote." },
  { term: "On-costs", body: "What sits on top of a wage — super, workcover, leave loading. A $45 wage costs more than $45." },
  { term: "Chargeable", body: "Someone a customer pays for. An apprentice is chargeable, but only as part of a crew — they are never sent out on their own, and the crew charges more than the tradesman would alone." },
  { term: "Margin", body: "What's left after everything is covered. It isn't profit until the year's overheads have all been earned back." },
];

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
  people, settings, dbReady, canManage, initialTab, xeroExpenses = [], xero, fleetDep = 0, vanCount = 0,
}: {
  people: { id: string; name: string; email: string | null; level: CrewLevel | null; costing: Costing }[];
  settings: CapSettings; dbReady: boolean; canManage: boolean; initialTab?: Tab;
  xeroExpenses?: XeroExpense[];
  xero?: XeroState;
  /** Straight-line depreciation across the fleet, from the Vehicles tab. */
  fleetDep?: number;
  vanCount?: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab ?? "crew");
  // Most overhead lines sit at zero once Xero has filled the ones it can; hiding
  // them turns thirty-odd boxes into the dozen that actually carry money.
  const [showEmpty, setShowEmpty] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [openLines, setOpenLines] = useState<Set<string>>(new Set());
  const [editRates, setEditRates] = useState<Set<string>>(new Set());
  const toggleRates = (id: string) => setEditRates((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleLine = (k: string) => setOpenLines((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });

  const [s, setS] = useState<CapSettings>({ ...settings, oncosts: 0, overheads: { ...overheadsOf(settings) }, xeroMap: { ...(settings.xeroMap ?? {}) } });
  const onSite = modeOf(s) === "onsite";
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
  // Wages, depreciation and job materials are already counted somewhere else.
  // Filing them here would charge the same money twice and lift every rate.
  const toFile = unmapped.filter((x) => !countedElsewhere(x.label));
  const elsewhere = unmapped.filter((x) => countedElsewhere(x.label));
  const suggestions = toFile.map((x) => ({ x, key: suggestOverhead(x.label) })).filter((r) => r.key);
  const filedCount = xeroExpenses.filter((x) => xeroMap[x.label]).length;

  /** What a yearly figure works out to on each hour you can actually bill. */
  const perHour = (annual: number) => (hasHrs && annual ? money2(annual / cap.totalBillHrs) : "—");
  const emptyCount = OVERHEAD_FIELDS.filter((f) => (Number(overheadsOf(s)[f.key]) || 0) === 0).length;

  /** File every account whose name we can place, in one go. */
  function applyAllSuggestions() {
    setS((prev) => {
      const map = { ...(prev.xeroMap ?? {}) };
      for (const { x, key } of suggestions) map[x.label] = key as string;
      const oh = { ...overheadsOf(prev) };
      for (const k of new Set(Object.values(map))) {
        oh[k] = xeroExpenses.filter((e) => map[e.label] === k).reduce((a, e) => a + e.amount, 0);
      }
      return { ...prev, xeroMap: map, overheads: oh };
    });
  }

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
  const perById = useMemo(() => new Map(cap.per.map((x) => [x.p.id, x.c])), [cap]);
  const combos = useMemo(() => crewCombos(costed, cap.rates), [costed, cap]);
  // Every person's wage bill for the year, biggest first, plus why someone's
  // hours aren't billable when they aren't.
  const office = useMemo(() => officeCost(cap), [cap]);

  const crewCost = useMemo(() => {
    const rows = cap.per.filter(({ p }) => LEVEL_BILLABLE[p.level]).map(({ p, c }) => ({
      id: p.id, name: p.name, level: p.level,
      paidHrs: c.paidHrs, billHrs: c.billHrs, wageCost: c.wageCost,
      wage: p.costing.wage,
      // What one hour you can actually bill costs in their wages alone. Leave,
      // sick, RDOs, school and travel are all paid but not billed, so this lands
      // well above the hourly wage — that gap is the point of showing it.
      perBillHr: c.billHrs > 0 ? c.wageCost / c.billHrs : null,
      note: !LEVEL_BILLABLE[p.level] ? "not billable, all overhead" : !p.costing.ownVan ? "rides with a tech, recovered as an uplift on the crew rate" : "",
    })).sort((a, b) => b.wageCost - a.wageCost);
    return {
      rows,
      total: rows.reduce((a, r) => a + r.wageCost, 0),
      paidHrs: rows.reduce((a, r) => a + r.paidHrs, 0),
    };
  }, [cap, rateById]);

  // Two kinds of overhead meet here. The typed and Xero-filed lines are one;
  // the other comes out of the crew tab — office and admin wages, plus the
  // crew's own non-billable time — and those are already in the capacity maths,
  // so they show read-only rather than being added again.
  const split = overheadSplit(s);
  const setScale = (key: string, v: "fixed" | "perVan") =>
    setS((prev) => ({ ...prev, scales: { ...(prev.scales ?? {}), [key]: v } }));

  const ohTyped = overheadTotal(s);
  const ohFromCrew = cap.labourOh + cap.officeOh;
  const ohTotal = ohTyped + ohFromCrew + fleetDep;
  const hasHrs = cap.totalBillHrs > 0;
  const show = (n: number) => (hasHrs ? money2(n) : "—");
  const blended = hasHrs ? cap.costPerHr * (1 + s.margin / 100) : null;

  /** The fixed notes, plus one written on the spot for each crew level. */
  const noteFor = (key: string) => {
    if (STAT_NOTES[key]) return STAT_NOTES[key];
    if (key === "crew" && crewPrice) {
      return {
        label: crewPrice.label,
        body: crewPrice.note
          ?? "What the pair is charged at when both of them are on the one job. The tiles to the left are what one person's hour costs us; this is the quote.",
      };
    }
    const lv = levelHours.find((l) => `lvl:${l.key}` === key);
    if (!lv) return null;
    const who = lv.label.toLowerCase();
    return {
      label: `${lv.label}'s hour`,
      body: lv.ridesAlong
        ? `Just the wage, and no overhead: there is no second van and no second set of overheads, and the tech's hour is already carrying them for that job. Charging it again on the ${who} would be charging it twice. The reason it is not simply their hourly rate is the year: you pay them ${money2(lv.wagePerHr)} an hour with on-costs, for ${hrs(lv.paidHrs)} of the year, and they bill none of those hours themselves because the van does. So the ${hrs(cap.hrsPerVan)} that van can bill has to recover the lot, and that is this figure. It comes back as an uplift on the crew rate over on What we charge, not as overhead.`
        : `${money2(lv.wagePerHr)} an hour is what you pay a ${who} with on-costs, and that is the wage half of this tile. The other ${money2(Math.max(0, lv.perHr - lv.wagePerHr))} is that hour's share of the overhead, which they carry because they take a van out. The hours you pay for but cannot bill are in there too: of the ${hrs(lv.paidHrs)} a year, ${hrs(lv.billHrs)} are billable, and the leave, public holidays, sick days, RDOs, travel and admin that make up the difference are carried as overhead rather than loaded back onto the wage.`,
    };
  };

  // Grouped so the crew reads as the team does — all the apprentices together,
  // all the tradesmen together — rather than one flat list.
  const grouped = useMemo(() => {
    const order = [...CREW_LEVELS.filter((l) => l.billable).map((l) => l.key), ""] as (CrewLevel | "")[];
    return order
      .map((lv) => ({ level: lv, rows: rows.filter((r) => r.level === lv) }))
      .filter((g) => g.rows.length > 0);
  }, [rows]);

  // What an hour of each kind of person costs, broken out of the blended figure
  // beside it. The two are not the same kind of number and the tiles say so.
  // Someone with their own van carries a share of the overhead in their hour.
  // Someone who rides along does not: their cost is deliberately kept out of
  // the shared pool, or a tech working on his own would carry an apprentice who
  // wasn't there. Their figure is their whole cost over the hours of the van
  // they ride in, and it comes back as an uplift on the crew rate.
  const levelHours = useMemo(() => {
    return CREW_LEVELS.filter((l) => l.billable)
      .map((l) => {
        const mine = costed.filter((p) => p.level === l.key);
        if (!mine.length) return null;
        // A level that spends a serious part of its week in the office does not
        // get a tile. Those office hours are already counted as overhead, in
        // the tile four along, so putting the same person up as a crew hour
        // reads their desk time twice: once as the overhead every hour carries
        // and once as the hour itself. A quarter of the week is the line.
        const deskHeavy =
          mine.every((p) => p.costing.hrsWeek > 0 && p.costing.officeHrsWeek / p.costing.hrsWeek >= 0.25);
        if (deskHeavy) return null;
        const mean = (pick: (r: NonNullable<ReturnType<typeof rateById.get>>) => number | null | undefined) => {
          const vals = mine
            .map((p) => { const r = rateById.get(p.id); return r ? pick(r) : null; })
            .filter((v): v is number => v != null);
          return vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : null;
        };
        const perHr = mean((r) => r.costPerHr);
        if (perHr == null) return null;
        // The wage on the clock, and how much of the year it is actually
        // possible to bill. The gap between the two is the whole answer to
        // "how is an apprentice sixty dollars an hour".
        const wagePerHr =
          mine.reduce((a, p) => a + p.costing.wage * (1 + s.oncosts / 100), 0) / mine.length;
        const paidHrs = mine.reduce((a, p) => a + (perById.get(p.id)?.paidHrs ?? 0), 0);
        const billHrs = mine.reduce((a, p) => a + (perById.get(p.id)?.billHrs ?? 0), 0);
        return {
          key: l.key,
          label: l.label,
          count: mine.length,
          perHr,
          wagePerHr,
          paidHrs,
          billHrs,
          // What they go out at, so a crew price can be added up from the same
          // figures the tiles are showing. A ride-along has no rate of their
          // own; what they add to the crew is the uplift.
          charge: mean((r) => r.rate),
          uplift: mean((r) => r.uplift),
          ridesAlong: mine.every((p) => !p.costing.ownVan),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [costed, rateById, perById, s.oncosts]);

  // What a two-hander goes out at. The tiles either side of this are what one
  // person's hour costs; this is what the pair is charged, which is the number
  // you are actually quoting when two of them turn up.
  //
  // Built from the tiles rather than from crewCombos, which ranks every
  // billable level by rate and so pairs the two dearest — and on this crew
  // that put a tradesman next to the field-and-office role, which is the one
  // deliberately left out up here. A crew is the people who turn up.
  const crewPrice = useMemo(() => {
    const solo = levelHours
      .filter((l) => !l.ridesAlong && l.charge != null)
      .sort((a, b) => (b.charge as number) - (a.charge as number));
    if (!solo.length) return null;
    const lead = solo[0];
    const rider = levelHours
      .filter((l) => l.ridesAlong && l.uplift != null)
      .sort((a, b) => (b.uplift as number) - (a.uplift as number))[0];
    if (rider) {
      return {
        label: `${lead.label} + ${rider.label.toLowerCase()}`,
        rate: (lead.charge as number) + (rider.uplift as number),
        note: `What the pair is quoted at. The ${rider.label.toLowerCase()} rides with the ${lead.label.toLowerCase()} rather than taking a van out, so the van still bills one hour for one hour on site and they add ${money(rider.uplift as number)} an hour to the crew rather than a second set of hours. That uplift is what pays for them across the year; a solo ${lead.label.toLowerCase()} does not carry them.`,
      };
    }
    const second = solo[1];
    if (!second) {
      if (solo.length === 1 && lead.count < 2) return null;
      return {
        label: `Two ${LEVEL_PLURAL[lead.key].toLowerCase()}`,
        rate: (lead.charge as number) * 2,
        note: "Two vans and two chargeable bodies on the one job, so both rates apply. This is not a discount for turning up together; it is twice the work getting done.",
      };
    }
    return {
      label: `${lead.label} + ${second.label.toLowerCase()}`,
      rate: (lead.charge as number) + (second.charge as number),
      note: `What the pair is quoted at when both are on the one job. They each have a van and each bill their own hours, so both rates apply: ${money(lead.charge as number)} for the ${lead.label.toLowerCase()} and ${money(second.charge as number)} for the ${second.label.toLowerCase()}.`,
    };
  }, [levelHours]);

  /** Office, admin and operations — a cost to carry, not a crew to schedule. */
  const officeRows = useMemo(
    () => rows.filter((r) => r.level !== "" && !LEVEL_BILLABLE[r.level as CrewLevel]),
    [rows],
  );

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

      {/* Which way the work is being done. Same crew, same wages — what changes
          is how much of a paid day survives travel and between-jobs admin, and
          therefore what an hour has to be charged at. Sits above the numbers
          because it changes every one of them. */}
      <div className="pt-cap__mode">
        <div className="pt-cap__modetabs" role="group" aria-label="How the work is done">
          {WORK_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`pt-cap__modetab${modeOf(s) === m.key ? " is-on" : ""}`}
              aria-pressed={modeOf(s) === m.key}
              onClick={() => setS({ ...s, mode: m.key })}
            >
              <strong>{m.label}</strong>
              <span>{m.blurb}</span>
            </button>
          ))}
        </div>
        {modeOf(s) === "onsite" && (
          <p className="pt-cap__modenote">
            On a commercial site the day is working time. The between-jobs admin is a mobile problem, five jobs
            each with a sheet and a phone call at the end of it, and on one site that happens once for the whole
            job rather than once an hour, so it is costed at nothing. Travel stays at a third: they still drive in
            of a morning and home of an afternoon, it is just one trip instead of five. Nobody is paid differently;
            there is simply more of the day left to bill, which is why the hourly rate below is lower than the
            mobile one. Both percentages are on the <strong>What it costs</strong> tab.
          </p>
        )}
      </div>

      {/* the numbers that matter, on every tab */}
      <div className="pt-cap__stripwrap">
      <div className="pt-cap__strip">
        <Stat
          label="What we charge an hour"
          value={blended !== null ? <>{money(blended)}<em>/hr</em></> : "—"}
          sub={`Cost plus ${s.margin}% margin`}
          open={info === "charge"} onToggle={() => setInfo(info === "charge" ? null : "charge")}
        />
        <Stat
          label="What an hour costs us"
          value={show(cap.costPerHr)}
          sub="Blended, before any margin"
          open={info === "cost"} onToggle={() => setInfo(info === "cost" ? null : "cost")}
        />
        {levelHours.map((l) => (
          <Stat
            key={l.key}
            label={`${l.label}'s hour`}
            value={show(l.perHr)}
            sub={l.ridesAlong ? "Wage only, the van carries the overhead" : "Wage plus overhead share"}
            open={info === `lvl:${l.key}`}
            onToggle={() => setInfo(info === `lvl:${l.key}` ? null : `lvl:${l.key}`)}
          />
        ))}
        {crewPrice && (
          <Stat
            label={crewPrice.label}
            value={hasHrs ? <>{money(crewPrice.rate)}<em>/hr</em></> : "—"}
            sub="Charged for the pair, on one job"
            open={info === "crew"} onToggle={() => setInfo(info === "crew" ? null : "crew")}
          />
        )}
        <Stat
          label="Overhead on every hour"
          value={hasHrs ? money2(ohTotal / cap.totalBillHrs) : "—"}
          sub={`${money(ohTotal)} a year`}
          open={info === "oh"} onToggle={() => setInfo(info === "oh" ? null : "oh")}
        />
        <Stat
          label="Hours we can bill a year"
          value={hrs(cap.totalBillHrs)}
          sub={`${cap.vanCount} ${cap.vanCount === 1 ? "van" : "vans"} · ${hrs(cap.hrsPerVan)} each`}
          open={info === "hrs"} onToggle={() => setInfo(info === "hrs" ? null : "hrs")}
        />
      </div>
      {info && noteFor(info) && (
        <div className="pt-cap__infobody" role="note">
          <strong>{noteFor(info)!.label}</strong>
          <p>{noteFor(info)!.body}</p>
          <button type="button" onClick={() => setInfo(null)} aria-label="Close">×</button>
        </div>
      )}
      </div>

      <div className="pt-cap__tabrow">
        <div className="pt-cap__tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.k} type="button" role="tab" aria-selected={tab === t.k} className={`pt-cap__tab${tab === t.k ? " is-on" : ""}`} onClick={() => setTab(t.k)}>{t.label}</button>
          ))}
        </div>
        {/* The glossary is a reference, not a view of the business. It was
            sitting in the tab row as though it were a fifth thing to look at;
            it is a thing to look up, so it opens in the corner and closes
            again. */}
        <details className="pt-cap__gloss">
          <summary>What the words mean</summary>
          <div className="pt-cap__glossbody">
        <section className="pt-panel">
          <h2 className="pt-panel__h">What the words mean</h2>
          <p className="pt-panel__sub">So everyone reading these numbers is reading the same thing.</p>
          <dl className="pt-words">
            {GLOSSARY.map((g) => (
              <div key={g.term}>
                <dt>{g.term}</dt>
                <dd>{g.body}</dd>
              </div>
            ))}
          </dl>
        </section>
          </div>
        </details>
      </div>

      {tab === "crew" && (
        <>
          <section className="pt-panel">
            <h2 className="pt-panel__h">How the year works</h2>
            <p className="pt-panel__sub">
              The settings every person&rsquo;s costing is worked out against. This tab is the people on the tools — office and
              admin sit under <strong>What it costs</strong>, because they carry no billable hours.
            </p>
            <div className="pt-cap__row3">
              <CapField label="Weeks / year" value={s.weeksYear} onChange={(v) => setS({ ...s, weeksYear: v })} />
              <CapField label="Call-backs" value={s.callbackPct ?? 0} onChange={(v) => setS({ ...s, callbackPct: v })} post="%" />
              <CapField label="Margin" value={s.margin} onChange={(v) => setS({ ...s, margin: v })} post="%" />
            </div>

            <p className="pt-oh__hint" style={{ marginTop: 10 }}>
              Wages here are the wage itself. Super, workers comp and payroll tax sit in the business overhead alongside the rent
              and the fuel, so they are counted once there rather than added on top of every wage as well.{" "}
              <strong>Call-backs</strong> are the hours that go back out to fix our own work — paid for, never billed, so they
              come off what can be billed. At {s.callbackPct ?? 0}% that is{" "}
              {hrs(cap.util.paidHrs * ((s.callbackPct ?? 0) / 100))} a year the vans are out and earning nothing.
            </p>
          </section>

          {onSite && (
            <div className="pt-note">
              <strong>On site.</strong> Driving and between-jobs admin are off the cards, because on a site day the mode
              is already answering for them. Switch back to <strong>Mobile</strong> to set them; the figures are kept
              either way and both modes are costed off the same ones.
            </div>
          )}
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
                                ? "Charged out at their own rate, and their hour carries a share of the overhead."
                                : "Not charged out on their own. Their wage comes back as an uplift on the crew rate, not as overhead: the tech's hour is already paying for that."}
                            </span>
                            {/* The setting that surprises people. A level that
                                normally rides along, ticked as having a van,
                                becomes another van on the road: its own
                                billable hours and its own share of the
                                overhead, which turns a wage into a full rate.
                                Worth saying at the switch rather than leaving
                                it to be worked out from the tiles up top. */}
                            {r.costing.ownVan && !defaultsFor(r.level as CrewLevel).ownVan && (
                              <span className="pt-cap__vanwarn">
                                A {LEVEL_LABEL[r.level as CrewLevel].toLowerCase()} with their own van is costed as
                                another van on the road: their own billable hours, and their hour carrying a share of
                                the overhead. That is what turns their wage into a full rate. If they ride with a
                                tech, switch it across and their hour becomes the wage alone.
                              </span>
                            )}
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
                          {/* On site these two are the fields the mode is
                              already answering, and a driving figure on a card
                              for a day nobody drives is just something else to
                              get wrong. Kept on the mobile card, which is where
                              they are costed from. */}
                          {!isOffice && !ridesAlong && !onSite && <CapField label="Driving hrs/wk" value={r.costing.travelHrsWeek} onChange={(v) => setCosting(r.id, { travelHrsWeek: v })} />}
                          {!isOffice && !ridesAlong && !onSite && <CapField label="Admin hrs/wk" value={r.costing.adminHrsWeek} onChange={(v) => setCosting(r.id, { adminHrsWeek: v })} />}
                          {r.level === "hybrid" && <CapField label="Office hrs/wk" value={r.costing.officeHrsWeek} onChange={(v) => setCosting(r.id, { officeHrsWeek: v })} />}
                        </div>

                        {/* Penalty rates and call-backs live apart from the hours,
                            and locked. They're set once and then read a hundred
                            times, so the default state is reading — a number you
                            can nudge by clicking past it is a number you'll one
                            day find changed and not know when. */}
                        <div className="pt-cap__pen">
                          <div className="pt-cap__penhead">
                            <span>Penalty rates &amp; call-backs</span>
                            <button type="button" className="pt-cap__edit" onClick={() => toggleRates(r.id)}>
                              {editRates.has(r.id) ? "Done" : "Edit"}
                            </button>
                          </div>

                          {editRates.has(r.id) ? (
                            <div className="pt-cap__grid">
                              <CapField label="Overtime" value={r.costing.otMult} onChange={(v) => setCosting(r.id, { otMult: v })} post="×" />
                              <CapField label="Nights" value={r.costing.nightMult} onChange={(v) => setCosting(r.id, { nightMult: v })} post="×" />
                              <CapField
                                label="Call-backs"
                                value={r.costing.callbackPct ?? s.callbackPct ?? 0}
                                onChange={(v) => setCosting(r.id, { callbackPct: v })}
                                post="%"
                              />
                            </div>
                          ) : (
                            <div className="pt-cap__penrows">
                              <div><span>Overtime</span><strong>{r.costing.otMult}×</strong><em>{money2(r.costing.wage * r.costing.otMult)}/hr paid{rt?.rate != null ? ` · ${money(rt.rate * r.costing.otMult)}/hr charged` : ""}</em></div>
                              <div><span>Nights</span><strong>{r.costing.nightMult}×</strong><em>{money2(r.costing.wage * r.costing.nightMult)}/hr paid{rt?.rate != null ? ` · ${money(rt.rate * r.costing.nightMult)}/hr charged` : ""}</em></div>
                              <div>
                                <span>Call-backs</span>
                                <strong>{r.costing.callbackPct ?? s.callbackPct ?? 0}%</strong>
                                <em>{r.costing.callbackPct == null ? "the business figure" : `${hrs((rt?.billHrs ?? 0) * ((r.costing.callbackPct ?? 0) / 100))} a year going back out`}</em>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-cap__rates">
                          {rt?.costPerHr != null && <span className="pt-cap__allin">Costs us <strong>{money2(rt.costPerHr)}</strong>/hr all in</span>}
                          <span>Paid <strong>{money2(r.costing.wage)}</strong>/hr</span>
                          {rt?.rate != null && <span>Charged <strong>{money(rt.rate)}</strong>/hr</span>}
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

          {costed.length > 0 && (
            <section className="pt-panel">
              <div className="pt-ov__charthead">
                <h2 className="pt-panel__h">What the crew costs</h2>
                <span className="pt-cap__grouptotal">{money(crewCost.total)}<em>/yr</em></span>
              </div>
              <p className="pt-panel__sub">
                <strong>Real cost</strong> is what one billable hour of theirs costs in wages — the whole year&rsquo;s pay, on-costs
                included, spread over only the hours a customer pays for. Leave, sick days, RDOs, trade school and driving are all
                paid and none of them are billed, which is why it lands so far above the hourly wage. Office and admin have no
                billable hours at all: their wages sit in the overhead instead.
              </p>
              <div className="pt-oh__ledger">
                <div className="pt-oh__group">
                  <div className="pt-cap__costhead">
                    <span>Person</span><span>Billable hrs</span><span>Paid</span><span>Real cost</span><span>A year</span>
                  </div>
                  {crewCost.rows.map((r) => (
                    <div key={r.id} className="pt-cap__costrow">
                      <span className="pt-cap__costwho">
                        <strong>{r.name}</strong>
                        <em>{LEVEL_LABEL[r.level]} · {hrs(r.paidHrs)} paid{r.note ? ` · ${r.note}` : ""}</em>
                      </span>
                      <span>{r.billHrs > 0 ? hrs(r.billHrs) : "—"}</span>
                      <span>{money2(r.wage)}</span>
                      <strong className={r.perBillHr !== null ? "pt-cap__real" : ""}>{r.perBillHr !== null ? money2(r.perBillHr) : "—"}</strong>
                      <strong>{money(r.wageCost)}</strong>
                    </div>
                  ))}
                  <div className="pt-cap__costrow is-total">
                    <span className="pt-cap__costwho"><strong>The lot</strong><em>{hrs(crewCost.paidHrs)} paid</em></span>
                    <span>{hrs(cap.totalBillHrs)}</span>
                    <span>—</span>
                    <strong>—</strong>
                    <strong>{money(crewCost.total)}</strong>
                  </div>
                </div>
              </div>
            </section>
          )}

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
            Everything the business carries except the crew on the tools — their wages are on the crew tab. Office and admin
            wages, the vans, and every other overhead sit here, because none of them bill an hour and all of them have to be
            earned back across the hours that do.
          </div>

          {/* The two numbers that separate a mobile week from a site week. Both
              start as assumptions and are meant to be replaced with figures off
              a real job. */}
          <section className="pt-panel">
            <h2 className="pt-panel__h">Travel &amp; admin, by how the work is done</h2>
            <p className="pt-panel__sub">
              Each person&rsquo;s travel and admin hours live on their own card. These two dials say how much of that
              survives in each mode, so one set of crew figures covers both. Mobile is 100% of what&rsquo;s on the card,
              which is why nothing moves until you change it.
            </p>
            <div className="pt-cap__modegrid">
              {WORK_MODES.map((m) => {
                const a = assumptionsFor(s, m.key as WorkMode);
                const set = (patch: Partial<typeof a>) =>
                  setS({ ...s, modes: { ...(s.modes ?? {}), [m.key]: { ...a, ...patch } } });
                return (
                  <div key={m.key} className={`pt-cap__modecard${modeOf(s) === m.key ? " is-on" : ""}`}>
                    <h3>{m.label}</h3>
                    <label>
                      <span>Travel kept</span>
                      <input
                        type="number" min={0} max={100} step={5} value={a.travelPct}
                        onChange={(e) => set({ travelPct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                      />
                      <em>%</em>
                    </label>
                    <label>
                      <span>Admin kept</span>
                      <input
                        type="number" min={0} max={100} step={5} value={a.adminPct}
                        onChange={(e) => set({ adminPct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                      />
                      <em>%</em>
                    </label>
                    <p className="pt-cap__modehint">
                      {m.key === "mobile"
                        ? "A residential week as costed on the crew tab."
                        : `Default is ${MODE_DEFAULTS.onsite.travelPct}% travel and ${MODE_DEFAULTS.onsite.adminPct}% admin: the drive in and home, and no between-jobs paperwork. Put real figures in off a site job.`}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {officeRows.length > 0 && (
            <section className="pt-panel">
              <div className="pt-ov__charthead">
                <h2 className="pt-panel__h">The office</h2>
                <span className="pt-cap__grouptotal">{money(office.total)}<em>/yr</em></span>
              </div>
              <p className="pt-panel__sub">
                Nobody here bills an hour, so every dollar of it lands on the hours the vans do bill —{" "}
                <strong>{money2(office.perHr)}</strong> on top of every billable hour, before a tradesman&rsquo;s own wage.
              </p>

              {officeRows.map((r) => {
                const cost = office.rows.find((x) => x.id === r.id)?.cost ?? 0;
                return (
                  <div key={r.id} className="pt-cap__crew">
                    <div className="pt-cap__crewhead">
                      <span className="pt-cap__name pt-cap__name--ro">{r.name}</span>
                      <select className="pt-cap__type" value={r.level} onChange={(e) => setLevel(r.id, e.target.value as CrewLevel)}>
                        {CREW_LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                      </select>
                      <span className="pt-cap__grouptotal">{money(cost)}<em>/yr</em></span>
                    </div>
                    <div className="pt-cap__grid">
                      <CapField label="Hours / week" value={r.costing.hrsWeek} onChange={(v) => setCosting(r.id, { hrsWeek: v })} />
                      <CapField label="Wage $/hr" value={r.costing.wage} onChange={(v) => setCosting(r.id, { wage: v })} />
                      <CapField label="Leave (days)" value={r.costing.leaveDays} onChange={(v) => setCosting(r.id, { leaveDays: v })} />
                      <CapField label="Sick (days)" value={r.costing.sickDays} onChange={(v) => setCosting(r.id, { sickDays: v })} />
                      <CapField label="RDOs (days)" value={r.costing.rdoDays} onChange={(v) => setCosting(r.id, { rdoDays: v })} />
                      <CapField label="Pub. hols (days)" value={r.costing.phDays} onChange={(v) => setCosting(r.id, { phDays: v })} />
                    </div>
                    <div className="pt-cap__crewsum">
                      <span>{perHour(cost)} on every billable hour</span>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          <section className="pt-panel">
            <h2 className="pt-panel__h">Where the business overhead comes from</h2>
            <p className="pt-panel__sub">
              Two ways to get the same number. Either add up what Xero says, account by account, or put in the one figure you
              already know is right. The office wages, the crew&rsquo;s unbillable time and the vans&rsquo; depreciation come from
              the portal either way — they are never typed twice.
            </p>
            <div className="pt-seg" role="group" aria-label="Overhead source">
              <button type="button" className={`pt-seg__b${(s.ohSource ?? "xero") === "xero" ? " is-on" : ""}`}
                aria-pressed={(s.ohSource ?? "xero") === "xero"}
                onClick={() => setS({ ...s, ohSource: "xero" })}>From Xero</button>
              <button type="button" className={`pt-seg__b pt-seg__b--repair${s.ohSource === "internal" ? " is-on" : ""}`}
                aria-pressed={s.ohSource === "internal"}
                onClick={() => setS({ ...s, ohSource: "internal" })}>Our own figure</button>
            </div>

            {s.ohSource === "internal" && (
              <>
                <div className="pt-cap__row3" style={{ marginTop: 16 }}>
                  <label className="pt-cap__f">
                    <span>The business overhead, a year</span>
                    <span className="pt-calc__field">
                      <span className="pt-calc__pre">$</span>
                      <input type="number" min="0" value={s.internalOverhead ?? 0} onChange={(e) => setS({ ...s, internalOverhead: parse(e.target.value) })} />
                    </span>
                  </label>
                  <CapField label="Of that, fixed" value={s.internalFixedPct ?? 55} onChange={(v) => setS({ ...s, internalFixedPct: v })} post="%" />
                </div>
                <div className="pt-oh__checklist">
                  <div className="is-in">
                    <strong>Put in</strong>
                    <ul>
                      <li>The factory, the yard, the power and the rates</li>
                      <li>Insurance, licences and accreditations</li>
                      <li>Fuel, servicing, rego and tyres</li>
                      <li>Tools, software, phones and marketing</li>
                      <li>Super, workers comp and payroll tax — every wage&rsquo;s on-costs</li>
                    </ul>
                  </div>
                  <div className="is-out">
                    <strong>Leave out</strong>
                    <ul>
                      <li>Depreciation on the vans — comes from the Vehicles tab</li>
                      <li>Office, admin and operations wages — come from the crew tab</li>
                      <li>The crew&rsquo;s own wages, billable or not</li>
                      <li>Materials and contractors — those go on the job</li>
                    </ul>
                  </div>
                </div>
                <p className="pt-oh__hint">
                  &ldquo;Fixed&rdquo; is the share that would not move if another van went on the road; the rest travels with each
                  van and is what the Another van tab uses.
                </p>
              </>
            )}
          </section>

          <section className="pt-panel">
            <div className="pt-ov__charthead">
              <h2 className="pt-panel__h">From Xero</h2>
              {xeroExpenses.length > 0 && (
                <span className="pt-oh__status">
                  {filedCount} filed · {elsewhere.length} left out{toFile.length > 0 ? ` · ${toFile.length} to file` : ""}
                </span>
              )}
            </div>

            {xero?.state === "off" && (
              <div className="pt-note pt-note--warn">
                <strong>Xero isn&rsquo;t connected.</strong> Connect it on the Finance overview and your accounts will list here.
              </div>
            )}
            {xero?.state === "failed" && (
              <div className="pt-note pt-note--warn">
                <strong>Xero didn&rsquo;t answer.</strong> The report for {xero.span} came back empty — reload in a minute, or
                reconnect from the Finance overview.
              </div>
            )}
            {xero?.state === "empty" && (
              <div className="pt-note pt-note--warn">
                <strong>No expense accounts in the report.</strong> Xero returned {xero.sections.length}{" "}
                {xero.sections.length === 1 ? "section" : "sections"} for {xero.span}
                {xero.sections.length > 0 ? <> — {xero.sections.join(", ")}</> : null}.
              </div>
            )}

            {toFile.length > 0 && (
              <>
                <p className="pt-panel__sub">
                  Twelve months of expense accounts, biggest first. File one and that overhead line takes the real figure.
                </p>
                {suggestions.length > 0 && (
                  <button type="button" className="pt-btn pt-btn--orange pt-btn--sm pt-oh__apply" onClick={applyAllSuggestions}>
                    File the {suggestions.length} it recognises
                  </button>
                )}
                <div className="pt-cap__xero">
                  {toFile.slice(0, 60).map((x) => (
                    <div key={x.label} className="pt-cap__xerorow">
                      <span className="pt-cap__xeroid"><strong>{x.label}</strong></span>
                      <span className="pt-cap__xeroamt">{money(x.amount)}</span>
                      <select className="pt-cap__type" value={suggestOverhead(x.label) ?? ""} onChange={(e) => assign(x.label, e.target.value)}>
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
              </>
            )}

            {xeroExpenses.length > 0 && toFile.length === 0 && (
              <p className="pt-panel__sub">Everything Xero has is accounted for. The lines below carry the real figures.</p>
            )}

            {(filedCount > 0 || elsewhere.length > 0) && (
              <details className="pt-oh__more">
                <summary>Review what came from Xero</summary>
                {elsewhere.length > 0 && (
                  <>
                    <h3 className="pt-oh__subh">Left out — already counted elsewhere</h3>
                    <p className="pt-oh__hint">Adding these would charge the same money twice and lift every rate you quote.</p>
                    <div className="pt-cap__xero">
                      {elsewhere.map((x) => (
                        <div key={x.label} className="pt-cap__xerorow is-out">
                          <span className="pt-cap__xeroid"><strong>{x.label}</strong><em>{countedElsewhere(x.label)}</em></span>
                          <span className="pt-cap__xeroamt">{money(x.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {filedCount > 0 && (
                  <>
                    <h3 className="pt-oh__subh">Filed</h3>
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
              </details>
            )}
          </section>

          <section className="pt-panel">
            <div className="pt-ov__charthead">
              <h2 className="pt-panel__h">What the business costs to run</h2>
              <span className="pt-cap__grouptotal">{money(ohTotal)}<em>/yr</em></span>
            </div>
            <p className="pt-panel__sub">
              Everything the business carries except the labour that goes on a job. Office and admin wages are overhead and are in
              here; so is the crew&rsquo;s own non-billable time. Only the hours a customer pays for are left out.
              Spread across {hrs(cap.totalBillHrs)} of billable time.
            </p>

            <div className="pt-oh__split">
              <div>
                <span>Fixed — same at any fleet size</span>
                <strong>{money(split.fixed + cap.officeOh)}</strong>
                <em>{ohTotal > 0 ? `${Math.round(((split.fixed + cap.officeOh) / ohTotal) * 100)}% of the lot` : ""}</em>
              </div>
              <div>
                <span>Travels with each van</span>
                <strong>{money(split.perVan + fleetDep)}</strong>
                <em>{money((split.perVan + fleetDep) / Math.max(1, cap.vanCount))} a van, across {cap.vanCount}</em>
              </div>
              <label className="pt-oh__vans">
                <span>Model it at</span>
                <input type="number" min="1" max="30" value={cap.vanCount}
                  onChange={(e) => setS({ ...s, vansOverride: parse(e.target.value) || null })} />
                <span>vans</span>
                {s.vansOverride ? (
                  <button type="button" onClick={() => setS({ ...s, vansOverride: null })}>back to {cap.realVans}</button>
                ) : null}
              </label>
            </div>

            <div className="pt-oh__totals">
              <div><span>{s.ohSource === "internal" ? "Our own figure" : "Filed from Xero"}</span><strong>{money(ohTyped)}</strong></div>
              <div><span>Wages not on a job</span><strong>{money(ohFromCrew)}</strong></div>
              <div><span>Vehicle depreciation</span><strong>{money(fleetDep)}</strong></div>
              <div className="is-total"><span>All of it, a year</span><strong>{money(ohTotal)}</strong></div>
            </div>

            <div className="pt-oh__totals">
              <div><span>A year</span><strong>{money(ohTotal)}</strong></div>
              <div><span>A month</span><strong>{money(ohTotal / 12)}</strong></div>
              <div><span>A week</span><strong>{money(ohTotal / 52)}</strong></div>
              <div><span>Every billable hour</span><strong>{hasHrs ? money2(ohTotal / cap.totalBillHrs) : "—"}</strong></div>
            </div>

            <p className="pt-oh__hint">
              Billable hours are counted per van, not per head — {cap.vanCount} {cap.vanCount === 1 ? "van" : "vans"} at{" "}
              {hrs(cap.hrsPerVan)} each. A tech and an apprentice on the one job are on site for one van-hour, not two, so the
              apprentice lifts the crew&rsquo;s rate instead of adding hours to divide by.
            </p>

            {emptyCount > 0 && (
              <label className="pt-oh__toggle">
                <input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} />
                Show the {emptyCount} lines with nothing in them
              </label>
            )}

            {s.ohSource === "internal" && (
              <div className="pt-note">
                Your own figure of <strong>{money(ohTyped)}</strong> is the one being used. The lines below are still here to fill
                in when you want the detail back — switch the source above and they take over again.
              </div>
            )}

            <div className="pt-oh__ledger">
              {(ohFromCrew > 0 || fleetDep > 0) && (
                <div className="pt-oh__group">
                  <div className="pt-oh__grouph">
                    <span>Comes from elsewhere in the portal</span>
                    <span>
                      {ohTotal > 0 && <em>{Math.round(((ohFromCrew + fleetDep) / ohTotal) * 100)}% · </em>}
                      {money(ohFromCrew + fleetDep)}
                    </span>
                  </div>
                  {[
                    { k: "office", label: "Office & admin wages", from: "The crew tab — everyone not on the tools", v: cap.officeOh },
                    { k: "down", label: "Crew time you can’t bill", from: "Leave, sick, RDOs, school, driving and admin", v: cap.labourOh },
                    { k: "dep", label: "Vehicle depreciation", from: `The Vehicles tab — ${vanCount} ${vanCount === 1 ? "van" : "vans"} on the road`, v: fleetDep },
                  ].filter((r) => r.v > 0).map((r) => (
                    <div key={r.k} className="pt-oh__line">
                      <div className="pt-oh__row is-locked">
                        <span className="pt-oh__label">{r.label}<em>{r.from}</em></span>
                        <span />
                        <span className="pt-oh__perhr">{perHour(r.v)}</span>
                        <span className="pt-oh__fixed">{money(r.v)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {OVERHEAD_GROUPS.map((g) => {
                const oh = overheadsOf(s);
                const fields = OVERHEAD_FIELDS.filter((f) => f.group === g.key);
                const shown = showEmpty ? fields : fields.filter((f) => (Number(oh[f.key]) || 0) !== 0);
                if (shown.length === 0) return null;
                const groupTotal = fields.reduce((a, f) => a + (Number(oh[f.key]) || 0), 0);
                return (
                  <div key={g.key} className="pt-oh__group">
                    <div className="pt-oh__grouph">
                      <span>{g.label}</span>
                      <span>
                        {ohTotal > 0 && <em>{Math.round((groupTotal / ohTotal) * 100)}% · </em>}
                        {money(groupTotal)}
                      </span>
                    </div>
                    {shown.map((f) => {
                      const accs = accountsFor(f.key);
                      return (
                        <div key={f.key} className="pt-oh__line">
                          <div className="pt-oh__row">
                            <span className="pt-oh__label">
                              {accs.length > 0 ? (
                                <button type="button" className="pt-oh__open" aria-expanded={openLines.has(f.key)} onClick={() => toggleLine(f.key)}>
                                  <span className={`pt-oh__caret${openLines.has(f.key) ? " is-open" : ""}`} aria-hidden="true">›</span>
                                  {f.label}
                                  <em>{accs.length} from Xero</em>
                                </button>
                              ) : f.label}
                              <button
                                type="button"
                                className={`pt-oh__scale is-${scaleOf(s, f.key)}`}
                                title="Does this grow when another van goes on the road?"
                                onClick={() => setScale(f.key, scaleOf(s, f.key) === "fixed" ? "perVan" : "fixed")}
                              >{scaleOf(s, f.key) === "perVan" ? "per van" : "fixed"}</button>
                            </span>
                            <span className="pt-oh__perhr">{perHour(Number(oh[f.key]) || 0)}</span>
                            <span className="pt-oh__amt">
                              <span>$</span>
                              <input type="number" min="0" value={oh[f.key] ?? 0} onChange={(e) => setOh(f.key, parse(e.target.value))} aria-label={f.label} />
                            </span>
                          </div>
                          {accs.length > 0 && openLines.has(f.key) && (
                            <div className="pt-oh__accs">
                              {accs.map((a) => (
                                <div key={a.label} className="pt-oh__acc">
                                  <span>{a.label}</span>
                                  <span>{perHour(a.amount)}</span>
                                  <strong>{money(a.amount)}</strong>
                                  <button type="button" className="pt-oh__unfile" onClick={() => assign(a.label, "")}>Unfile</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
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
            <h2 className="pt-panel__h">Utilisation — the ceiling, and the part in play</h2>
            <p className="pt-panel__sub">
              Two figures, because they mean different things. Leave, sick days, public holidays, RDOs and trade school are
              entitlements — no amount of scheduling changes them, so the ceiling is the honest best case, not a target you
              failed to hit. Travel, admin and office time are the part that is actually in play.
            </p>

            <div className="pt-util">
              <div className="pt-util__bar" aria-hidden="true">
                <span className="pt-util__seg pt-util__seg--actual" style={{ width: `${cap.util.actual * 100}%` }} />
                <span className="pt-util__seg pt-util__seg--play" style={{ width: `${cap.util.inPlay * 100}%` }} />
                <span className="pt-util__seg pt-util__seg--legal" style={{ width: `${Math.max(0, 1 - cap.util.ceiling) * 100}%` }} />
              </div>
              <div className="pt-util__keys">
                <div className="pt-util__key is-actual">
                  <strong>{pct(cap.util.actual)}</strong>
                  <span>Billed</span>
                  <em>{hrs(cap.totalBillHrs)} a year</em>
                </div>
                <div className="pt-util__key is-play">
                  <strong>{pct(cap.util.inPlay)}</strong>
                  <span>In play</span>
                  <em>{hrs(cap.util.flexHrs)} of driving, admin and office time</em>
                </div>
                <div className="pt-util__key is-legal">
                  <strong>{pct(1 - cap.util.ceiling)}</strong>
                  <span>The law&rsquo;s</span>
                  <em>{hrs(cap.util.legalHrs)} of leave, sick, holidays, RDOs and school</em>
                </div>
              </div>
            </div>

            <div className="pt-util__read">
              The most you could ever bill is <strong>{pct(cap.util.ceiling)}</strong> — everything above that belongs to the crew
              by law. You&rsquo;re at <strong>{pct(cap.util.actual)}</strong>, so <strong>{pct(cap.util.inPlay)}</strong> is the
              ground worth fighting for.
              {hasHrs && <> Every point of it is about <strong>{hrs(cap.util.paidHrs / 100)}</strong> and{" "}
              <strong>{money(blended !== null ? (cap.util.paidHrs / 100) * blended : 0)}</strong> of work a year.</>}
            </div>
          </section>

          <section className="pt-panel">
            <h2 className="pt-panel__h">The year in numbers</h2>
            <div className="pt-pl__heads">
              <div className="pt-pl__head"><span className="pt-pl__headlabel">Billable hours</span><strong className="pt-pl__headval">{hrs(cap.totalBillHrs)}</strong></div>
              <div className="pt-pl__head"><span className="pt-pl__headlabel">Utilisation</span><strong className="pt-pl__headval">{pct(cap.util.actual)}<em> of {pct(cap.util.ceiling)}</em></strong></div>
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
