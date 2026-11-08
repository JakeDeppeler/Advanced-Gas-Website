import { openingHours, services, site } from "@/lib/site";
import { CATS, HOME_FAQS, PRODUCT_FAQS, QB, SERVICES, SHOW_FINANCE, SIZE_NOTE, TOOLS, installTime, systemHref, type FaqKey } from "@/lib/homepage/data";
import { SYS_INTRO, SYS_PROS } from "@/lib/homepage/learn";
import { serviceContent } from "@/lib/serviceContent";
import { brands } from "@/lib/brands";
import { REBATE_FAQS } from "@/lib/rebates";
import { FAULT_CODES } from "@/lib/faultCodes";
import { publishedSuburbs, suburbs } from "@/lib/suburbs";
import { RADIUS_KM } from "@/lib/suburbCoords";
import { dollarFigures, lead, withoutPrices } from "./text";

/**
 * What the public instant-answer chat knows: the site's own FAQ, system,
 * brand, rebate and area records, read from the modules the pages render, so
 * the chat says what the page says and changes when it does.
 *
 * Not chat/knowledge.ts. That one feeds the office's draft replies, which a
 * person reads before sending, and it carries the published "from" prices and
 * the after-hours rates. This one answers the public with nobody in between,
 * and prices are hidden site-wide on purpose, so every answer here has its
 * price sentences taken out (withoutPrices) and finance answers are dropped
 * while SHOW_FINANCE is off.
 */

export type Entry = {
  id: string;
  /** The question as the site words it. Matched more heavily than the answer. */
  q: string;
  a: string;
  /** Extra words to match on that the answer doesn't repeat: the system or brand it's about. */
  tags?: string;
  href?: string;
  label?: string;
};

const W = (s: string | undefined | null) => s ?? "";

let cache: Entry[] | null = null;

