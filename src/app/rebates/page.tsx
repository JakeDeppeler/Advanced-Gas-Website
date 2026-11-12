import type { Metadata } from "next";
import Image from "next/image";
import { site } from "@/lib/site";
import { quoted } from "@/lib/homepage/data";
import { faqSchema, breadcrumbSchema } from "@/lib/schema";
import { RebateCalculator } from "@/components/RebateCalculator";
import { JsonLd } from "@/components/JsonLd";
import { REBATE_FAQS as faqs } from "@/lib/rebates";
import { Crumbs, Hero, Next } from "@/components/homepage/page/kit";
import { BkHead, Bands, Tabs, EndCta, BandPage, type Band } from "@/components/homepage/page/bands";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
// The calculator's own styles live with the route; the bands around it are new.
import "./rebates.css";
import "@/components/homepage/page/rebates.css";

export const metadata: Metadata = {
  title:
    "VEU Rebates Pakenham, Applied at the Quote",
  description:
    "VEU-accredited installer in Pakenham. Check your eligibility for the Victorian Energy Upgrades rebate on heat pumps and aircon. Free 60-second check.",
  keywords: [
    "VEU rebate Pakenham",
    "Victorian energy upgrades",
    "heat pump rebate Victoria",
    "aircon rebate Pakenham",
    "VEU eligibility",
    "VEU accredited installer Berwick",
  ],
  alternates: { canonical: "/rebates" },
};

/** `scene` is an install photo, cropped to fill; the rest are product shots on white. */
const products = [
  {
    brand: "Reclaim · CO₂ Split",
    name: "Reclaim CO₂ split heat pump",
    bullets: [
      "Compressor split from tank, quieter, longer life",
      "Stainless steel 15-year warranty option",
      "315 L or 400 L, Wi-Fi smart control",
      "Best for: staying in the house, and for solar pairing",
    ],
    price: "from $5,340",
    rebate: "$2,605 VEU rebate applied",
    pill: "long-life tank",
    photo: "/reclaim-split-back.webp",
    photoAlt: "Reclaim CO₂ split heat pump install",
    scene: true,
  },
  {
    brand: "Reclaim · R290 AIO",
    name: "Reclaim R290 all-in-one 285 L",
    bullets: [
      "Plug-in all-in-one, tank + compressor in one unit",
      "R290 refrigerant, low GWP",
      "Compact footprint, fast, simple installs",
      "Best for: 3–4 person homes with nowhere to put an outdoor unit",
    ],
    price: "$2,610",
    rebate: "$2,605 VEU rebate applied",
    pill: "nothing outside",
    // Was the Thermann install photo; this is the Reclaim unit itself.
    photo: "/Reclaim-EcoAIO-Products-NewLogo-600PX-400x631-1.webp",
    photoAlt: "Reclaim ECO R290 all-in-one heat pumps",
  },
  {
    brand: "iStore",
    name: "iStore 275 L heat pump",
    bullets: [
      "Smart Wi-Fi control + scheduling",
      "Australian designed",
      "5-year warranty on the whole unit",
      "Best for: solar-paired households",
    ],
    price: "$2,910",
    rebate: "$2,205 VEU rebate applied",
    pill: "rebate goes furthest",
    // Was the Thermann install photo; this is the iStore.
    photo: "/270L-istore-heatpump.webp",
    photoAlt: "iStore heat pump",
  },
  {
    brand: "Thermann · R290",
    name: "Thermann 285 L R290 all-in-one",
    bullets: [
      "Australian made, extra $400 rebate",
      "R290 refrigerant, low GWP",
      "5-year tank warranty",
      "Best for: 3–4 person homes, and anywhere parts have to be here today",
    ],
    price: "$2,610",
    rebate: "$2,605 VEU rebate applied",
    pill: "Australian made",
    photo: "/thermann-heat-pump.webp",
    photoAlt: "Thermann 285 L R290 heat pump",
    scene: true,
  },
  {
    brand: "Mitsubishi Electric",
    name: "Mitsubishi MSZ-AP series split",
    bullets: [
      "Inverter, R32 refrigerant",
      "Whisper-quiet 19 dB indoor",
      "5-year warranty",
      "2.5kW / 3.5kW / 5kW / 7kW",
    ],
    price: "custom quote",
    rebate: "up to $1,800 rebate",
    pill: "our default",
    photo: "/mitsubishi-msz-ap-wall-split-v2-v3.webp",
    photoAlt: "Mitsubishi Electric MSZ-AP wall split system",
  },
  {
    brand: "Kaden",
    name: "Kaden KSI-v3 series split",
    bullets: [
      "Inverter, R32 refrigerant",
      "5-year warranty",
      "Australian designed",
      "Whole house on one parts list",
    ],
    price: "custom quote",
    rebate: "up to $1,500 rebate",
    pill: "whole house at once",
    photo: "/kaden-indoor.webp",
    photoAlt: "Kaden split system indoor head install",
    scene: true,
  },
  {
    brand: "Mitsubishi / Kaden",
    name: "Ducted aircon retrofit",
    bullets: [
      "Whole-home zoned cooling",
      "Replacement of inefficient gas heating",
      "Best for: 3+ bedroom homes",
      "5–7 year warranty",
    ],
    price: "from $11,000",
    rebate: "up to $5,000 rebate",
    pill: "whole home",
    photo: "/ducted-condenser.webp",
    photoAlt: "Ducted aircon condenser install",
    scene: true,
  },
];

