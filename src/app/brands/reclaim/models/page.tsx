import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { findBrand } from "@/lib/brands";
import { SafeImg } from "@/components/SafeImg";
import { ReclaimModelFinder } from "@/components/ReclaimModelFinder";
import { ALL_RECLAIM_MODELS } from "@/lib/reclaimModels";
import { breadcrumbSchema } from "@/lib/schema";
import "../../../detail.css";
import "../../[brand]/brand.css";
import "./reclaim-models.css";

/**
 * Reclaim model codes, decoded.
 *
 * This page exists for one search behaviour: someone has a part number
 * and wants to know what it is. They have a quote with
 * REHP-CO2-315SSQ-V2 on it, or a spec sheet listing
 * HE-UM40CR-PHE-315ASR, and every result they currently get is a
 * manual-hosting site or a reseller in another state.
 *
 * So the page has to do three things, in this order:
 *   1. Contain every code as literal text in the server-rendered HTML,
 *      including the variants we don't stock, because a code we don't
 *      sell is still a search we can answer.
 *   2. Explain the naming convention, because half these searches are
 *      really "what does SSQ mean".
 *   3. Send them to the product page or the quote form.
 *
 * The filter is a convenience on top of the table, never a gate in
 * front of it.
 */

const CODE_SAMPLE = ALL_RECLAIM_MODELS.slice(0, 6).map((m) => m.code).join(", ");

export const metadata: Metadata = {
  title: "Reclaim Model Codes, REHP-CO2 & HE-UM",
  description:
    "Every Reclaim system code decoded: REHP-CO2 in GL, SST and SSQ from 160 to 400 L, V1.1 and V2 Wi-Fi, plus the Panasonic HE-UM40CR and HE-UM60CR on PHE tanks.",
  keywords: [
    "REHP-CO2-315SSQ",
    "REHP-CO2-315SSQ-V2",
    "HE-UM40CR-PHE-315ASR",
    "HE-UM60CR-PHE-315ASR",
    "Reclaim heat pump model codes",
    "Reclaim stainless steel heat pump",
    "Reclaim glass lined 315L",
    "Reclaim 160L heat pump",
  ],
  alternates: { canonical: "/brands/reclaim/models" },
};

/** The naming-convention explainer. This is the half of the page that
 *  answers "what does the Q mean", which is a search in its own right. */
const DECODER: { part: string; means: string }[] = [
  { part: "REHP", means: "Reclaim Energy Heat Pump. Every tank in Reclaim's own range starts with it, and every one of them runs the same 5 kW CO₂ heat pump, whatever the tank size." },
  { part: "CO2", means: "R744 carbon dioxide refrigerant. It is what lets these keep making heat on a cold morning when other refrigerants fade." },
  { part: "160 / 250 / 315 / 400", means: "Stored litres. Not how much shower you get, which is more, because 60 °C water gets blended down with cold on the way to the rose." },
  { part: "GL", means: "Glass-lined, also called vitreous enamel. Has a sacrificial anode that gets swapped every five to seven years. 10-year tank warranty." },
  { part: "SST", means: "Stainless Steel Tall. No anode, nothing to service, 15-year tank warranty. The taller, narrower body." },
  { part: "SSQ", means: "Stainless Steel Squat. Same steel and same warranty as the SST, in a short wide body that gets under a low eave or into a cupboard the tall one won't make. The Q is not a grade of steel." },
  { part: "DX", means: "Duplex. 2205 duplex / 316-grade stainless, on the REHP-KY-CO2-315DX. This is the only tank in the range that goes to 316. Everywhere else in the lineup, stainless means the standard grade, whatever the shape." },
  { part: "SSEW", means: "Stainless, on an Earthworker tank built in Morwell by a worker-owned co-op." },
  { part: "-V2", means: "The Wi-Fi controller, with the app and remote fault alerts. A code without it is the V1.1, the same system with a manual controller." },
  { part: "HE-UM40CR / HE-UM60CR", means: "Panasonic Aquarea CO₂ heat pumps, 4 kW and 6 kW, sold paired with a Reclaim tank. You will also see them written HE-UM40AR and HE-UM60AR; same pairing, different generation on the plate." },
  { part: "PHE-315ASR", means: "The Panasonic-partnered Australian-made tank. 315 is litres, ASR is stainless, AGR is vitreous enamel." },
];

