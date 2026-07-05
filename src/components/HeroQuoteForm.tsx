"use client";

import { useMemo, useState } from "react";

/* ============================================================
   Multi-branch quote form.
   Each service has its own ordered step list; state.step indexes into it.
   ============================================================ */

type ServiceId = "hp" | "split" | "ducted" | "service";

const SERVICES: { id: ServiceId; t: string; s: string }[] = [
  { id: "hp",      t: "Heat pump hot water",  s: "Reclaim · iStore · Thermann" },
  { id: "split",   t: "Split system aircon",  s: "Mitsubishi Electric · Kaden" },
  { id: "ducted",  t: "Ducted aircon",        s: "Whole-home cooling & heating" },
  { id: "service", t: "Service or repair",    s: "Gas, hot water, aircon" },
];

/* ---- Per-brand option lists ---- */

const HP_BRANDS = [
  { id: "reclaim",  t: "Reclaim",  s: "CO₂ heat pump — premium, quietest" },
  { id: "thermann", t: "Thermann", s: "Great value, reliable" },
  { id: "istore",   t: "iStore",   s: "Best mid-range, smart-app ready" },
];

const HP_STYLES = [
  {
    id: "aio",
    t: "All-in-one",
    s: "Tank + compressor in one unit",
    pros: ["Smaller footprint", "Simpler install", "Lower up-front cost"],
    cons: ["Slightly noisier at the tank", "Fewer size options"],
  },
  {
    id: "split",
    t: "Split system",
    s: "Compressor separate from the tank",
    pros: ["Quieter around the tank", "More install flexibility", "Better cold-weather performance"],
    cons: ["Costs a bit more", "Two units to place"],
  },
];

const HP_SIZES: Record<string, { id: string; t: string; s: string }[]> = {
  reclaim: [
    { id: "160", t: "160 L", s: "1–2 people" },
    { id: "250", t: "250 L", s: "2–3 people" },
    { id: "315", t: "315 L", s: "4–5 people" },
    { id: "400", t: "400 L", s: "large households" },
  ],
  thermann: [
    { id: "170", t: "170 L", s: "1–2 people" },
    { id: "270", t: "270 L", s: "3–4 people" },
    { id: "300", t: "300 L", s: "4–5 people" },
  ],
  istore: [
    { id: "180", t: "180 L", s: "1–3 people" },
    { id: "270", t: "270 L", s: "3–5 people" },
  ],
};

const HP_MATERIALS = [
  { id: "stainless", t: "Stainless steel", s: "Longer life, no anode swaps, ~$300 more" },
  { id: "glass",     t: "Glass lined",     s: "Standard, more affordable, anode replaced at service" },
];

/* ---- Split-system option lists ---- */

const SPLIT_BRANDS = [
  { id: "mitsu", t: "Mitsubishi Electric", s: "Premium quiet inverter" },
  { id: "kaden", t: "Kaden",               s: "Great value, 5-yr warranty" },
];

const SPLIT_STYLES = [
  { id: "single", t: "Single head",  s: "One indoor unit, one room" },
  { id: "multi",  t: "Multi-head",   s: "Multiple indoor units, one outdoor" },
];

const HEAD_COUNTS = ["2", "3", "4", "5"] as const;

const SPLIT_SIZES = [
  { id: "2.5",  t: "2.5 kW", s: "Bedroom / small room" },
  { id: "3.5",  t: "3.5 kW", s: "Small living / large bedroom" },
  { id: "5.0",  t: "5.0 kW", s: "Standard living" },
  { id: "7.1",  t: "7.1 kW", s: "Open-plan living" },
  { id: "9.0",  t: "9.0 kW", s: "Large open-plan" },
  { id: "not-sure", t: "Not sure",  s: "We'll size it on-site" },
];

/* ---- Ducted option lists ---- */

const DUCTED_SIZES = [
  { id: "10",  t: "10 kW",  s: "Small home / 2–3 zones" },
  { id: "14",  t: "14 kW",  s: "Average home / 3–5 zones" },
  { id: "18",  t: "18 kW",  s: "Large home / 5–8 zones" },
  { id: "22",  t: "22 kW",  s: "Very large home / 8+ zones" },
  { id: "not-sure", t: "Not sure", s: "We'll size it on-site" },
];

const ZONE_COUNTS = ["2", "3", "4", "5", "6", "8", "10", "12"] as const;

/* ---- Service (repair / maintenance) option lists ---- */