export function entries(): Entry[] {
  if (cache) return cache;
  const out: Entry[] = [];
  const add = (e: Entry) => {
    // A question about a price ("Is there a call-out fee?") has no answer here once the price is gone.
    if (/\b(?:cost|price|how much|fee|charge|rate)s?\b/i.test(e.q) && !/rebate|veu/i.test(e.q)) return;
    const a = withoutPrices(e.a);
    if (a) out.push({ ...e, a });
  };

  /* The business itself, from site.ts. */
  add({ id: "site.hours", q: "What are your opening hours? When are you open?", tags: "office time weekday weekend", a: `We're on the tools ${openingHours()}. For an emergency outside those hours, like a gas leak or no hot water, call ${site.phone}: it's answered 24/7.`, href: "/contact", label: "Contact us" });
  add({ id: "site.contact", q: "How do I contact you? What's your phone number and email?", tags: "call ring phone email contact reach", a: `Call ${site.phone} or email ${site.email}. For a price, the quote form is the quickest way in.`, href: "/contact", label: "Contact us" });
  add({ id: "site.address", q: "Where are you based? What's your address?", tags: "location workshop located address pakenham", a: `We're based in ${site.address.suburb}: ${site.address.street}, ${site.address.suburb} ${site.address.state} ${site.address.postcode}.`, href: "/contact", label: "Contact us" });
  add({ id: "site.licences", q: "Are you licensed? What are your licence numbers?", tags: "licence license licensed registered arc arctick plumber gasfitter qualified insured", a: `Yes. ${site.licences.plumbing}, and ${site.licences.refrigeration} for air conditioning and refrigeration work.`, href: "/about", label: "About us" });
  add({ id: "site.area", q: "What areas do you cover? Which suburbs do you service?", tags: "area suburb travel come cover region", a: `Pakenham and about ${RADIUS_KM} km around it, across ${site.primaryRegion}.`, href: "/service-areas", label: "Areas we cover" });
  add({ id: "site.services", q: "What services do you offer? What do you do?", tags: "service offer work job", a: `${services.map((s) => s.name).join(", ")}, for homes and businesses.`, href: "/services", label: "Our services" });

  /* What we do, from the homepage's service cards. */
  for (const c of SERVICES) {
    if (c.href.startsWith("tel:")) continue;
    const extra = c.href === "/services/gas-plumbing" ? QB.gasAppliance.opts.map((o) => o.label).join(" ") : "";
    add({ id: `card.${c.href}`, q: `Do you do ${c.plain.toLowerCase()}? ${c.t}`, tags: `${c.cta} ${extra}`, a: c.s, href: c.href, label: c.t });
  }

  /* The homepage FAQ. */
  HOME_FAQS.forEach((f, i) => {
    if (f.finance && !SHOW_FINANCE) return;
    add({ id: `home.${i}`, q: f.q, a: f.a });
  });

  /* Each system in the finder: what it is, how long, its pros and cons, the brands, its FAQ. */
  const faqDone = new Set<FaqKey>();
  for (const cat of CATS) {
    for (const s of cat.systems) {
      const href = systemHref(s.slug);
      const label = s.label;
      const sharing = CATS.flatMap((c) => c.systems).filter((o) => o.faq === s.faq);
      const tags = `${s.label} ${s.sub} ${cat.label}`;
      if (SYS_INTRO[s.slug]) add({ id: `sys.${s.slug}.intro`, q: `What is a ${s.label.toLowerCase()}? How does it work?`, tags, a: SYS_INTRO[s.slug], href, label });
      add({ id: `sys.${s.slug}.time`, q: `How long does a ${s.label.toLowerCase()} install take?`, tags, a: `${installTime(s)}. We confirm it at the free site check.`, href, label });
      const pros = SYS_PROS[s.slug];
      if (pros) add({ id: `sys.${s.slug}.pros`, q: `${s.label}: pros and cons, good and bad points`, tags: `${tags} advantage disadvantage downside worth`, a: `Good: ${pros.pros.slice(0, 3).join("; ").toLowerCase()}. Worth knowing: ${pros.cons.slice(0, 2).join("; ").toLowerCase()}.`, href, label });
      const sizes = s.sizes.map((o) => `${o.label}${o.sub ? ` (${o.sub.toLowerCase()})` : ""}: ${o.spec ?? ""}`.trim()).join("; ");
      add({ id: `sys.${s.slug}.size`, q: `What size ${s.label.toLowerCase()} do I need? ${s.q}`, tags: `${tags} size sizing big capacity litre kw`, a: `As a rough guide: ${sizes}. ${SIZE_NOTE}`, href, label });
      const models = [...new Set(s.tiers.filter((t) => !t.same).map((t) => `${t.brand} ${t.model}`))];
      if (models.length) add({ id: `sys.${s.slug}.brands`, q: `What brands of ${s.label.toLowerCase()} do you install?`, tags: `${tags} brand model which`, a: `For ${s.label.toLowerCase()} we install: ${models.join(", ")}.`, href, label });
      if (!faqDone.has(s.faq)) {
        faqDone.add(s.faq);
        const allTags = sharing.map((o) => `${o.label} ${o.sub}`).join(" ");
        PRODUCT_FAQS[s.faq].forEach((f, i) => add({ id: `faq.${s.faq}.${i}`, q: f.q, tags: allTags, a: f.a, href, label }));
      }
    }
  }

  /* The service pages and their systems. */
  for (const svc of services) {
    const c = serviceContent[svc.slug];
    if (!c) continue;
    const href = `/services/${svc.slug}`;
    c.faqs.forEach((f, i) => add({ id: `svc.${svc.slug}.${i}`, q: f.q, tags: svc.name, a: f.a, href, label: svc.short }));
    for (const sys of c.systems ?? []) {
      const sHref = sys.intro ? `${href}/${sys.id}` : href;
      (sys.faqs ?? []).forEach((f, i) => add({ id: `svc.${svc.slug}.${sys.id}.${i}`, q: f.q, tags: `${sys.label} ${svc.name}`, a: f.a, href: sHref, label: sys.label }));
    }
  }

  /* Brands: whether we fit them, and their own FAQ. */
  for (const b of brands) {
    const href = `/brands/${b.slug}`;
    const range = b.productLabel.replace(/^[^·]*·\s*/, "");
    add({ id: `brand.${b.slug}`, q: `Do you install ${b.name}?`, tags: `${b.name} ${range} brand`, a: `Yes, we install ${b.name}: ${range}. ${lead(b.intro)}`, href, label: b.name });
    (b.faqs ?? []).forEach((f, i) => add({ id: `brand.${b.slug}.${i}`, q: f.q, tags: b.name, a: f.a, href, label: b.name }));
  }

  /* Rebates. */
  REBATE_FAQS.forEach((f, i) => add({ id: `rebate.${i}`, q: f.q, tags: "rebate veu victorian energy upgrades", a: f.a, href: "/rebates", label: "VEU rebates" }));

  /* The calculators. */
  for (const t of TOOLS) add({ id: `tool.${t.href}`, q: `${t.t}: ${t.s}`, tags: "calculator calculate estimate tool work out", a: `Our ${t.t.toLowerCase()} works that out: ${t.s.charAt(0).toLowerCase()}${t.s.slice(1)}.`, href: t.href, label: t.t });

  cache = out;
  return out;
}