/** Reclaim's residential component warranty table, as published. Kept
 *  as data rather than prose because the per-component split is the
 *  whole point: a customer comparing two quotes needs to see that the
 *  heat pump number moves and the tank number doesn't. */
const WARRANTY: { component: string; which: string; parts: string; labour: string }[] = [
  { component: "Tank", which: "Glass-lined (GL)", parts: "10 years", labour: "5 years" },
  { component: "Tank", which: "Stainless steel (SS)", parts: "15 years", labour: "5 years" },
  { component: "Tank", which: "ECO R290 all-in-one", parts: "8 years", labour: "8 years" },
  { component: "Heat pump", which: "Reclaim (EHPE-4550P-A)", parts: "10 years", labour: "10 years" },
  { component: "Heat pump", which: "Reclaim/Panasonic (HE-UM60AR)", parts: "7 years", labour: "7 years" },
  { component: "Controller", which: "Reclaim controller + sensor lead", parts: "10 years", labour: "10 years" },
  { component: "Controller", which: "Reclaim/Panasonic, non Wi-Fi", parts: "7 years", labour: "7 years" },
  { component: "Valves", which: "850 kPa PTRV", parts: "5 years", labour: "5 years" },
  { component: "Valves", which: "Quickie Kit", parts: "5 years", labour: "5 years" },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is the difference between REHP-CO2-315SST and REHP-CO2-315SSQ?",
    a: "Only the shape of the tank. SST is Stainless Steel Tall, SSQ is Stainless Steel Squat. Both hold 315 litres, both use the same stainless steel, both carry the 15-year tank warranty, and both run the same CO₂ heat pump. The squat is about 1490 mm high against roughly 1985 mm for the tall one, so it goes into spots with a low eave, a shelf overhead, or a doorway the tall tank will not fit through. There is no performance difference and, in our experience, no price difference either.",
  },
  {
    q: "Does the SSQ mean 316 marine-grade stainless?",
    a: "No, and it is a common mix-up. The Q stands for squat. The only tank in the Reclaim range that goes to 316 is the duplex, REHP-KY-CO2-315DX, which uses 2205 duplex stainless. Every other stainless tank in the lineup, tall or squat, is the standard grade.",
  },
  {
    q: "How big is the Reclaim heat pump, and how does the Panasonic compare?",
    a: "Reclaim's own CO₂ heat pump, the EHPE-4550P-A, is a 5 kW, and it is the same unit behind every tank in their range, from the 160 L to the 400 L. The Panasonic Aquarea pairing that Reclaim sell alongside it comes in two outputs, 4 kW and 6 kW. Bigger output means the tank refills faster, which is what matters when the whole house showers inside an hour rather than spread across the day. It is not about how hot the water gets, it is about how quickly you get the next tankful.",
  },
  {
    q: "Is the warranty the same on the Reclaim and the Panasonic heat pump?",
    a: "No, and it is worth knowing before you sign. Reclaim's own heat pump, the EHPE-4550P-A, carries 10 years parts and labour. The Reclaim/Panasonic unit carries 7 years parts and labour. The tanks are warranted the same either way, 10 years on glass-lined and 15 on stainless, both with 5 years labour. Reclaim also cap what a warranty service call covers at two hours labour and 25 km of travel, so anything past that is charged.",
  },
  {
    q: "What is the difference between a V1.1 and a V2 Reclaim?",
    a: "The controller. A V2 has Wi-Fi, an app, more operating modes, and it sends fault alerts to us and to Reclaim without anyone having to notice something is wrong. A V1.1 is the same heat pump and the same tank with a manual controller on the wall. If a code ends in -V2 it is the Wi-Fi one. Most of what we install now is V2, and it is worth having if you are on solar and want to time the run.",
  },
  {
    q: "What does the difference between glass-lined and stainless actually mean for me?",
    a: "Glass-lined tanks have a sacrificial anode, a rod that corrodes so the tank does not. It gets replaced every five to seven years and the tank warranty depends on it being done. Stainless has no anode, nothing to service, and the tank warranty runs 15 years rather than 10. Glass-lined is the right call if you are not planning to be in the house long. Stainless is the right call if you are, or if it is a rental where nobody is going to remember.",
  },
  {
    q: "Is the Panasonic CO₂ heat pump the same thing as a Reclaim?",
    a: "It is the same tank with a different compressor in front of it. Panasonic build the Aquarea CO₂ heat pump, HE-UM40CR at 4 kW and HE-UM60CR at 6 kW, and it is sold paired with an Australian-made PHE tank as a single system, which is why the code is the two joined together. The 6 kW refills the tank faster, which matters when the whole house showers inside an hour.",
  },
  {
    q: "I have a model code that is not on this list. What is it?",
    a: "Reclaim have changed their codes between generations, so an older quote or an existing unit can carry something not shown here. Send us a photo of the compliance plate on the tank and we will tell you what it is, what replaced it, and whether parts are still available for it.",
  },
];