const SERVICE_TYPES = [
  { id: "gas-heater",  t: "Gas heater",         s: "Ducted / wall / space" },
  { id: "hot-water",   t: "Hot water",          s: "Gas, electric or heat pump" },
  { id: "split",       t: "Split system",       s: "Single or multi-head" },
  { id: "ducted-air",  t: "Ducted aircon",      s: "Zoned system" },
  { id: "evap",        t: "Evaporative cooler", s: "Rooftop unit" },
];

const STORIES = [
  { id: "single", t: "Single storey", s: "" },
  { id: "double", t: "Double storey", s: "" },
];

/* ---- Step definitions per service ---- */

type StepId =
  | "service"
  | "hp-brand" | "hp-style" | "hp-size" | "hp-material" | "hp-wifi"
  | "split-brand" | "split-style" | "split-heads" | "split-size"
  | "ducted-size" | "ducted-zones" | "ducted-tablet"
  | "svc-type" | "svc-stories"
  | "details";

const FLOWS: Record<ServiceId, StepId[]> = {
  hp:      ["service", "hp-brand", "hp-style", "hp-size", "hp-material", "hp-wifi", "details"],
  split:   ["service", "split-brand", "split-style", "split-heads", "split-size", "details"],
  ducted:  ["service", "ducted-size", "ducted-zones", "ducted-tablet", "details"],
  service: ["service", "svc-type", "svc-stories", "details"],
};

/* ============================================================ */

