"use client";

import { readUtm, trackLead } from "@/lib/track";

import { useEffect, useMemo, useRef, useState } from "react";
import { site } from "@/lib/site";

/* ============================================================
   Multi-step, multi-select branching quote form.
   Service (top step) is single-select, it drives the flow.
   Everything else is multi-select so a customer can be quoted
   across e.g. Reclaim + Thermann, 200L + 285L, etc.
   ============================================================ */

type ServiceId = "hp" | "split" | "ducted" | "service" | "water" | "other";

const SERVICES: { id: ServiceId; t: string; s: string }[] = [
  { id: "hp",      t: "Heat pump hot water",  s: "Reclaim · iStore · Thermann" },
  { id: "split",   t: "Split system aircon",  s: "Mitsubishi Electric · Kaden" },
  { id: "ducted",  t: "Ducted aircon",        s: "Whole-home cooling & heating" },
  { id: "service", t: "Service or repair",    s: "Gas, hot water, aircon" },
  { id: "water",   t: "Water filtration",     s: "Whole home · hot water · under sink" },
  // Most people know roughly what they want, but not all of them, and the
  // ones who don't were left choosing a category to get past the first
  // screen. This goes straight to the details step with the note box open.
  { id: "other",   t: "Not sure / something else", s: "Tell us in your own words" },
];

/* A "Not sure" answer stands for every option on its step, so it can't
   sit alongside them: picking it clears the rest, picking any of the rest
   clears it. */
const UNSURE = "unsure";

/* ---- Heat pump options ---- */

