"use client";

import { useEffect, useMemo, useState } from "react";

/* ============================================================
   Multi-step, multi-select branching quote form.
   Service (top step) is single-select — it drives the flow.
   Everything else is multi-select so a customer can be quoted
   across e.g. Reclaim + Thermann, 200L + 285L, etc.
   ============================================================ */

type ServiceId = "hp" | "split" | "ducted" | "service";

const SERVICES: { id: ServiceId; t: string; s: string }[] = [
  { id: "hp",      t: "Heat pump hot water",  s: "Reclaim · iStore · Thermann" },
  { id: "split",   t: "Split system aircon",  s: "Mitsubishi Electric · Kaden" },
  { id: "ducted",  t: "Ducted aircon",        s: "Whole-home cooling & heating" },
  { id: "service", t: "Service or repair",    s: "Gas, hot water, aircon" },
];

/* ---- Heat pump options ---- */

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

// Size ranges — availability depends on the style the customer picks:
//   AIO   : small (180–200 L) and large (275–300 L) — every brand does AIO
//   Split : large (250–300 L) and xl (315–400 L) — Reclaim only
type SizeRange = { id: string; t: string; s: string; aio: boolean; split: boolean };
const HP_SIZE_RANGES: SizeRange[] = [
  { id: "small", t: "180 L – 200 L", s: "1–2 people · Reclaim 200 L · Thermann 200 L · iStore 180 L", aio: true,  split: false },
  { id: "large", t: "275 L – 300 L", s: "3+ people · Reclaim 300 L · Thermann 285 L · iStore 275 L",  aio: true,  split: true  },
  { id: "xl",    t: "315 L – 400 L", s: "Reclaim split only · 315 L or 400 L",                        aio: false, split: true  },
];

const HP_MATERIALS = [
  { id: "stainless", t: "Stainless steel", s: "15-year warranty · ~$1,000 premium · will outlast the warranty" },
  { id: "glass",     t: "Glass lined",     s: "Standard build · more affordable · anode swapped at annual service" },
];

/* ---- Split-system options ---- */

const SPLIT_BRANDS = [
  { id: "mitsu",  t: "Mitsubishi Electric", s: "Premium · up to 15 kW total heads on a 12 kW multi condenser" },
  { id: "kaden",  t: "Kaden",               s: "Great value · up to 23 kW total heads on an 18 kW multi" },
  { id: "rinnai", t: "Rinnai",              s: "Reliable · up to 23 kW total heads on an 18 kW multi" },
];
// Multi-head condensers can be diversity-oversized (typical ~130%).
// e.g. 21 kW of heads on an 18 kW condenser is fine, and Mitsubishi's
// MXZ range covers ~12 kW condensers with up to ~15 kW of heads.
const SPLIT_BRAND_MAX_KW: Record<string, number> = { mitsu: 15, kaden: 23, rinnai: 23 };

const SPLIT_STYLES = [
  { id: "single", t: "Single head",  s: "One indoor unit, one room" },
  { id: "multi",  t: "Multi-head",   s: "Multiple indoor units, one outdoor" },
];

const HEAD_COUNTS = [
  { id: "2", t: "2", s: "heads" },
  { id: "3", t: "3", s: "heads" },
  { id: "4", t: "4", s: "heads" },
  { id: "5", t: "5", s: "heads" },
];

const SPLIT_SIZES = [
  { id: "2.5",     t: "2.5 kW",   s: "Bedroom / small room" },
  { id: "3.5",     t: "3.5 kW",   s: "Small living / large bedroom" },
  { id: "5.0",     t: "5.0 kW",   s: "Standard living" },
  { id: "7.1",     t: "7.1 kW",   s: "Open-plan living" },
  { id: "9.0",     t: "9.0 kW",   s: "Large open-plan" },
  { id: "unsure",  t: "Not sure — floor plan", s: "Send us a floor plan, we'll size it" },
];

// Multi-head sizes for the stepper picker. Customer clicks +/- on each
// row to build a config like "3 × 2.5 kW + 1 × 5.0 kW + 1 × 7.1 kW".
const MULTI_HEAD_SIZES = [
  { id: "2.5", kw: 2.5, t: "2.5 kW", s: "Bedroom / small room" },
  { id: "3.5", kw: 3.5, t: "3.5 kW", s: "Bedroom / small living" },
  { id: "5.0", kw: 5.0, t: "5.0 kW", s: "Standard living" },
  { id: "7.1", kw: 7.1, t: "7.1 kW", s: "Open-plan living" },
];