export default function ReclaimModelsPage() {
  const brand = findBrand("reclaim");
  if (!brand) return null;

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Brands", url: `${site.url}/brands` },
    { name: "Reclaim", url: `${site.url}/brands/reclaim` },
    { name: "Model codes", url: `${site.url}/brands/reclaim/models` },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="page-detail page-brand" style={{ ["--card-accent" as string]: brand.accent }}>
      <Script id="reclaim-models-crumbs" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Script id="reclaim-models-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="dp-hero brand-hero">
        <div className="brand-hero__pic" aria-hidden="true">
          <SafeImg src={brand.photo} fallback={brand.photoFallback} alt="" width="1600" height="900" fetchPriority="high" />
        </div>
        <div className="brand-hero__scrim" aria-hidden="true" />
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/brands">Brands</Link>
            <span className="sep">/</span>
            <Link href="/brands/reclaim">Reclaim</Link>
            <span className="sep">/</span>
            <span className="cur">Model codes</span>
          </nav>
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" /> {brand.name} · every system code
          </div>
          <h1>
            Every <span className="accent">Reclaim</span> model code, decoded.
          </h1>
          <p className="dp-hero__sub">
            If you have a quote in front of you with REHP-CO2-315SSQ-V2 or
            HE-UM40CR-PHE-315ASR on it, this is the page that tells you what it is.
            Every tank size, every finish, Wi-Fi and non-Wi-Fi, Reclaim&rsquo;s own 5 kW
            CO₂ heat pump and the Panasonic Aquarea pairing in 4 kW and 6 kW, with what
            each one is actually warranted for. We install all of them across
            Melbourne&rsquo;s south-east.
          </p>
        </div>
      </section>

      {/* ---- The decoder ---- */}
      <section className="rm-decode">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Reading the code</span>
            <h2>What each part of the code means.</h2>
            <p>
              Reclaim codes read left to right: brand, refrigerant, litres, tank, controller.
              Once you know the four tank suffixes the whole range makes sense.
            </p>
          </div>

          <div className="rm-decode__sample" aria-hidden="true">
            <span className="rm-decode__seg">REHP</span>
            <span className="rm-decode__dash">-</span>
            <span className="rm-decode__seg">CO2</span>
            <span className="rm-decode__dash">-</span>
            <span className="rm-decode__seg rm-decode__seg--lit">315</span>
            <span className="rm-decode__seg rm-decode__seg--fin">SSQ</span>
            <span className="rm-decode__dash">-</span>
            <span className="rm-decode__seg rm-decode__seg--ctl">V2</span>
          </div>

          <dl className="rm-decode__list">
            {DECODER.map((d) => (
              <div key={d.part} className="rm-decode__row">
                <dt><code>{d.part}</code></dt>
                <dd>{d.means}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---- The full matrix ---- */}
      <section className="rm-table">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> The full range</span>
            <h2>Every system code we can supply and install.</h2>
            <p>
              {ALL_RECLAIM_MODELS.length} systems, including the ones we don&rsquo;t hold in
              stock, because a code we don&rsquo;t normally fit is still a question worth
              answering. Type a code, a size, or something like &ldquo;315 stainless
              squat&rdquo; and it will narrow.
            </p>
          </div>
          <ReclaimModelFinder />
          <p className="rm-table__note">
            Codes shown are Reclaim&rsquo;s and Panasonic&rsquo;s own, not ours. Reclaim revise
            them between generations, so the plate on an existing tank is the thing to go
            by. Anything flagged &ldquo;confirm on quote&rdquo; is a system we fit where we
            want to check the exact code against the current price list before we put it in
            writing for you.
          </p>
        </div>
      </section>

      {/* ---- Warranty ---- */}
      <section className="rm-warranty">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> What is covered, and for how long</span>
            <h2>The warranty is per component, not per system.</h2>
            <p>
              Reclaim warrant the tank, the heat pump, the controller and the valves
              separately, and for different lengths. The number people miss is the
              heat pump: Reclaim&rsquo;s own unit runs three years longer than the
              Reclaim/Panasonic one.
            </p>
          </div>

          <div className="rmf__scroll">
            <table className="rmf__table rm-warranty__table">
              <caption className="sr-only">
                Reclaim residential component warranty, parts and labour
              </caption>
              <thead>
                <tr>
                  <th scope="col">Component</th>
                  <th scope="col">Which one</th>
                  <th scope="col">Parts</th>
                  <th scope="col">Labour</th>
                </tr>
              </thead>
              <tbody>
                {WARRANTY.map((w) => (
                  <tr key={`${w.component}-${w.which}`}>
                    <th scope="row">{w.component}</th>
                    <td>{w.which}</td>
                    <td>{w.parts}</td>
                    <td>{w.labour}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="rm-table__note">
            Heat pump cover includes the PCBs, the motor, all six sensors, the reactor,
            the expansion valve coil, the water pump, and unit replacement on the sealed
            refrigeration components. Reclaim cap a warranty service call at two hours
            labour including travel up to 25 km; past that, the travel is charged. Our
            own 6-year workmanship warranty sits on top of all of it and covers the
            install rather than the equipment.
          </p>
        </div>
      </section>

      {/* ---- Questions ---- */}
      <section className="rm-faq">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> The questions we get</span>
            <h2>SST or SSQ, V1.1 or V2, glass-lined or stainless.</h2>
          </div>
          <div className="rm-faq__list">
            {FAQS.map((f) => (
              <details key={f.q} className="rm-faq__item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Where to go next ---- */}
      <section className="rm-next">
        <div className="wrap">
          <div className="rm-next__box">
            <h2>Know the code. Now work out if it&rsquo;s the right size.</h2>
            <p>
              A tank size on its own doesn&rsquo;t tell you whether it keeps up with your
              house. The calculator works your morning and evening showers against the tank
              and the compressor together, and tells you which of these systems suits.
            </p>
            <div className="rm-next__ctas">
              <Link href="/tools/heat-pump-sizing" className="ds-btn ds-btn--orange ds-btn--lg">
                Size it for your household →
              </Link>
              <Link href="/brands/reclaim/compare" className="ds-btn ds-btn--ghost ds-btn--lg">
                Compare the tank finishes →
              </Link>
              <Link href="/brands/reclaim" className="ds-btn ds-btn--ghost ds-btn--lg">
                All Reclaim systems →
              </Link>
            </div>
            <p className="rm-next__seo">
              We install and service the Reclaim CO₂ range across Pakenham, Officer,
              Berwick, Beaconsfield, Narre Warren, Cranbourne, Clyde North, Drouin and
              Warragul, and every postcode within 75 km. Codes on this page include{" "}
              {CODE_SAMPLE} and the rest of the range above.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