const HP_BRANDS = [
  { id: "reclaim",  t: "Reclaim",  s: "CO₂, quietest, holds up on cold mornings" },
  { id: "thermann", t: "Thermann", s: "Australian made, parts in every Reece store" },
  { id: "istore",   t: "iStore",   s: "Takes the VEU rebate furthest, smart-app ready" },
  { id: UNSURE,     t: "Not sure",  s: "Tell us how you use it, we'll recommend one" },
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

// Size ranges, availability depends on the style the customer picks:
//   AIO   : small (180–200 L) and large (275–300 L), every brand does AIO
//   Split : large (250–300 L) and xl (315–400 L), Reclaim only
type SizeRange = { id: string; t: string; s: string; aio: boolean; split: boolean };
const HP_SIZE_RANGES: SizeRange[] = [
  { id: "small", t: "180 L – 200 L", s: "1–2 people · Reclaim 200 L · Thermann 200 L · iStore 180 L", aio: true,  split: false },
  { id: "large", t: "275 L – 300 L", s: "3+ people · Reclaim 300 L · Thermann 285 L · iStore 275 L",  aio: true,  split: true  },
  { id: "xl",    t: "315 L – 400 L", s: "Reclaim split only · 315 L or 400 L",                        aio: false, split: true  },
  { id: UNSURE,  t: "Not sure",      s: "We'll size it from how many people live there",              aio: true,  split: true  },
];

const HP_MATERIALS = [
  { id: "stainless", t: "Stainless steel", s: "15-year warranty · ~$1,000 premium · will outlast the warranty" },
  { id: "glass",     t: "Glass lined",     s: "Standard build · more affordable · anode swapped at annual service" },
];

/* ---- Split-system options ---- */

const SPLIT_BRANDS = [
  { id: "mitsu",  t: "Mitsubishi Electric", s: "Premium · up to 15 kW total heads on a 12 kW multi condenser" },
  { id: "kaden",  t: "Kaden",               s: "Great value · up to 23 kW total heads on an 18 kW multi" },
  { id: UNSURE,   t: "No preference",       s: "We'll recommend one for the job" },
];
// Multi-head condensers can be diversity-oversized (typical ~130%).
// e.g. 21 kW of heads on an 18 kW condenser is fine, and Mitsubishi's
// MXZ range covers ~12 kW condensers with up to ~15 kW of heads.
const SPLIT_BRAND_MAX_KW: Record<string, number> = { mitsu: 15, kaden: 23 };

const SPLIT_STYLES = [
  { id: "single", t: "Single head",  s: "One indoor unit, one room" },
  { id: "multi",  t: "Multi-head",   s: "Multiple indoor units, one outdoor" },
  // Skips both sizing steps: kW per room is the question homeowners are
  // least able to answer, and we size it on site regardless.
  { id: UNSURE,   t: "Not sure yet", s: "Tell us the rooms, we'll design it" },
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
  { id: "unsure",  t: "Not sure, floor plan", s: "Send us a floor plan, we'll size it" },
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
  | "water-where" | "water-why"
  | "details";

const FLOWS: Record<ServiceId, StepId[]> = {
  hp:      ["service", "hp-brand", "hp-style", "hp-size", "hp-material", "hp-wifi", "details"],
  split:   ["service", "split-brand", "split-style", "split-heads", "split-size", "details"],
  ducted:  ["service", "ducted-size", "ducted-zones", "ducted-tablet", "details"],
  service: ["service", "svc-type", "svc-stories", "details"],
  water:   ["service", "water-where", "water-why", "details"],
  other:   ["service", "details"],
};

const WATER_WHERE = [
  { id: "whole",  t: "Whole home",   s: "On the main, so every tap and appliance gets it" },
  { id: "under",  t: "Under sink",   s: "Drinking and cooking water at the kitchen tap" },
  { id: "hot",    t: "Hot water",    s: "Sediment off the cold feed into the unit" },
  { id: "tank",   t: "Tank / rainwater", s: "Filtration plus UV on a rainwater supply" },
  { id: "unsure", t: "Not sure yet", s: "Tell us the symptom and we'll say which" },
];

const WATER_WHY = [
  { id: "taste",   t: "Taste or smell",   s: "Chlorine, or something off" },
  { id: "grit",    t: "Grit or cloudy",   s: "Sediment, rust, marks in the basin" },
  { id: "skin",    t: "Skin or hair",     s: "Dryness people put down to the water" },
  { id: "scale",   t: "Scale",            s: "Kettle, shower screen, glassware" },
  { id: "tankwtr", t: "It's tank water",  s: "Off the roof, and you'd like it treated" },
  { id: "protect", t: "Protecting a unit", s: "New hot water system to look after" },
];

/* ---- helpers ---- */

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}

/** toggle(), but "Not sure" and the real options exclude each other. */
function pick(arr: string[], v: string): string[] {
  if (arr.includes(v)) return arr.filter(x => x !== v);
  return v === UNSURE ? [UNSURE] : [...arr.filter(x => x !== UNSURE), v];
}

/* The details step checks itself rather than greying out the button.
   A disabled button says nothing about which of four boxes it wants. */
type FieldId = "name" | "phone" | "email" | "postcode";
function fieldErrors(f: Record<FieldId, string>): Partial<Record<FieldId, string>> {
  const e: Partial<Record<FieldId, string>> = {};
  if (!f.name.trim()) e.name = "So we know who to ask for";
  // Eight digits rather than ten: a landline without its area code is
  // still a number we can ring, and rejecting it costs the lead.
  if (f.phone.replace(/\D/g, "").length < 8) e.phone = "A number we can call or text";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Where the written quote goes";
  if (!/^\d{4}$/.test(f.postcode.trim())) e.postcode = "Four digits, e.g. 3810";
  return e;
}

/* ============================================================ */

export function HeroQuoteForm() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Set when the POST didn't land. The form keeps everything the
  // customer typed so they can retry or read us the phone number.
  const [sendFailed, setSendFailed] = useState(false);

  // Nothing pre-ticked. It used to open on heat pump, which read as a
  // choice already made for you.
  const [service, setService] = useState<ServiceId | null>(null);
  // Set once someone presses Next on a step they haven't answered, so the
  // prompt appears when it's useful and not before.
  const [nudge, setNudge] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const [waterWhere, setWaterWhere] = useState<string[]>([]);
  const [waterWhy, setWaterWhy] = useState<string[]>([]);

  // Multi-select fields (arrays).
  const [hpBrand, setHpBrand] = useState<string[]>([]);
  const [hpStyle, setHpStyle] = useState<string[]>([]);
  const [hpSize, setHpSize] = useState<string[]>([]);       // stored as `${brand}-${style}-${size}` composite ids
  const [hpMaterial, setHpMaterial] = useState<string[]>([]);
  // AIO units all ship with Wi-Fi built in, so default is yes. The Wi-Fi
  // step only surfaces when the customer opts into a Reclaim split.
  const [hpWifi, setHpWifi] = useState<"yes" | "no">("yes");

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
  const flow = useMemo((): StepId[] => {
    if (!service) return ["service"];
    if (service === "hp") {
      const hasReclaim = hpBrand.includes("reclaim");
      const wantsSplit = hasReclaim && hpStyle.includes("split");
      const steps: StepId[] = ["service", "hp-brand"];
      if (hasReclaim) steps.push("hp-style");
      steps.push("hp-size");
      if (wantsSplit) steps.push("hp-material");
      // Wi-Fi step only for split, AIO units all have Wi-Fi built in.
      if (wantsSplit) steps.push("hp-wifi");
      steps.push("details");
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
    const brands = splitBrand.filter(b => b !== UNSURE);
    if (brands.length === 0) return 18;
    return Math.min(...brands.map(b => SPLIT_BRAND_MAX_KW[b] ?? 18));
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
  const isLast = !!service && step === flow.length - 1;

  // A tall step can leave the next one starting above the top of a phone
  // screen, with the reader looking at the bottom half of a question. The
  // question is what gets scrolled to, not the card: on a phone the card's
  // own header is a third of the screen. scroll-margin-top in home.css
  // keeps it clear of the fixed site header.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const q = cardRef.current?.querySelector<HTMLElement>(".qstep__h");
    if (!q) return;
    if (q.getBoundingClientRect().top < 80) q.scrollIntoView({ behavior: "smooth", block: "start" });
    // Focus follows the question so a screen reader announces it.
    q.focus({ preventScroll: true });
  }, [step]);

  const errors = fieldErrors({ name, phone, email, postcode });
  // Open from the start wherever an earlier answer pointed at the note box:
  // "something else", where the note is the whole enquiry, and the split
  // answers that say "tell us the rooms" or "send a floor plan".
  const extrasOpen = showExtras || service === "other"
    || splitStyle.includes(UNSURE) || splitSize.includes(UNSURE);


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
        // Over-cap is a soft advisory, not a hard block, customer can still proceed.
        return splitStyle.includes("multi") ? multiHeadCount > 0 : true;
      case "split-size": return splitSize.length > 0;
      case "ducted-size": return ductedSize.length > 0;
      case "ducted-zones": return ductedZones.length > 0;
      case "ducted-tablet": return !!ductedTablet;
      case "svc-type": return svcType.length > 0;
      case "svc-stories": return !!svcStories;
      case "water-where": return waterWhere.length > 0;
      case "water-why": return waterWhy.length > 0;
      case "details": return Object.keys(fieldErrors({ name, phone, email, postcode })).length === 0;
      default: return false;
    }
    // waterWhere/waterWhy belong here for the same reason every other
    // answer does: the switch above reads them. They were missed when
    // the water branch was added, so the memo never recomputed on a tick
    // and Next stayed disabled no matter what you selected.
  }, [
    currentStep, service, hpBrand, hpStyle, hpSize, hpMaterial, hpWifi,
    splitBrand, splitStyle, multiHeadCount, multiHeadOverCap, splitSize,
    ductedSize, ductedZones, ductedTablet, svcType, svcStories,
    waterWhere, waterWhy,
    name, phone, email, postcode,
  ]);

  // A single-select first step has nothing to confirm, so a tap moves on.
  // Coming back and tapping the same card keeps what was answered after it.
  function handleService(id: ServiceId) {
    setNudge(false);
    setStep(1);
    if (id === service) return;
    setService(id);
    // Reset downstream to avoid stale selections crossing flows.
    setHpBrand([]); setHpStyle([]); setHpSize([]); setHpMaterial([]);
    setSplitBrand([]); setSplitStyle([]); setSplitHeadConfig({}); setSplitSize([]);
    setDuctedSize([]); setDuctedZones([]);
    setSvcType([]);
    setWaterWhere([]); setWaterWhy([]);
  }

  async function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = 6 - photos.length;
    if (remaining <= 0) {
      alert("Six photos is the max, remove one before adding more, or email extras after.");
      return;
    }
    const toAdd = Array.from(files).slice(0, remaining);
    const results: Array<{ name: string; type: string; data: string }> = [];
    for (const file of toAdd) {
      if (file.size > 8 * 1024 * 1024) {
        alert(`"${file.name}" is over 8 MB, skipped. Try a smaller photo or email it after.`);
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

  // Debounced address lookup via our /api/geocode proxy. That route uses
  // Mapbox if MAPBOX_ACCESS_TOKEN is set, otherwise Nominatim with a
  // proper User-Agent header (browser fetches can't set User-Agent, so
  // proxying via the server is the only reliable way for suburban AU).
  useEffect(() => {
    if (!address || address.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(address)}`,
          { signal: controller.signal, headers: { "Accept": "application/json" } },
        );
        if (!res.ok) return;
        const data = await res.json();
        const list: Array<{ display_name: string; postcode?: string }> = data.suggestions || [];
        setAddressSuggestions(
          list.map((s) => ({
            display_name: s.display_name,
            lat: "", lon: "",
            address: { postcode: s.postcode },
          })),
        );
      } catch {
        /* network / abort, ignore */
      }
    }, 300);
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
    if (service === "other") return "Not sure / something else, see notes";
    if (service === "hp") {
      const b = labels(HP_BRANDS, hpBrand);
      const st = labels(HP_STYLES, hpStyle);
      const sz = labels(HP_SIZE_RANGES, hpSize);
      const m = labels(HP_MATERIALS, hpMaterial);
      return `Heat pump, brand: ${b}; style: ${st}; size: ${sz}; material: ${m}; WiFi: ${hpWifi}`;
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
      return `Split, brand: ${b}; style: ${st}; ${parts.join("; ") || "(config to confirm)"}`;
    }
    if (service === "ducted") {
      const sz = labels(DUCTED_SIZES, ductedSize);
      const z = labels(ZONE_COUNTS, ductedZones);
      return `Ducted, size: ${sz}; zones: ${z}; Milieu tablet: ${ductedTablet}`;
    }
    if (service === "water") {
      const w = labels(WATER_WHERE, waterWhere);
      const y = labels(WATER_WHY, waterWhy);
      return `Water filtration, where: ${w}; noticed: ${y}`;
    }
    const st = labels(SERVICE_TYPES, svcType);
    return `Service, appliance: ${st}; ${svcStories} storey`;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canNext) {
      setNudge(true);
      if (currentStep === "details") {
        const first = (["name", "phone", "email", "postcode"] as FieldId[]).find(f => errors[f]);
        if (first) document.getElementById(`q-${first}`)?.focus();
      }
      return;
    }
    setNudge(false);
    if (!isLast) {
      setStep(s => s + 1);
      return;
    }
    setSubmitting(true);
    setSendFailed(false);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service, summary: summary(),
          details: {
            hpBrand, hpStyle, hpSize, hpMaterial, hpWifi,
            splitBrand, splitStyle, splitHeadConfig, splitSize,
            ductedSize, ductedZones, ductedTablet,
            svcType, svcStories,
            waterWhere, waterWhy,
          },
          name, phone, email, postcode, address, notes,
          photos, hp,
          // Which page this form was filled in on, and what brought them here.
          pagePath: typeof window !== "undefined" ? window.location.pathname : undefined,
          utm: readUtm(),
        }),
      });
      // `res.ok` was never checked and the catch swallowed everything,
      // so a 502 and a dead network both drew the same "thanks, we've
      // got it". The one thing a quote form must never do is tell
      // somebody their enquiry arrived when it didn't.
      if (!res.ok) throw new Error(`Quote POST failed: ${res.status}`);
      trackLead(service, summary());
      setDone(true);
    } catch (err) {
      console.error(err);
      setSendFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setDone(false);
    setSubmitting(false);
    setStep(0);
    setService(null);
    setNudge(false);
    setShowExtras(false);
    setHpBrand([]); setHpStyle([]); setHpSize([]); setHpMaterial([]);
    setHpWifi("yes");
    setSplitBrand([]); setSplitStyle([]); setSplitHeadConfig({}); setSplitSize([]);
    setDuctedSize([]); setDuctedZones([]); setDuctedTablet("yes");
    setSvcType([]); setSvcStories("single");
    setWaterWhere([]); setWaterWhy([]);
    setName(""); setPhone(""); setEmail(""); setPostcode("");
    setAddress(""); setNotes(""); setPhotos([]);
    setAddressSuggestions([]); setShowAddressSuggestions(false);
    setHp("");
  }

  if (done) {
    return (
      <aside className="qcard">
        <div className="qcard__done">
          <div className="qcard__done-tick">✓</div>
          <h2 className="qcard__h">Got it. We&apos;ll be in touch.</h2>
          <p className="qcard__sub">
            A real human will call or SMS you within 12 business hours with your fixed number and next step. Check your inbox, we&rsquo;ve sent a confirmation.
          </p>
          <div className="qcard__done-ctas">
            <button type="button" className="ds-btn ds-btn--orange ds-btn--lg" onClick={resetForm}>
              Submit another request →
            </button>
            <a href="tel:+61359478000" className="ds-btn ds-btn--ghost ds-btn--lg">
              Or call (03) 5947 8000
            </a>
          </div>
          <p className="qcard__finep" style={{ marginTop: 18 }}>
            Different address, different job, or something you forgot, hit &ldquo;Submit another request&rdquo; and we&rsquo;ll quote it too.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="qcard" ref={cardRef}>
      <div className="qcard__ribbon">
        <span className="qcard__ribbon-dot" />
        Free quote · usually replied within 12 hrs
      </div>

      <h2 className="qcard__h">Get a written quote</h2>
      <p className="qcard__sub">
        A few taps, then your contact details. Not sure about something? Say so, and we&rsquo;ll work it out with you.
      </p>

      {/* progress. Until a service is picked the number of steps isn't
          known, and "Step 1 / 2" that becomes "Step 2 / 7" reads as a trick. */}
      <div className="qcard__progress" aria-hidden="true">
        {service ? (
          <>
            {flow.map((_, i) => (
              <i key={i} className={i <= step ? "is-on" : ""} />
            ))}
            <span className="qcard__progress-lbl">Step {step + 1} / {flow.length}</span>
          </>
        ) : (
          <>
            <i className="is-on" /><i /><i />
            <span className="qcard__progress-lbl">About a minute</span>
          </>
        )}
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
          <StepBlock title="What can we help with?" hint="Tap one to start.">
            <div className="qgrid qgrid--2">
              {SERVICES.map(s => (
                <OptCard key={s.id} multi={false} checked={service === s.id}
                  onClick={() => handleService(s.id)} t={s.t} s={s.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "hp-brand" && (
          <StepBlock title="Which brand(s) of heat pump?" hint="Pick any you'd consider and we'll quote them all, or pick Not sure.">
            <div className="qgrid qgrid--2">
              {HP_BRANDS.map(b => (
                <OptCard key={b.id} multi checked={hpBrand.includes(b.id)}
                  onClick={() => {
                    const next = pick(hpBrand, b.id);
                    setHpBrand(next);
                    // Style and material are Reclaim-only questions; without
                    // Reclaim they're not asked, so they mustn't be sent either.
                    if (!next.includes("reclaim")) {
                      setHpStyle([]); setHpMaterial([]);
                      setHpSize(a => a.filter(x => x !== "xl"));
                    }
                  }}
                  t={b.t} s={b.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "hp-style" && (
          <StepBlock title="All-in-one or split, or quote both?" hint="All-in-one puts everything in one shell with nothing outside. Split is Reclaim only, quieter at the tank end, and costs more. Not sure? Pick both and we'll price them side by side.">
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
              <div className={`qgrid qgrid--${filtered.length === 3 ? 3 : 2}`}>
                {filtered.map(sz => (
                  <OptCard key={sz.id} multi checked={hpSize.includes(sz.id)}
                    onClick={() => setHpSize(a => pick(a, sz.id))}
                    t={sz.t} s={sz.s} />
                ))}
              </div>
            </StepBlock>
          );
        })()}

        {currentStep === "hp-material" && (
          <StepBlock title="Tank material" hint="Happy with either? Tick both, we'll quote both.">
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
          <StepBlock
            title="Wi-Fi controller on the split?"
            hint="Only asked for split systems, all-in-one units come with Wi-Fi built in."
          >
            <div className="qgrid qgrid--2">
              <OptCard multi={false} checked={hpWifi === "yes"} onClick={() => setHpWifi("yes")}
                t="Yes, Wi-Fi" s="Set schedules & watch running cost from your phone" />
              <OptCard multi={false} checked={hpWifi === "no"} onClick={() => setHpWifi("no")}
                t="No, standard" s="Manual wall controller only, lower cost" />
            </div>
          </StepBlock>
        )}

        {currentStep === "split-brand" && (
          <StepBlock title="Which brand(s)?" hint="Multiple selections OK.">
            <div className="qgrid qgrid--3">
              {SPLIT_BRANDS.map(b => (
                <OptCard key={b.id} multi checked={splitBrand.includes(b.id)}
                  onClick={() => setSplitBrand(a => pick(a, b.id))}
                  t={b.t} s={b.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "split-style" && (
          <StepBlock title="Single head, multi-head, or both?" hint="One room, or several rooms off one outdoor unit.">
            <div className="qgrid qgrid--3">
              {SPLIT_STYLES.map(x => (
                <OptCard key={x.id} multi checked={splitStyle.includes(x.id)}
                  onClick={() => setSplitStyle(a => pick(a, x.id))}
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
                That&rsquo;s past the typical diversity max ({brandMaxKw} kW) for {labels(SPLIT_BRANDS, splitBrand)}. We can still design around it, or drop a head / add Kaden (23 kW).
              </p>
            )}
            <details className="mhead__example">
              <summary>Rough sizing guide for a 4-bedroom home</summary>
              <div>
                <p><strong>Kaden (18 kW condenser, ~23 kW heads):</strong> 1 × 3.5 kW master + 3 × 2.5 kW bedrooms + 1 × 7.1 kW living = 18.1 kW.</p>
                <p><strong>Mitsubishi (12 kW condenser, ~15 kW heads):</strong> 1 × 5.0 kW living + 1 × 3.5 kW master + 1 × 2.5 kW bedroom + 1 × 2.5 kW bedroom = 13.5 kW.</p>
                <p>Multi-head systems accept diversity oversizing (heads total more than the condenser rating) because not every room runs at full load at once.</p>
                <p>Not sure? Skip this and note &ldquo;floor plan coming&rdquo; on the details step, we&rsquo;ll design it.</p>
              </div>
            </details>
          </StepBlock>
        )}

        {currentStep === "split-size" && (
          <StepBlock title="Single-head size" hint="Multiple selections OK.">
            <div className="qgrid qgrid--3">
              {SPLIT_SIZES.map(sz => (
                <OptCard key={sz.id} multi checked={splitSize.includes(sz.id)}
                  onClick={() => setSplitSize(a => pick(a, sz.id))}
                  t={sz.t} s={sz.s} />
              ))}
            </div>
            {splitSize.includes("unsure") && (
              <p className="qhint">No worries, attach your floor plan on the details step so we can size the heads.</p>
            )}
          </StepBlock>
        )}

        {currentStep === "ducted-size" && (
          <StepBlock title="Rough system size?" hint="Multiple selections OK.">
            <div className="qgrid qgrid--3">
              {DUCTED_SIZES.map(sz => (
                <OptCard key={sz.id} multi checked={ductedSize.includes(sz.id)}
                  onClick={() => setDuctedSize(a => pick(a, sz.id))}
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
            <p className="qhint">Zones = individually controlled areas. A typical 4-bed home uses 5–6, but there&rsquo;s no fixed rule, we custom-design every floor plan to your needs (we&rsquo;ve fitted 9 zones onto an 18 kW system).</p>
          </StepBlock>
        )}

        {currentStep === "ducted-tablet" && (
          <StepBlock title="Add the Milieu Lab tablet controller?">
            <div className="qgrid qgrid--2">
              <button type="button"
                onClick={() => setDuctedTablet("yes")}
                className={`optbig ${ductedTablet === "yes" ? "is-on" : ""}`}>
                <div className="optbig__head">
                  <span className="optbig__t">Yes, Milieu Lab tablet</span>
                  <span className="optbig__s">Wall-mounted 7&Prime; smart controller</span>
                </div>
                <ul className="qbullets">
                  <li>Individual room temperatures, timers &amp; schedules</li>
                  <li>Set-and-forget temperatures per zone</li>
                  <li>Smart-home &amp; iZone (ITC) compatible</li>
                  <li>Premium finish, fits luxury builds &amp; renos</li>
                </ul>
              </button>
              <button type="button"
                onClick={() => setDuctedTablet("no")}
                className={`optbig ${ductedTablet === "no" ? "is-on" : ""}`}>
                <div className="optbig__head">
                  <span className="optbig__t">No, standard controller</span>
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

        {currentStep === "water-where" && (
          <StepBlock title="Where do you want it?" hint="Tick everything you'd consider.">
            <div className="qgrid qgrid--2">
              {WATER_WHERE.map(w => (
                <OptCard key={w.id} multi checked={waterWhere.includes(w.id)}
                  onClick={() => setWaterWhere(a => pick(a, w.id))}
                  t={w.t} s={w.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "water-why" && (
          <StepBlock title="What have you noticed?" hint="The symptom is the useful part, it usually decides which unit.">
            <div className="qgrid qgrid--3">
              {WATER_WHY.map(w => (
                <OptCard key={w.id} multi checked={waterWhy.includes(w.id)}
                  onClick={() => setWaterWhy(a => toggle(a, w.id))}
                  t={w.t} s={w.s} />
              ))}
            </div>
          </StepBlock>
        )}

        {currentStep === "details" && (() => {
          const show = (f: FieldId) => (nudge ? errors[f] : undefined);
          return (
          <StepBlock title="Where should we send it?" hint="Four quick boxes, and your phone can usually fill them in for you.">
            <div className="qrow">
              <Field id="name" label="First name" error={show("name")}>
                <input id="q-name" type="text" placeholder="Jamie" value={name}
                  autoComplete="given-name" enterKeyHint="next"
                  aria-invalid={!!show("name")} aria-describedby={show("name") ? "q-name-err" : undefined}
                  onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field id="phone" label="Mobile" error={show("phone")}>
                <input id="q-phone" type="tel" placeholder="04xx xxx xxx" value={phone}
                  autoComplete="tel" inputMode="tel" enterKeyHint="next"
                  aria-invalid={!!show("phone")} aria-describedby={show("phone") ? "q-phone-err" : undefined}
                  onChange={(e) => setPhone(e.target.value)} required />
              </Field>
            </div>
            <div className="qrow">
              <Field id="email" label="Email" error={show("email")}>
                <input id="q-email" type="email" placeholder="you@example.com" value={email}
                  autoComplete="email" inputMode="email" enterKeyHint="next" autoCapitalize="none" spellCheck={false}
                  aria-invalid={!!show("email")} aria-describedby={show("email") ? "q-email-err" : undefined}
                  onChange={(e) => setEmail(e.target.value)} required />
              </Field>
              <Field id="postcode" label="Postcode" error={show("postcode")}>
                <input id="q-postcode" type="text" placeholder="3810" value={postcode}
                  autoComplete="postal-code" inputMode="numeric" enterKeyHint="next"
                  aria-invalid={!!show("postcode")} aria-describedby={show("postcode") ? "q-postcode-err" : undefined}
                  // Digits only, capped after stripping rather than with maxLength,
                  // which would cut a pasted "VIC 3810" down to "VIC ".
                  onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))} required />
              </Field>
            </div>
            <div className="qfield qaddress">
              <span>Street address <em>(optional, start typing and pick it from the list)</em></span>
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

            {/* The note and the photos help the quote but aren't needed for
                it, and as two more boxes they made the last step look like a
                second form. One line until somebody wants them, unless an
                earlier answer asked for them (see extrasOpen). */}
            {!extrasOpen ? (
              <button type="button" className="qextras" onClick={() => setShowExtras(true)}>
                + Add a note or photos <em>(optional, helps us quote sharper)</em>
              </button>
            ) : (
              <>
                <label className="qfield">
                  <span>
                    {service === "other" ? "What's going on?" : "Anything else?"} <em>(optional)</em>
                  </span>
                  <textarea rows={service === "other" ? 3 : 2}
                    placeholder={service === "other"
                      ? "e.g. heater's making a noise, or we want to get off gas"
                      : "e.g. 4 bed house, easy roof access"}
                    value={notes} onChange={(e) => setNotes(e.target.value)} />
                </label>
                <div className="qfield qphoto">
                  <span>Photos of your current system <em>(optional, up to 6)</em></span>
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
              </>
            )}
            <p className="qcard__finep">
              We&rsquo;ll come back within 12 hours. No spam, no shared data.
            </p>
          </StepBlock>
          );
        })()}

        {nudge && !canNext && currentStep !== "details" && (
          <p className="qhint qhint--warn" role="alert">
            {currentStep === "service" ? "Tap one to start." : "Pick at least one to carry on."}
          </p>
        )}

        {sendFailed && (
          <div className="qfail" role="alert">
            <strong>That didn&rsquo;t send.</strong> Nothing you typed has been lost. Press
            the button again, or ring us on{" "}
            <a href={`tel:${site.phoneE164}`}>{site.phone}</a> and we&rsquo;ll take the details
            over the phone.
          </div>
        )}

        <div className="qcard__foot">
          <button
            type="button"
            className="qback"
            onClick={() => { setNudge(false); setStep(s => Math.max(0, s - 1)); }}
            disabled={step === 0}
          >
            ← Back
          </button>
          <button
            type="submit"
            className="ds-btn ds-btn--orange ds-btn--lg qnext"
            disabled={submitting}
          >
            {isLast
              ? submitting
                ? "Sending…"
                : sendFailed
                  ? "Try again →"
                  : "Send my request →"
              : "Next →"}
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
      <h3 className="qstep__h" tabIndex={-1}>{title}</h3>
      {hint && <p className="qstep__hint">{hint}</p>}
      {children}
    </div>
  );
}

function Field({
  id, label, error, children,
}: {
  id: FieldId; label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <label className={`qfield ${error ? "is-err" : ""}`}>
      <span>{label} *</span>
      {children}
      {error && <span className="qfield__err" id={`q-${id}-err`}>{error}</span>}
    </label>
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