/** Our brands, by every name people use for them. */
export function ourBrands() {
  return brands.map((b) => ({
    slug: b.slug,
    name: b.name,
    names: [b.name, b.name.split(" ")[0], ...(b.slug === "mitsubishi-electric" ? ["mitsubishi", "mitsi"] : []), ...(b.slug === "reclaim" ? ["reclaim"] : [])]
      .map((n) => n.toLowerCase()),
    range: b.productLabel.replace(/^[^·]*·\s*/, ""),
    intro: b.intro,
  }));
}

/**
 * Every dollar figure the chat may repeat: the rebate amounts the site states.
 * withoutPrices keeps no other kind, so whatever figures survive in the
 * entries are, by construction, rebate figures the site already prints.
 */
let allowed: Set<string> | null = null;
export function allowedFigures(): Set<string> {
  return (allowed ??= new Set(entries().flatMap((e) => dollarFigures(e.a))));
}

/**
 * The knowledge as one block of text for the model's system prompt. Stable
 * byte for byte between requests, so it caches.
 */
let prompt: string | null = null;
export function promptKnowledge(): string {
  if (prompt) return prompt;
  const out: string[] = [
    "# The business",
    `${site.name}, ${site.address.street}, ${site.address.suburb} ${site.address.state} ${site.address.postcode}. Phone ${site.phone}, email ${site.email}.`,
    `Licences: ${site.licences.plumbing}; ${site.licences.refrigeration}.`,
    `Office hours ${openingHours()}. The main number is answered 24/7 for emergencies.`,
    `Service area: Pakenham and about ${RADIUS_KM} km around it (${site.primaryRegion}).`,
    `Services: ${services.map((s) => `${s.name}: ${s.blurb}`).join(" ")}`,
    `Brands we install: ${ourBrands().map((b) => `${b.name} (${b.range})`).join("; ")}.`,
    "",
    "# Questions and answers from the website",
  ];
  const seen = new Set<string>();
  for (const e of entries()) {
    const key = `${e.q}|${e.a}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(`Q: ${e.q}${e.tags ? ` [about: ${e.tags}]` : ""}\nA: ${e.a}${e.href ? `\nPage: ${e.href}` : ""}`);
  }
  out.push("", "# Fault codes (brand, code: meaning. First check)");
  for (const f of FAULT_CODES) out.push(`${f.brand} ${f.code}: ${f.meaning}. ${f.firstCheck}${f.severity === "critical" ? " (Serious: turn it off and call.)" : ""}`);
  out.push(
    "",
    "# Suburbs we cover (km from the Pakenham workshop)",
    suburbs.map((s) => `${s.name} ${s.postcode} (${s.distanceKm} km)`).join(", "),
    `Suburbs with their own page on the site: ${publishedSuburbs.map((s) => s.name).join(", ")}.`,
  );
  return (prompt = out.join("\n"));
}