export function HeroQuoteForm() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [service, setService] = useState<ServiceId>("hp");

  const [hpBrand, setHpBrand] = useState("reclaim");
  const [hpStyle, setHpStyle] = useState("aio");
  const [hpSize, setHpSize] = useState("");
  const [hpMaterial, setHpMaterial] = useState("stainless");
  const [hpWifi, setHpWifi] = useState<"yes" | "no">("no");

  const [splitBrand, setSplitBrand] = useState("mitsu");
  const [splitStyle, setSplitStyle] = useState<"single" | "multi">("single");
  const [splitHeads, setSplitHeads] = useState("2");
  const [splitSize, setSplitSize] = useState("");

  const [ductedSize, setDuctedSize] = useState("");
  const [ductedZones, setDuctedZones] = useState("4");
  const [ductedTablet, setDuctedTablet] = useState<"yes" | "no">("yes");

  const [svcType, setSvcType] = useState("");
  const [svcStories, setSvcStories] = useState<"single" | "double">("single");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<{ name: string; type: string; data: string } | null>(null);
  const [hp, setHp] = useState("");

  const flow = FLOWS[service];
  const currentStep = flow[step];
  const isLast = step === flow.length - 1;

  const canNext = useMemo(() => {
    switch (currentStep) {
      case "service": return !!service;
      case "hp-brand": return !!hpBrand;
      case "hp-style": return !!hpStyle;
      case "hp-size": return !!hpSize;
      case "hp-material": return !!hpMaterial;
      case "hp-wifi": return !!hpWifi;
      case "split-brand": return !!splitBrand;
      case "split-style": return !!splitStyle;
      case "split-heads": return splitStyle === "single" ? true : !!splitHeads;
      case "split-size": return !!splitSize;
      case "ducted-size": return !!ductedSize;
      case "ducted-zones": return !!ductedZones;
      case "ducted-tablet": return !!ductedTablet;
      case "svc-type": return !!svcType;
      case "svc-stories": return !!svcStories;
      case "details": return !!(name && phone && email && postcode);
      default: return false;
    }
  }, [
    currentStep, service, hpBrand, hpStyle, hpSize, hpMaterial, hpWifi,
    splitBrand, splitStyle, splitHeads, splitSize,
    ductedSize, ductedZones, ductedTablet, svcType, svcStories,
    name, phone, email, postcode,
  ]);

  function handleService(id: ServiceId) {
    setService(id);
    if (id !== "hp") setHpSize("");
    if (id !== "split") setSplitSize("");
    if (id !== "ducted") setDuctedSize("");
  }

  async function onPhoto(file: File | null) {
    if (!file) { setPhoto(null); return; }
    if (file.size > 8 * 1024 * 1024) {
      alert("Please pick a photo under 8 MB. You can send more by email after.");
      return;
    }
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    setPhoto({ name: file.name, type: file.type, data: btoa(bin) });
  }

  function summary() {
    if (service === "hp") {
      const b = HP_BRANDS.find(x => x.id === hpBrand)?.t ?? hpBrand;
      const st = HP_STYLES.find(x => x.id === hpStyle)?.t ?? hpStyle;
      const sz = HP_SIZES[hpBrand]?.find(x => x.id === hpSize)?.t ?? hpSize;
      const m = HP_MATERIALS.find(x => x.id === hpMaterial)?.t ?? hpMaterial;
      return `Heat pump — ${b} ${st}, ${sz}, ${m}, WiFi: ${hpWifi}`;
    }
    if (service === "split") {
      const b = SPLIT_BRANDS.find(x => x.id === splitBrand)?.t ?? splitBrand;
      const st = SPLIT_STYLES.find(x => x.id === splitStyle)?.t ?? splitStyle;
      const heads = splitStyle === "multi" ? `${splitHeads} heads` : "1 head";
      const sz = SPLIT_SIZES.find(x => x.id === splitSize)?.t ?? splitSize;
      return `Split system — ${b}, ${st} (${heads}), ${sz}`;
    }
    if (service === "ducted") {
      const sz = DUCTED_SIZES.find(x => x.id === ductedSize)?.t ?? ductedSize;
      return `Ducted aircon — ${sz}, ${ductedZones} zones, Milieu tablet: ${ductedTablet}`;
    }
    const st = SERVICE_TYPES.find(x => x.id === svcType)?.t ?? svcType;
    return `Service — ${st}, ${svcStories} storey`;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLast) {
      if (canNext) setStep(s => s + 1);
      return;
    }
    if (!canNext) return;
    setSubmitting(true);
    try {
      await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service, summary: summary(),
          details: {
            hpBrand, hpStyle, hpSize, hpMaterial, hpWifi,
            splitBrand, splitStyle, splitHeads, splitSize,
            ductedSize, ductedZones, ductedTablet,
            svcType, svcStories,
          },
          name, phone, email, postcode, address, notes,
          photo, hp,
        }),
      });
    } catch { /* server may still have logged it */ }
    setDone(true);
  }

  if (done) {
    return (
      <aside className="qcard" id="quote">
        <div className="qcard__done">
          <div className="qcard__done-tick">✓</div>
          <h2 className="qcard__h">Got it. We&apos;ll be in touch.</h2>
          <p className="qcard__sub">
            A real human will call or SMS you within 2 business hours with your fixed number and next step.
          </p>
          <p className="qcard__finep" style={{ marginTop: 20 }}>
            Urgent right now? Call{" "}
            <a href="tel:+61359478000" style={{ color: "var(--navy)" }}>
              <strong>(03) 5947 8000</strong>
            </a>.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="qcard" id="quote">
      <div className="qcard__ribbon">
        <span className="qcard__ribbon-dot" />
        Free quote · usually replied within 2 hrs
      </div>

      <h2 className="qcard__h">Get a fixed-price quote</h2>
      <p className="qcard__sub">Pick your service and answer a few quick questions.</p>

      {/* progress */}
      <div className="qcard__progress" aria-hidden="true">
        {flow.map((_, i) => (
          <i key={i} className={i <= step ? "is-on" : ""} />
        ))}
        <span className="qcard__progress-lbl">Step {step + 1} / {flow.length}</span>
      </div>

      <form onSubmit={onSubmit} noValidate>
        {/* honeypot */}
        <input
          type="text"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px" }}
        />

        {currentStep === "service" && (
          <StepBlock title="What do you need?">
            <div className="qgrid qgrid--2">
              {SERVICES.map(s => (
                <OptCard
                  key={s.id}
                  checked={service === s.id}
                  onClick={() => handleService(s.id)}
                  t={s.t}
                  s={s.s}
                />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "hp-brand" && (
          <StepBlock title="Which brand of heat pump?">
            <div className="qgrid qgrid--3">
              {HP_BRANDS.map(b => (
                <OptCard
                  key={b.id}
                  checked={hpBrand === b.id}
                  onClick={() => { setHpBrand(b.id); setHpSize(""); }}
                  t={b.t}
                  s={b.s}
                />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "hp-style" && (
          <StepBlock title="All-in-one or split?">
            <div className="qgrid qgrid--2">
              {HP_STYLES.map(x => (
                <button
                  type="button"
                  key={x.id}
                  onClick={() => setHpStyle(x.id)}
                  className={`optbig ${hpStyle === x.id ? "is-on" : ""}`}
                >
                  <div className="optbig__head">
                    <span className="optbig__t">{x.t}</span>
                    <span className="optbig__s">{x.s}</span>
                  </div>
                  <div className="pxc">
                    <div>
                      <span className="pxc__lbl">Pros</span>
                      <ul>{x.pros.map(p => <li key={p}>{p}</li>)}</ul>
                    </div>
                    <div>
                      <span className="pxc__lbl">Cons</span>
                      <ul className="pxc__cons">{x.cons.map(c => <li key={c}>{c}</li>)}</ul>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "hp-size" && (
          <StepBlock title={`What size ${HP_BRANDS.find(b => b.id === hpBrand)?.t}?`}>
            <div className="qgrid qgrid--3">
              {(HP_SIZES[hpBrand] ?? []).map(sz => (
                <OptCard
                  key={sz.id}
                  checked={hpSize === sz.id}
                  onClick={() => setHpSize(sz.id)}
                  t={sz.t}
                  s={sz.s}
                />
              ))}
            </div>
            <p className="qhint">Not sure? Pick the closest — we&rsquo;ll sanity-check at the site visit.</p>
          </StepBlock>
        )}

        {currentStep === "hp-material" && (
          <StepBlock title="Tank material">
            <div className="qgrid qgrid--2">
              {HP_MATERIALS.map(m => (
                <OptCard
                  key={m.id}
                  checked={hpMaterial === m.id}
                  onClick={() => setHpMaterial(m.id)}
                  t={m.t}
                  s={m.s}
                />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "hp-wifi" && (
          <StepBlock title="Add WiFi / app control?">
            <div className="qgrid qgrid--2">
              <OptCard checked={hpWifi === "yes"} onClick={() => setHpWifi("yes")}
                t="Yes — WiFi" s="Set schedules & watch running cost from your phone" />
              <OptCard checked={hpWifi === "no"} onClick={() => setHpWifi("no")}
                t="No — standard" s="Just the unit, no app" />
            </div>
          </StepBlock>
        )}

        {currentStep === "split-brand" && (
          <StepBlock title="Which brand?">
            <div className="qgrid qgrid--2">
              {SPLIT_BRANDS.map(b => (
                <OptCard key={b.id} checked={splitBrand === b.id}
                  onClick={() => setSplitBrand(b.id)} t={b.t} s={b.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "split-style" && (
          <StepBlock title="Single head or multi-head?">
            <div className="qgrid qgrid--2">
              {SPLIT_STYLES.map(x => (
                <OptCard key={x.id} checked={splitStyle === x.id}
                  onClick={() => setSplitStyle(x.id as "single" | "multi")}
                  t={x.t} s={x.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "split-heads" && splitStyle === "multi" && (
          <StepBlock title="How many indoor heads?">
            <div className="qgrid qgrid--4">
              {HEAD_COUNTS.map(n => (
                <OptCard key={n} checked={splitHeads === n}
                  onClick={() => setSplitHeads(n)} t={n} s="heads" small />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "split-heads" && splitStyle === "single" && (
          <StepBlock title="One indoor head — moving on">
            <p className="qhint">Single-head selected, so we&rsquo;ll skip head-count. Next up: size.</p>
          </StepBlock>
        )}

        {currentStep === "split-size" && (
          <StepBlock title={splitStyle === "multi" ? "Rough size of each head" : "What size head?"}>
            <div className="qgrid qgrid--3">
              {SPLIT_SIZES.map(sz => (
                <OptCard key={sz.id} checked={splitSize === sz.id}
                  onClick={() => setSplitSize(sz.id)} t={sz.t} s={sz.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "ducted-size" && (
          <StepBlock title="Rough system size?">
            <div className="qgrid qgrid--3">
              {DUCTED_SIZES.map(sz => (
                <OptCard key={sz.id} checked={ductedSize === sz.id}
                  onClick={() => setDuctedSize(sz.id)} t={sz.t} s={sz.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "ducted-zones" && (
          <StepBlock title="How many zones?">
            <div className="qgrid qgrid--4">
              {ZONE_COUNTS.map(n => (
                <OptCard key={n} checked={ductedZones === n}
                  onClick={() => setDuctedZones(n)} t={n} s="zones" small />
              ))}
            </div>
            <p className="qhint">Zones = individually controlled areas. A typical 4-bed home uses 5–6.</p>
          </StepBlock>
        )}

        {currentStep === "ducted-tablet" && (
          <StepBlock title="Add the Milieu Lab tablet controller?">
            <div className="qgrid qgrid--2">
              <button type="button"
                onClick={() => setDuctedTablet("yes")}
                className={`optbig ${ductedTablet === "yes" ? "is-on" : ""}`}>
                <div className="optbig__head">
                  <span className="optbig__t">Yes — Milieu Lab tablet</span>
                  <span className="optbig__s">Wall-mounted 7&Prime; smart controller</span>
                </div>
                <ul className="qbullets">
                  <li>Individual room temperatures, timers &amp; schedules</li>
                  <li>Live power draw &amp; running-cost tracking</li>
                  <li>Smart-home &amp; iZone (ITC) compatible</li>
                  <li>Premium finish — fits luxury builds &amp; renos</li>
                </ul>
              </button>
              <button type="button"
                onClick={() => setDuctedTablet("no")}
                className={`optbig ${ductedTablet === "no" ? "is-on" : ""}`}>
                <div className="optbig__head">
                  <span className="optbig__t">No — standard controller</span>
                  <span className="optbig__s">Basic wall thermostat</span>
                </div>
                <ul className="qbullets qbullets--muted">
                  <li>Zone on/off from the wall</li>
                  <li>Set-and-forget temperature</li>
                  <li>Lower up-front cost</li>
                </ul>
              </button>
            </div>
          </StepBlock>
        )}

        {currentStep === "svc-type" && (
          <StepBlock title="What needs looking at?">
            <div className="qgrid qgrid--3">
              {SERVICE_TYPES.map(s => (
                <OptCard key={s.id} checked={svcType === s.id}
                  onClick={() => setSvcType(s.id)} t={s.t} s={s.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "svc-stories" && (
          <StepBlock title="Single or double storey?">
            <div className="qgrid qgrid--2">
              {STORIES.map(s => (
                <OptCard key={s.id} checked={svcStories === s.id}
                  onClick={() => setSvcStories(s.id as "single" | "double")}
                  t={s.t} s={s.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "details" && (
          <StepBlock title="Your details">
            <div className="qrow">
              <label className="qfield">
                <span>First name *</span>
                <input type="text" placeholder="Jamie" value={name}
                  onChange={(e) => setName(e.target.value)} required />
              </label>
              <label className="qfield">
                <span>Mobile *</span>
                <input type="tel" placeholder="04xx xxx xxx" value={phone}
                  onChange={(e) => setPhone(e.target.value)} required />
              </label>
            </div>
            <div className="qrow">
              <label className="qfield">
                <span>Email *</span>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label className="qfield">
                <span>Postcode *</span>
                <input type="text" placeholder="3810" value={postcode}
                  onChange={(e) => setPostcode(e.target.value)} required />
              </label>
            </div>
            <label className="qfield">
              <span>Full address <em>(optional)</em></span>
              <input type="text" placeholder="12 Main Rd, Pakenham VIC 3810"
                value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
            <label className="qfield">
              <span>Anything else? <em>(optional)</em></span>
              <input type="text" placeholder="e.g. 4 bed house, easy roof access"
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <label className="qfield qphoto">
              <span>Photo of your current system <em>(optional — helps us quote sharper)</em></span>
              <input type="file" accept="image/*"
                onChange={(e) => onPhoto(e.target.files?.[0] ?? null)} />
              {photo && <span className="qphoto__hint">✓ {photo.name}</span>}
            </label>
            <p className="qcard__finep">
              We&rsquo;ll come back within 2 business hours. No spam, no shared data.
            </p>
          </StepBlock>
        )}

        <div className="qcard__foot">
          <button
            type="button"
            className="qback"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            ← Back
          </button>
          <button
            type="submit"
            className="ds-btn ds-btn--orange ds-btn--lg qnext"
            disabled={submitting || !canNext}
          >
            {isLast ? (submitting ? "Sending…" : "Send my request →") : "Next →"}
          </button>
        </div>
      </form>
    </aside>
  );
}

/* --- small presentational subcomponents --- */

function StepBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="qstep">
      <h3 className="qstep__h">{title}</h3>
      {children}
    </div>
  );
}

function OptCard({
  checked, onClick, t, s, small = false,
}: {
  checked: boolean; onClick: () => void; t: string; s?: string; small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`opt ${checked ? "is-on" : ""} ${small ? "opt--small" : ""}`}
    >
      <span className="opt__t">{t}</span>
      {s && <span className="opt__s">{s}</span>}
    </button>
  );
}
