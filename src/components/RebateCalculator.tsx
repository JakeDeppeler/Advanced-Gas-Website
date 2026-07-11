"use client";

import { useMemo, useState } from "react";
import { site } from "@/lib/site";

/**
 * VEU + Solar Homes rebate estimator for Advanced Gas & Aircon.
 *
 * Pricing rule (per Jake):
 *   RRP (ex GST from the manufacturer pricebook)
 *   − $100 discount
 *   + GST
 *   + labour + electrical + materials + BPC compliance
 *   − VEEC + STC + VIC Solar (if eligible) + Aus-Made (if brand eligible)
 *   = customer final price inc GST
 *
 * Australian Made $400 rebate applies to Reclaim, Thermann and Dux.
 * VIC Solar Homes $1,000 rebate has eligibility criteria (owner-occupier,
 * combined household income < $150k, property value < $3M, no prior HW /
 * battery Solar Homes rebate at the address, existing HW system 3+ yrs
 * old). See the tooltip on that step.
 */

/* ------- constants ------- */
const RRP_DISCOUNT   = 100;
const GST_RATE       = 1.1;
const VEEC           = 576;   // per Reclaim 400 SS V2 FieldPulse quote (8 × $72)
const STC            = 629;   // per Reclaim 400 SS V2 FieldPulse quote (17 × $37)
const AUS_MADE       = 400;
const VIC_SOLAR      = 1_000;
const POWER_ADDON    = 450;   // new power point + electrical when AIO doesn't have one

// Install cost packs (ex GST). AIO is plug-in, no electrical needed.
// Split labour bumped to $1,000, materials $500, electrical $400 per the
// latest FieldPulse quote, same $1,950 ex GST total, redistributed.
const INSTALL_EXGST = {
  aio:   700   + 350 +   0 + 50,    // labour + materials + BPC              = 1,100
  split: 1_000 + 500 + 400 + 50,    // labour + materials + electrical + BPC = 1,950
};

/* ------- data ------- */

type Category = "hp" | "ac";
type InstallType = "aio" | "split";

type Product = {
  id: string;
  name: string;
  desc: string;
  rrp: number;          // ex GST from manufacturer pricebook
  install: InstallType;
  needsPower?: boolean; // AIO plug-ins need a power point within 50cm
};

type Brand = {
  id: string;
  t: string;
  s: string;
  ausMade: boolean;
  products: Product[];
};

// Reclaim RRPs from the June 2026 pricebook (VIC column). Others are
// placeholders until Jake sends the real RRPs.
const HP_BRANDS: Brand[] = [
  {
    id: "reclaim",
    t: "Reclaim",
    s: "Australian made · R290 / CO₂",
    ausMade: true,
    products: [
      { id: "reclaim-r290-200",  name: "Reclaim R290 all-in-one 200 L",     desc: "1–2 person homes · plug-in", rrp: 3195, install: "aio",   needsPower: true },
      { id: "reclaim-r290-300",  name: "Reclaim R290 all-in-one 300 L",     desc: "3–4 person homes · plug-in", rrp: 3545, install: "aio",   needsPower: true },
      { id: "reclaim-co2-315gl", name: "Reclaim CO₂ split 315 L GL Wi-Fi",  desc: "4–5 person homes",           rrp: 5375, install: "split" },
      { id: "reclaim-co2-400gl", name: "Reclaim CO₂ split 400 L GL Wi-Fi",  desc: "Large households",           rrp: 5745, install: "split" },
      { id: "reclaim-co2-315ss", name: "Reclaim CO₂ split 315 L SS Wi-Fi",  desc: "Stainless · 15-yr warranty", rrp: 6345, install: "split" },
      { id: "reclaim-co2-400ss", name: "Reclaim CO₂ split 400 L SS Wi-Fi",  desc: "Top of the range",           rrp: 6755, install: "split" },
    ],
  },
  {
    id: "thermann",
    t: "Thermann",
    s: "Australian made · great value",
    ausMade: true,
    products: [
      { id: "thermann-200", name: "Thermann R290 all-in-one 200 L", desc: "1–2 person homes · plug-in", rrp: 3195, install: "aio", needsPower: true },
      { id: "thermann-285", name: "Thermann R290 all-in-one 285 L", desc: "3–4 person homes · plug-in", rrp: 3545, install: "aio", needsPower: true },
    ],
  },
  {
    id: "istore",
    t: "iStore",
    s: "Smart-app ready",
    ausMade: false,
    products: [
      { id: "istore-180", name: "iStore 180 L", desc: "1–3 person homes", rrp: 2800, install: "split" },
      { id: "istore-275", name: "iStore 275 L", desc: "3–5 person homes", rrp: 2800, install: "split" },
    ],
  },
  {
    id: "dux",
    t: "Dux",
    s: "Australian made",
    ausMade: true,
    products: [
      { id: "dux-250", name: "Dux Airoheat 250 L", desc: "3–4 person homes", rrp: 3200, install: "split" },
      { id: "dux-315", name: "Dux Airoheat 315 L", desc: "4–5 person homes", rrp: 3600, install: "split" },
    ],
  },
  {
    id: "rinnai",
    t: "Rinnai",
    s: "Reliable, common parts",
    ausMade: false,
    products: [
      { id: "rinnai-250", name: "Rinnai heat pump 250 L", desc: "3–4 person homes", rrp: 3300, install: "split" },
      { id: "rinnai-315", name: "Rinnai heat pump 315 L", desc: "4–5 person homes", rrp: 3700, install: "split" },
    ],
  },
];