const steps = [
  {
    t: "You request a quote",
    d: "Online form (60 seconds) or call. Snap a photo of your current unit if you can, speeds things up.",
  },
  {
    t: "We assess eligibility",
    d: "Free 20-minute site visit. We check your existing system, hot water usage, electrical & gas setup against VEU rules.",
  },
  {
    t: "We apply the rebate",
    d: "Your quote arrives with the rebate already deducted. You sign off, no separate claim, no waiting weeks for refund.",
  },
  {
    t: "We install & certify",
    d: "One-day install on most jobs. Old gear removed, compliance certificate emailed within 24 hours.",
  },
];

export default function RebatesPage() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "VEU Rebates", url: `${site.url}/rebates` },
  ]);

  const bands: Band[] = [
    {
      // The calculator is why most people land here, so it comes first.
      id: "calc", tab: "Check my rebate", cls: "rbx__tool",
      body: (
        <>
          <div className="rbx__copy">
            <BkHead h="Am I eligible? Answer 4 things, {find out in 30 seconds}.">
              The VEU program is open to most Victorian households, owner-occupied, rental, and units.
              This rough calculator gives you a real ballpark of your rebate before you commit to a site visit.
            </BkHead>
            <ul className="rbx__ticks">
              <li>No personal details needed for the estimate</li>
              <li>Real rebate figures, taken off at the quote</li>
              <li>Final figure confirmed at the free 20-min site check</li>
            </ul>
          </div>
          {/* The calculator's styles are scoped to .page-rebates in ./rebates.css. */}
          <div className="page-rebates rbx__calc"><RebateCalculator /></div>
        </>
      ),
    },
    {
      id: "how", tab: "How VEU works", navy: true,
      body: (
        <>
          <BkHead h="Four steps from “thinking about it” to {rebate applied}." />
          <ol className="lk2__tl kx__tl">
            {steps.map((s, i) => <li key={s.t}><span className="pxb__n" aria-hidden="true">{i + 1}</span><h3>{s.t}</h3><p>{s.d}</p></li>)}
          </ol>
        </>
      ),
    },
    {
      id: "products", tab: "Eligible products",
      body: (
        <>
          <BkHead h="Heat pumps & aircon we install {under the VEU program}.">
            Each of these is VEU-listed, in stock through our Reece partnership, and proven across hundreds of
            south-east installs. The rebate shown is the indicative range; your actual figure depends on your old unit and home.
          </BkHead>
          <div className="kxr rbx__prods" data-anim="stagger">
            {products.map((p) => (
              <article key={p.name} className="kxr__card">
                <span className={`kxr__img${p.scene ? " kxr__img--scene" : ""}`}>
                  <Image src={p.photo} alt={p.photoAlt} fill sizes="(max-width: 600px) 90vw, 380px" />
                </span>
                <div className="kxr__t">
                  <span className="kxr__g">{p.brand}</span>
                  <h3>{p.name}</h3>
                  <p className="rbx__rebate">{p.rebate}</p>
                  <ul>{p.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                  <div className="rbx__foot">
                    <span className="rbx__price">
                      <strong>{quoted(p.price)}</strong>
                      <small>{quoted(p.price) === p.price ? "fully installed, inc GST" : "Fixed price in writing, inc GST"}</small>
                    </span>
                    <span className="rbx__pill">{p.pill}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      ),
    },
    {
      id: "faq", tab: "FAQs", cls: "pp__two",
      body: (
        <>
          <BkHead h="The fine print, {in plain English}.">
            If your question isn&rsquo;t here, <a href={`tel:${site.phoneE164}`} data-call-from="rebates-faq">call us on {site.phone}</a>. We&rsquo;ve handled hundreds of VEU jobs and seen the curly cases.
          </BkHead>
          <div className="afaqs">
            {faqs.map((f, i) => (
              <details key={f.q} className="afaq" open={i === 0}><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </div>
        </>
      ),
    },
    {
      // A reader who has just worked out they qualify needs somewhere to go
      // besides the quote form: what it buys, their own postcode, the case
      // for a heat pump, and what it saves.
      id: "next", tab: "Where next",
      body: (
        <>
          <BkHead h="Now you know {it applies}." />
          <Next items={[
            { t: "See what it buys", s: "Every model and size we install, brand by brand.", href: "/brands" },
            { t: "Check your postcode", s: "The rebate moves with where you live and what you are replacing.", href: "/tools/veu-rebate-estimator" },
            { t: "Heat pump or gas?", s: "How a heat pump makes hot water, and which suits your place.", href: "/services/heat-pump-installation" },
            { t: "What you get back", s: "Your current bill against a heat pump, and how long it takes to pay for itself.", href: "/tools/hot-water-savings" },
          ]} />
        </>
      ),
    },
  ];

  return (
    <BandPage>
      <Crumbs trail={[{ name: "VEU rebates" }]} />
      <Hero
        eye="Victorian Energy Upgrades · Accredited installer"
        title={<>The VEU rebate is real. <em>We do the paperwork.</em></>}
        sub={<>The Victorian Government pays you to swap old gas, electric or inefficient cooling for clean, efficient gear. We&rsquo;re a VEU-accredited installer in Pakenham, and we apply the rebate at quote stage so there&rsquo;s no chase, no claim form, no waiting.</>}
        img="/reclaim-split-back.webp"
        imgAlt="A Reclaim split heat pump we installed under the VEU rebate, tank and compressor against a brick wall"
        ctas={false}
        facts={[
          { v: "up to $2,600", k: "heat pump hot water" },
          { v: "up to $5,000", k: "split & ducted aircon" },
          { v: "~73%", k: "cut to running costs" },
          { v: "$0 chase", k: "we apply it at the quote" },
        ]}
      >
        <div className="bxh__ctas">
          <a href="#calc" className="abtn abtn--or abtn--flat">Check my rebate →</a>
          <a href={`tel:${site.phoneE164}`} className="abtn abtn--line" data-call-from="rebates-hero">Or talk to a human</a>
        </div>
      </Hero>
      <Tabs list={bands} />
      <Bands list={bands} />
      <EndCta
        title={<>We put it in writing, and the rebate is <span>already off it</span>.</>}
        text="A free site visit, a written quote inside 12 business hours, and the number on it is the number you pay."
        from="rebates-cta"
      />
      <JsonLd data={faqSchema(faqs)} />
      <JsonLd data={crumbs} />
    </BandPage>
  );
}