/* ---- Ducted options ---- */

const DUCTED_SIZES = [
  { id: "10",     t: "10 kW",    s: "Small home" },
  { id: "14",     t: "14 kW",    s: "Average home" },
  { id: "18",     t: "18 kW",    s: "Large home" },
  { id: "20",     t: "20 kW",    s: "Largest we offer · requires 3-phase power" },
  { id: "unsure", t: "Not sure", s: "We'll size it on-site" },
];

const ZONE_COUNTS = [
  { id: "2", t: "2", s: "zones" },
  { id: "3", t: "3", s: "zones" },
  { id: "4", t: "4", s: "zones" },
  { id: "5", t: "5", s: "zones" },
  { id: "6", t: "6", s: "zones" },
  { id: "8", t: "8", s: "zones" },
  { id: "10", t: "10", s: "zones" },
  { id: "12", t: "12", s: "zones" },
];

/* ---- Service (repair / maintenance) options ---- */

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

/* ---- helpers ---- */

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}

/* ============================================================ */

export function HeroQuoteForm() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [service, setService] = useState<ServiceId>("hp");

  // Multi-select fields (arrays).
  const [hpBrand, setHpBrand] = useState<string[]>([]);
  const [hpStyle, setHpStyle] = useState<string[]>([]);
  const [hpSize, setHpSize] = useState<string[]>([]);       // stored as `${brand}-${style}-${size}` composite ids
  const [hpMaterial, setHpMaterial] = useState<string[]>([]);
  const [hpWifi, setHpWifi] = useState<"yes" | "no">("no"); // binary, stays single

  const [splitBrand, setSplitBrand] = useState<string[]>([]);
  const [splitStyle, setSplitStyle] = useState<string[]>([]);
  const [splitHeadConfig, setSplitHeadConfig] = useState<Record<string, number>>({}); // size id → count
  const [splitSize, setSplitSize] = useState<string[]>([]);

  const [ductedSize, setDuctedSize] = useState<string[]>([]);
  const [ductedZones, setDuctedZones] = useState<string[]>([]);
  const [ductedTablet, setDuctedTablet] = useState<"yes" | "no">("yes");

  const [svcType, setSvcType] = useState<string[]>([]);
  const [svcStories, setSvcStories] = useState<"single" | "double">("single");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string; address?: { postcode?: string } }>>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<Array<{ name: string; type: string; data: string }>>([]);
  const [hp, setHp] = useState("");

  // Brand-aware flow. HP: style/material steps only appear when Reclaim
  // is in play (Reclaim is the only brand we split-install; Thermann and
  // iStore are AIO-only, always glass-lined). Split: multi-head and
  // single-head steps only appear when their style is selected.
  const flow = useMemo(() => {
    if (service === "hp") {
      const hasReclaim = hpBrand.includes("reclaim");
      const wantsSplit = hasReclaim && hpStyle.includes("split");
      const steps: StepId[] = ["service", "hp-brand"];
      if (hasReclaim) steps.push("hp-style");
      steps.push("hp-size");
      if (wantsSplit) steps.push("hp-material");
      steps.push("hp-wifi", "details");
      return steps;
    }
    if (service === "split") {
      const steps: StepId[] = ["service", "split-brand", "split-style"];
      if (splitStyle.includes("multi"))  steps.push("split-heads");
      if (splitStyle.includes("single")) steps.push("split-size");
      steps.push("details");
      return steps;
    }
    return FLOWS[service];
  }, [service, hpBrand, hpStyle, splitStyle]);

  // Multi-head totals
  const multiHeadTotal = useMemo(() => Object.entries(splitHeadConfig)
    .reduce((sum, [size, count]) => sum + parseFloat(size) * count, 0),
    [splitHeadConfig]);
  const multiHeadCount = useMemo(() => Object.values(splitHeadConfig)
    .reduce((sum, count) => sum + count, 0),
    [splitHeadConfig]);
  const brandMaxKw = useMemo(() => {
    if (splitBrand.length === 0) return 18;
    return Math.min(...splitBrand.map(b => SPLIT_BRAND_MAX_KW[b] ?? 18));
  }, [splitBrand]);
  const multiHeadOverCap = multiHeadTotal > brandMaxKw;

  function updateHeadCount(sizeId: string, delta: number) {
    setSplitHeadConfig(prev => {
      const current = prev[sizeId] ?? 0;
      const next = Math.max(0, Math.min(6, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[sizeId];
        return copy;
      }
      return { ...prev, [sizeId]: next };
    });
  }

  const currentStep = flow[Math.min(step, flow.length - 1)];
  const isLast = step === flow.length - 1;


  const canNext = useMemo(() => {
    switch (currentStep) {
      case "service": return !!service;
      case "hp-brand": return hpBrand.length > 0;
      case "hp-style": return hpStyle.length > 0;
      case "hp-size": return hpSize.length > 0;
      case "hp-material": return hpMaterial.length > 0;
      case "hp-wifi": return !!hpWifi;
      case "split-brand": return splitBrand.length > 0;
      case "split-style": return splitStyle.length > 0;
      case "split-heads":
        // Over-cap is a soft advisory, not a hard block — customer can still proceed.
        return splitStyle.includes("multi") ? multiHeadCount > 0 : true;
      case "split-size": return splitSize.length > 0;
      case "ducted-size": return ductedSize.length > 0;
      case "ducted-zones": return ductedZones.length > 0;
      case "ducted-tablet": return !!ductedTablet;
      case "svc-type": return svcType.length > 0;
      case "svc-stories": return !!svcStories;
      case "details": return !!(name && phone && email && postcode);
      default: return false;
    }
  }, [
    currentStep, service, hpBrand, hpStyle, hpSize, hpMaterial, hpWifi,
    splitBrand, splitStyle, multiHeadCount, multiHeadOverCap, splitSize,
    ductedSize, ductedZones, ductedTablet, svcType, svcStories,
    name, phone, email, postcode,
  ]);

  function handleService(id: ServiceId) {
    if (id === service) return;
    setService(id);
    // Reset downstream to avoid stale selections crossing flows.
    setHpBrand([]); setHpStyle([]); setHpSize([]); setHpMaterial([]);
    setSplitBrand([]); setSplitStyle([]); setSplitHeadConfig({}); setSplitSize([]);
    setDuctedSize([]); setDuctedZones([]);
    setSvcType([]);
  }

  async function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = 6 - photos.length;
    if (remaining <= 0) {
      alert("Six photos is the max — remove one before adding more, or email extras after.");
      return;
    }
    const toAdd = Array.from(files).slice(0, remaining);
    const results: Array<{ name: string; type: string; data: string }> = [];
    for (const file of toAdd) {
      if (file.size > 8 * 1024 * 1024) {
        alert(`"${file.name}" is over 8 MB — skipped. Try a smaller photo or email it after.`);
        continue;
      }
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      results.push({ name: file.name, type: file.type, data: btoa(bin) });
    }
    if (results.length) setPhotos((prev) => [...prev, ...results].slice(0, 6));
  }
  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  // Debounced OpenStreetMap Nominatim address lookup (no API key needed).
  useEffect(() => {
    if (!address || address.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&countrycodes=au&addressdetails=1&limit=5`,
          { signal: controller.signal, headers: { "Accept": "application/json" } },
        );
        if (!res.ok) return;
        const data = await res.json();
        setAddressSuggestions(Array.isArray(data) ? data : []);
      } catch {
        /* network / abort — ignore */
      }
    }, 400);
    return () => { clearTimeout(t); controller.abort(); };
  }, [address]);

  function pickAddressSuggestion(s: { display_name: string; address?: { postcode?: string } }) {
    setAddress(s.display_name);
    if (s.address?.postcode && !postcode) setPostcode(s.address.postcode);
    setShowAddressSuggestions(false);
  }

  function labels(list: { id: string; t: string }[], ids: string[]) {
    return ids.map(id => list.find(x => x.id === id)?.t ?? id).join(", ");
  }

  function summary() {
    if (service === "hp") {
      const b = labels(HP_BRANDS, hpBrand);
      const st = labels(HP_STYLES, hpStyle);
      const sz = labels(HP_SIZE_RANGES, hpSize);
      const m = labels(HP_MATERIALS, hpMaterial);
      return `Heat pump — brand: ${b}; style: ${st}; size: ${sz}; material: ${m}; WiFi: ${hpWifi}`;
    }
    if (service === "split") {
      const b = labels(SPLIT_BRANDS, splitBrand);
      const st = labels(SPLIT_STYLES, splitStyle);
      const parts: string[] = [];
      if (splitStyle.includes("multi") && multiHeadCount > 0) {
        const layout = Object.entries(splitHeadConfig)
          .map(([size, count]) => `${count} × ${size} kW`).join(" + ");
        parts.push(`multi-head: ${layout} (${multiHeadTotal.toFixed(1)} kW total)`);
      }
      if (splitStyle.includes("single") && splitSize.length) {
        parts.push(`single-head sizes: ${labels(SPLIT_SIZES, splitSize)}`);
      }
      return `Split — brand: ${b}; style: ${st}; ${parts.join("; ") || "(config to confirm)"}`;
    }
    if (service === "ducted") {
      const sz = labels(DUCTED_SIZES, ductedSize);
      const z = labels(ZONE_COUNTS, ductedZones);
      return `Ducted — size: ${sz}; zones: ${z}; Milieu tablet: ${ductedTablet}`;
    }
    const st = labels(SERVICE_TYPES, svcType);
    return `Service — appliance: ${st}; ${svcStories} storey`;
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
            splitBrand, splitStyle, splitHeadConfig, splitSize,
            ductedSize, ductedZones, ductedTablet,
            svcType, svcStories,
          },
          name, phone, email, postcode, address, notes,
          photos, hp,
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
        Free quote · usually replied within 12 hrs
      </div>

      <h2 className="qcard__h">Get a fixed-price quote</h2>
      <p className="qcard__sub">Tick every option you&rsquo;d consider — we&rsquo;ll price the lot.</p>

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
          <StepBlock title="What do you need?" hint="Choose one — this sets your quote path.">
            <div className="qgrid qgrid--2">
              {SERVICES.map(s => (
                <OptCard key={s.id} multi={false} checked={service === s.id}
                  onClick={() => handleService(s.id)} t={s.t} s={s.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "hp-brand" && (
          <StepBlock title="Which brand(s) of heat pump?" hint="Pick any you'd consider — we'll quote all.">
            <div className="qgrid qgrid--3">
              {HP_BRANDS.map(b => (
                <OptCard key={b.id} multi checked={hpBrand.includes(b.id)}
                  onClick={() => setHpBrand(a => toggle(a, b.id))}
                  t={b.t} s={b.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "hp-style" && (
          <StepBlock title="All-in-one or split — or quote both?" hint="Split is Reclaim only, and about $2,500 more than an all-in-one. If budget is tight, stick with all-in-one.">
            <div className="qgrid qgrid--2">
              {HP_STYLES.map(x => (
                <button
                  type="button"
                  key={x.id}
                  onClick={() => setHpStyle(a => toggle(a, x.id))}
                  className={`optbig ${hpStyle.includes(x.id) ? "is-on" : ""}`}
                >
                  <div className="optbig__head">
                    <span className="optbig__t">
                      {x.t}
                      {x.id === "split" && <span className="pxc__pill"> premium · Reclaim only</span>}
                    </span>
                    <span className="optbig__s">{x.s}</span>
                    <span className="optcheck">{hpStyle.includes(x.id) ? "✓" : ""}</span>
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

        {currentStep === "hp-size" && (() => {
          const hasReclaim = hpBrand.includes("reclaim");
          const wantsAio   = !hasReclaim || hpStyle.length === 0 || hpStyle.includes("aio");
          const wantsSplit = hasReclaim && hpStyle.includes("split");
          const filtered = HP_SIZE_RANGES.filter(sz =>
            (wantsAio && sz.aio) || (wantsSplit && sz.split)
          );
          return (
            <StepBlock title="Tank size range" hint="Multiple selections OK. Exact size within the range depends on the brand we install for you.">
              <div className={`qgrid qgrid--${filtered.length >= 3 ? 3 : 2}`}>
                {filtered.map(sz => (
                  <OptCard key={sz.id} multi checked={hpSize.includes(sz.id)}
                    onClick={() => setHpSize(a => toggle(a, sz.id))}
                    t={sz.t} s={sz.s} />
                ))}
              </div>
            </StepBlock>
          );
        })()}

        {currentStep === "hp-material" && (
          <StepBlock title="Tank material" hint="Happy with either? Tick both — we'll quote both.">
            <div className="qgrid qgrid--2">
              {HP_MATERIALS.map(m => (
                <OptCard key={m.id} multi checked={hpMaterial.includes(m.id)}
                  onClick={() => setHpMaterial(a => toggle(a, m.id))}
                  t={m.t} s={m.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "hp-wifi" && (
          <StepBlock title="Add WiFi / app control?">
            <div className="qgrid qgrid--2">
              <OptCard multi={false} checked={hpWifi === "yes"} onClick={() => setHpWifi("yes")}
                t="Yes — WiFi" s="Set schedules & watch running cost from your phone" />
              <OptCard multi={false} checked={hpWifi === "no"} onClick={() => setHpWifi("no")}
                t="No — standard" s="Just the unit, no app" />
            </div>
          </StepBlock>
        )}

        {currentStep === "split-brand" && (
          <StepBlock title="Which brand(s)?" hint="Multiple selections OK.">
            <div className="qgrid qgrid--2">
              {SPLIT_BRANDS.map(b => (
                <OptCard key={b.id} multi checked={splitBrand.includes(b.id)}
                  onClick={() => setSplitBrand(a => toggle(a, b.id))}
                  t={b.t} s={b.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "split-style" && (
          <StepBlock title="Single head, multi-head, or both?">
            <div className="qgrid qgrid--2">
              {SPLIT_STYLES.map(x => (
                <OptCard key={x.id} multi checked={splitStyle.includes(x.id)}
                  onClick={() => setSplitStyle(a => toggle(a, x.id))}
                  t={x.t} s={x.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "split-heads" && (
          <StepBlock
            title="Multi-head configuration"
            hint="Pick a size, then use + / − to set how many heads. Repeat for each size."
          >
            <div className="mhead">
              {MULTI_HEAD_SIZES.map(sz => {
                const count = splitHeadConfig[sz.id] ?? 0;
                return (
                  <div key={sz.id} className={`mhead__row ${count > 0 ? "is-on" : ""}`}>
                    <div className="mhead__label">
                      <span className="mhead__t">{sz.t}</span>
                      <span className="mhead__s">{sz.s}</span>
                    </div>
                    <div className="mhead__step">
                      <button type="button" className="mhead__btn"
                        onClick={() => updateHeadCount(sz.id, -1)}
                        aria-label={`Remove one ${sz.t} head`}>−</button>
                      <span className="mhead__count" aria-live="polite">{count}</span>
                      <button type="button" className="mhead__btn"
                        onClick={() => updateHeadCount(sz.id, +1)}
                        aria-label={`Add one ${sz.t} head`}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`mhead__total ${multiHeadOverCap ? "is-over" : ""}`}>
              <span>Total: <strong>{multiHeadCount} head{multiHeadCount === 1 ? "" : "s"} · {multiHeadTotal.toFixed(1)} kW</strong></span>
              <span>Typical max: {brandMaxKw} kW</span>
            </div>
            {multiHeadOverCap && (
              <p className="qhint qhint--warn">
                That&rsquo;s past the typical diversity max ({brandMaxKw} kW) for {labels(SPLIT_BRANDS, splitBrand)}. We can still design around it — or drop a head / add Kaden or Rinnai (23 kW).
              </p>
            )}
            <details className="mhead__example">
              <summary>Rough sizing guide for a 4-bedroom home</summary>
              <div>
                <p><strong>Kaden or Rinnai (18 kW condenser, ~23 kW heads):</strong> 1 × 3.5 kW master + 3 × 2.5 kW bedrooms + 1 × 7.1 kW living = 18.1 kW.</p>
                <p><strong>Mitsubishi (12 kW condenser, ~15 kW heads):</strong> 1 × 5.0 kW living + 1 × 3.5 kW master + 1 × 2.5 kW bedroom + 1 × 2.5 kW bedroom = 13.5 kW.</p>
                <p>Multi-head systems accept diversity oversizing (heads total more than the condenser rating) because not every room runs at full load at once.</p>
                <p>Not sure? Skip this and note &ldquo;floor plan coming&rdquo; on the details step — we&rsquo;ll design it.</p>
              </div>
            </details>
          </StepBlock>
        )}

        {currentStep === "split-size" && (
          <StepBlock title="Single-head size" hint="Multiple selections OK.">
            <div className="qgrid qgrid--3">
              {SPLIT_SIZES.map(sz => (
                <OptCard key={sz.id} multi checked={splitSize.includes(sz.id)}
                  onClick={() => setSplitSize(a => toggle(a, sz.id))}
                  t={sz.t} s={sz.s} />
              ))}
            </div>
            {splitSize.includes("unsure") && (
              <p className="qhint">No worries — attach your floor plan on the details step so we can size the heads.</p>
            )}
          </StepBlock>
        )}

        {currentStep === "ducted-size" && (
          <StepBlock title="Rough system size?" hint="Multiple selections OK.">
            <div className="qgrid qgrid--3">
              {DUCTED_SIZES.map(sz => (
                <OptCard key={sz.id} multi checked={ductedSize.includes(sz.id)}
                  onClick={() => setDuctedSize(a => toggle(a, sz.id))}
                  t={sz.t} s={sz.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "ducted-zones" && (
          <StepBlock title="How many zones?" hint="Pick every count you'd be open to.">
            <div className="qgrid qgrid--4">
              {ZONE_COUNTS.map(n => (
                <OptCard key={n.id} multi checked={ductedZones.includes(n.id)}
                  onClick={() => setDuctedZones(a => toggle(a, n.id))}
                  t={n.t} s={n.s} small />
              ))}
            </div>
            <p className="qhint">Zones = individually controlled areas. A typical 4-bed home uses 5–6, but there&rsquo;s no fixed rule — we custom-design every floor plan to your needs (we&rsquo;ve fitted 9 zones onto an 18 kW system).</p>
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
                  <li>Set-and-forget temperatures per zone</li>
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
                  <li>Lower up-front cost</li>
                </ul>
              </button>
            </div>
          </StepBlock>
        )}

        {currentStep === "svc-type" && (
          <StepBlock title="What needs looking at?" hint="Tick everything that applies.">
            <div className="qgrid qgrid--3">
              {SERVICE_TYPES.map(s => (
                <OptCard key={s.id} multi checked={svcType.includes(s.id)}
                  onClick={() => setSvcType(a => toggle(a, s.id))}
                  t={s.t} s={s.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "svc-stories" && (
          <StepBlock title="Single or double storey?">
            <div className="qgrid qgrid--2">
              {STORIES.map(s => (
                <OptCard key={s.id} multi={false} checked={svcStories === s.id}
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
            <div className="qfield qaddress">
              <span>Full address <em>(optional — starts autofilling after 3 letters)</em></span>
              <input
                type="text"
                placeholder="12 Main Rd, Pakenham VIC 3810"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setShowAddressSuggestions(true); }}
                onFocus={() => setShowAddressSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 150)}
                autoComplete="off"
              />
              {showAddressSuggestions && addressSuggestions.length > 0 && (
                <ul className="qaddress__list" role="listbox">
                  {addressSuggestions.map((s, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        className="qaddress__opt"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickAddressSuggestion(s)}
                      >
                        {s.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label className="qfield">
              <span>Anything else? <em>(optional)</em></span>
              <input type="text" placeholder="e.g. 4 bed house, easy roof access"
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <div className="qfield qphoto">
              <span>Photos of your current system <em>(optional — up to 6, helps us quote sharper)</em></span>
              <input type="file" accept="image/*" multiple
                disabled={photos.length >= 6}
                onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
              {photos.length > 0 && (
                <ul className="qphoto__list">
                  {photos.map((p, i) => (
                    <li key={i}>
                      <span>✓ {p.name}</span>
                      <button type="button" onClick={() => removePhoto(i)} aria-label={`Remove ${p.name}`}>×</button>
                    </li>
                  ))}
                </ul>
              )}
              {photos.length > 0 && (
                <span className="qphoto__hint">{photos.length} / 6 attached</span>
              )}
            </div>
            <p className="qcard__finep">
              We&rsquo;ll come back within 12 hours. No spam, no shared data.
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

function StepBlock({
  title, hint, children,
}: {
  title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="qstep">
      <h3 className="qstep__h">{title}</h3>
      {hint && <p className="qstep__hint">{hint}</p>}
      {children}
    </div>
  );
}

function OptCard({
  checked, onClick, t, s, small = false, multi = false,
}: {
  checked: boolean; onClick: () => void; t: string; s?: string; small?: boolean; multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`opt ${checked ? "is-on" : ""} ${small ? "opt--small" : ""} ${multi ? "opt--multi" : ""}`}
      aria-pressed={multi ? checked : undefined}
    >
      {multi && (
        <span className="opt__check" aria-hidden="true">
          {checked ? "✓" : ""}
        </span>
      )}
      <span className="opt__t">{t}</span>
      {s && <span className="opt__s">{s}</span>}
    </button>
  );
}