const AC_BRANDS = [
  { id: "mitsu",  t: "Mitsubishi Electric", s: "Premium quiet inverter" },
  { id: "kaden",  t: "Kaden",               s: "Great value, 5-yr warranty" },
  { id: "rinnai", t: "Rinnai",              s: "Reliable, common parts" },
];

/* ------- component ------- */

type YesNo = "yes" | "no";

export function RebateCalculator() {
  const [category, setCategory] = useState<Category>("hp");
  const [brandId, setBrandId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [power, setPower] = useState<YesNo>("yes");
  const [solar, setSolar] = useState<YesNo>("no");
  const [showSolarCriteria, setShowSolarCriteria] = useState(false);

  const brand = HP_BRANDS.find((b) => b.id === brandId);
  const product = brand?.products.find((p) => p.id === productId);

  const step = category === "ac"
    ? (brandId ? 3 : 1)
    : (product ? 3 : brandId ? 2 : 1);

  const calc = useMemo(() => {
    if (!brand || !product) return null;
    const unitIncGST = (product.rrp - RRP_DISCOUNT) * GST_RATE;
    const installIncGST = INSTALL_EXGST[product.install] * GST_RATE;
    const powerAddOn = product.needsPower && power === "no" ? POWER_ADDON : 0;
    const veec = VEEC;
    const stc  = STC;
    const ausMade = brand.ausMade ? AUS_MADE : 0;
    const solarR = solar === "yes" ? VIC_SOLAR : 0;
    const rebates = veec + stc + ausMade + solarR;
    const subtotal = unitIncGST + installIncGST + powerAddOn;
    const total = Math.max(0, Math.round(subtotal - rebates));
    return { unitIncGST, installIncGST, powerAddOn, veec, stc, ausMade, solarR, rebates, subtotal, total };
  }, [brand, product, power, solar]);

  function pickCategory(c: Category) {
    setCategory(c);
    setBrandId("");
    setProductId("");
  }

  return (
    <div className="rb-calc rb-calc--v2">
      <div className="rb-calc__head">
        <h3>Quick rebate + price estimator</h3>
        <p className="rb-calc__sub">Indicative, final price and eligibility confirmed at the site check.</p>
      </div>

      {/* Progress */}
      <div className="rb-calc__progress" aria-hidden="true">
        <i className={step >= 1 ? "is-on" : ""} />
        <i className={step >= 2 ? "is-on" : ""} />
        <i className={step >= 3 ? "is-on" : ""} />
        <span>Step {Math.min(step, 3)} / 3</span>
      </div>

      {/* Step 1, category */}
      <div className="rb-calc__block">
        <span className="rb-calc__qlabel">1. What are you upgrading?</span>
        <div className="rb-calc__grid rb-calc__grid--2">
          <button
            type="button"
            className={`rb-calc__card ${category === "hp" ? "is-on" : ""}`}
            onClick={() => pickCategory("hp")}
          >
            <span className="rb-calc__card-t">Heat pump hot water</span>
            <span className="rb-calc__card-s">Reclaim · Thermann · Dux · iStore · Rinnai</span>
          </button>
          <button
            type="button"
            className={`rb-calc__card ${category === "ac" ? "is-on" : ""}`}
            onClick={() => pickCategory("ac")}
          >
            <span className="rb-calc__card-t">Cooling</span>
            <span className="rb-calc__card-s">Mitsubishi Electric · Kaden · Rinnai</span>
          </button>
        </div>
      </div>

      {/* Heat pump path */}
      {category === "hp" && (
        <>
          {/* Step 2, brand */}
          <div className="rb-calc__block">
            <span className="rb-calc__qlabel">2. Which brand?</span>
            <div className="rb-calc__grid rb-calc__grid--3">
              {HP_BRANDS.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  className={`rb-calc__card ${brandId === b.id ? "is-on" : ""}`}
                  onClick={() => { setBrandId(b.id); setProductId(""); }}
                >
                  <span className="rb-calc__card-t">
                    {b.t}
                    {b.ausMade && <span className="rb-calc__aus"> AU-made</span>}
                  </span>
                  <span className="rb-calc__card-s">{b.s}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3, product */}
          {brand && (
            <div className="rb-calc__block">
              <span className="rb-calc__qlabel">3. Which model / size?</span>
              <div className="rb-calc__grid rb-calc__grid--2">
                {brand.products.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={`rb-calc__card ${productId === p.id ? "is-on" : ""}`}
                    onClick={() => setProductId(p.id)}
                  >
                    <span className="rb-calc__card-t">{p.name}</span>
                    <span className="rb-calc__card-s">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Eligibility modifiers */}
          {product && (
            <>
              <div className="rb-calc__block rb-calc__block--modifiers">
                {product.needsPower && (
                  <div className="rb-calc__mod rb-calc__mod--full">
                    <span className="rb-calc__qlabel">Power point within 50 cm of current hot water?</span>
                    <div className="rb-calc__grid rb-calc__grid--2">
                      <button type="button"
                        className={`rb-calc__pill ${power === "yes" ? "is-on" : ""}`}
                        onClick={() => setPower("yes")}>Yes, existing</button>
                      <button type="button"
                        className={`rb-calc__pill ${power === "no" ? "is-on" : ""}`}
                        onClick={() => setPower("no")}>No, need a new one</button>
                    </div>
                    <p className="rb-calc__note">
                      If &ldquo;no&rdquo; we add ~${POWER_ADDON.toLocaleString()} for a new power point (electrical + compliance).
                    </p>
                  </div>
                )}
                <div className="rb-calc__mod rb-calc__mod--full">
                  <span className="rb-calc__qlabel">
                    VIC Solar Homes hot water rebate eligible?
                    <button
                      type="button"
                      className="rb-calc__info"
                      onClick={() => setShowSolarCriteria((v) => !v)}
                      aria-expanded={showSolarCriteria}
                    >
                      {showSolarCriteria ? "hide criteria" : "who’s eligible?"}
                    </button>
                  </span>
                  <div className="rb-calc__grid rb-calc__grid--2">
                    <button type="button"
                      className={`rb-calc__pill ${solar === "yes" ? "is-on" : ""}`}
                      onClick={() => setSolar("yes")}>Yes</button>
                    <button type="button"
                      className={`rb-calc__pill ${solar === "no" ? "is-on" : ""}`}
                      onClick={() => setSolar("no")}>No / not sure</button>
                  </div>
                  {showSolarCriteria && (
                    <div className="rb-calc__criteria">
                      <p>You qualify for the $1,000 Solar Homes hot water rebate if <strong>all</strong> of the following are true:</p>
                      <ul>
                        <li>Owner-occupier of the property where the system is being installed</li>
                        <li>Combined household taxable income under <strong>$150,000</strong> per year</li>
                        <li>Property value under <strong>$3 million</strong></li>
                        <li>The address hasn&rsquo;t already received a hot water or solar battery rebate under the Solar Homes Program</li>
                        <li>Existing hot water system is at least <strong>3 years old</strong> from the date of purchase</li>
                      </ul>
                      <p>Moved house after taking a Solar Homes rebate/loan? You can apply again at the new address if it hasn&rsquo;t received these rebates before.</p>
                    </div>
                  )}
                </div>
              </div>

              {calc && (
                <div className="rb-calc__result">
                  <div className="rb-calc__result-row">
                    <span className="rb-calc__result-l">Estimated total rebate</span>
                    <span className="rb-calc__result-num">${calc.rebates.toLocaleString()}</span>
                  </div>
                  <div className="rb-calc__result-row">
                    <span className="rb-calc__result-l">Est. fully installed price</span>
                    <span className="rb-calc__result-num rb-calc__result-num--net">
                      ${calc.total.toLocaleString()}<small> inc GST</small>
                    </span>
                  </div>
                  <details className="rb-calc__breakdown">
                    <summary>See the breakdown</summary>
                    <div className="rb-calc__breakdown-inner">
                      <div><span>Unit ({product.name})</span><span>${Math.round(calc.unitIncGST).toLocaleString()}</span></div>
                      <div><span>Labour, materials, {product.install === "split" ? "electrical, " : ""}BPC compliance</span><span>${Math.round(calc.installIncGST).toLocaleString()}</span></div>
                      {calc.powerAddOn > 0 && <div><span>New power point &amp; electrical</span><span>${calc.powerAddOn.toLocaleString()}</span></div>}
                      <div className="rb-calc__breakdown-sub"><span>Subtotal inc GST</span><span>${Math.round(calc.subtotal).toLocaleString()}</span></div>
                      <div className="rb-calc__breakdown-rebate"><span>VEEC rebate</span><span>−${calc.veec.toLocaleString()}</span></div>
                      <div className="rb-calc__breakdown-rebate"><span>STC rebate</span><span>−${calc.stc.toLocaleString()}</span></div>
                      {calc.ausMade > 0 && <div className="rb-calc__breakdown-rebate"><span>Australian Made rebate</span><span>−${calc.ausMade.toLocaleString()}</span></div>}
                      {calc.solarR > 0 && <div className="rb-calc__breakdown-rebate"><span>VIC Solar Homes rebate</span><span>−${calc.solarR.toLocaleString()}</span></div>}
                      <div className="rb-calc__breakdown-total"><span>You pay</span><span>${calc.total.toLocaleString()}</span></div>
                    </div>
                  </details>
                  <div className="rb-calc__cta">
                    <a href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Lock this rebate in →</a>
                    <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
                      Or call {site.phone}
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Cooling path, custom quote */}
      {category === "ac" && (
        <>
          <div className="rb-calc__block">
            <span className="rb-calc__qlabel">2. Which brand?</span>
            <div className="rb-calc__grid rb-calc__grid--3">
              {AC_BRANDS.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  className={`rb-calc__card ${brandId === b.id ? "is-on" : ""}`}
                  onClick={() => setBrandId(b.id)}
                >
                  <span className="rb-calc__card-t">{b.t}</span>
                  <span className="rb-calc__card-s">{b.s}</span>
                </button>
              ))}
            </div>
          </div>

          {brandId && (
            <div className="rb-calc__result">
              <div className="rb-calc__result-row">
                <span className="rb-calc__result-l">Cooling install</span>
                <span className="rb-calc__result-num rb-calc__result-num--net">Custom quote</span>
              </div>
              <p className="rb-calc__result-blurb">
                Splits, multi-heads and ducted systems vary a lot with kW, zones and layout, we quote every cooling job individually after a quick site check so the price is honest.
              </p>
              <div className="rb-calc__cta">
                <a href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a cooling quote →</a>
                <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
                  Or call {site.phone}
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
