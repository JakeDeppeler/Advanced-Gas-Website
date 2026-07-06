"use client";

import { useMemo, useState } from "react";
import { site } from "@/lib/site";

/**
 * VEU rebate estimator — Advanced Gas & Aircon partner calculator.
 *
 * Heat pump hot water path uses real Advanced Gas installed pricing
 * (inc GST) for Reclaim; other brands are still indicative until we
 * update them. Cooling path is quoted custom on-site since every home
 * layout / kW spec is different.
 *
 * Pricing rule (Reclaim): our ex-GST price = Reclaim RRP − $150, plus
 * GST, plus installation & compliance. The values below are the fully
 * installed inc-GST customer price after VEU rebate.
 */

type Category = "hp" | "ac";
type Prop = "own" | "rent";
type Conc = "no" | "yes";
type Power = "yes" | "no";

type Product = {
  id: string;
  name: string;
  desc: string;
  rebate: number;            // approximate VEU rebate ($)
  price: number;             // fully installed inc-GST customer price ($)
  needsPower?: boolean;      // AIO / plug-in units: price assumes a nearby power point
};

const HP_BRANDS: { id: string; t: string; s: string; products: Product[] }[] = [
  {
    id: "reclaim",
    t: "Reclaim",
    s: "Australian made · R290 / CO₂",
    products: [
      // All-in-One (Eco R290) — VIC pricing. Reclaim RRP $3,195 (200L) / $3,545 (300L)
      { id: "reclaim-r290-200",   name: "Reclaim R290 all-in-one 200 L", desc: "1–2 person homes · plug-in",     rebate: 2400, price: 2610, needsPower: true },
      { id: "reclaim-r290-300",   name: "Reclaim R290 all-in-one 300 L", desc: "3–4 person homes · plug-in",     rebate: 2600, price: 2610, needsPower: true },
      // CO₂ split — glass-lined Wi-Fi
      { id: "reclaim-co2-315gl",  name: "Reclaim CO₂ split 315 L GL Wi-Fi",  desc: "4–5 person homes",           rebate: 2800, price: 5100 },
      { id: "reclaim-co2-400gl",  name: "Reclaim CO₂ split 400 L GL Wi-Fi",  desc: "Large households",            rebate: 3000, price: 5470 },
      // CO₂ split — stainless steel Wi-Fi (15 yr warranty)
      { id: "reclaim-co2-315ss",  name: "Reclaim CO₂ split 315 L SS Wi-Fi",  desc: "Stainless · 15-yr warranty",  rebate: 2800, price: 6070 },
      { id: "reclaim-co2-400ss",  name: "Reclaim CO₂ split 400 L SS Wi-Fi",  desc: "Top of the range",            rebate: 3000, price: 6480 },
    ],
  },
  {
    id: "thermann",
    t: "Thermann",
    s: "Great value · Australian made",
    products: [
      { id: "thermann-aio-200",   name: "Thermann all-in-one 200 L R290", desc: "1–2 person homes · plug-in", rebate: 2200, price: 2610, needsPower: true },
      { id: "thermann-aio-285",   name: "Thermann all-in-one 285 L R290", desc: "3–4 person homes · plug-in", rebate: 2400, price: 2610, needsPower: true },
    ],
  },
  {
    id: "istore",
    t: "iStore",
    s: "Smart-app ready",
    products: [
      { id: "istore-aio-180", name: "iStore all-in-one 180 L", desc: "1–3 person homes", rebate: 2200, price: 2130, needsPower: true },
      { id: "istore-aio-270", name: "iStore 270 L split",      desc: "3–5 person homes", rebate: 2400, price: 3900 },
    ],
  },
  {
    id: "dux",
    t: "Dux",
    s: "Australian designed",
    products: [
      { id: "dux-airoheat-250", name: "Dux Airoheat 250 L", desc: "3–4 person homes", rebate: 2300, price: 3200 },
      { id: "dux-airoheat-315", name: "Dux Airoheat 315 L", desc: "4–5 person homes", rebate: 2500, price: 3600 },
    ],
  },
  {
    id: "rinnai",
    t: "Rinnai",
    s: "Reliable, common parts",
    products: [
      { id: "rinnai-hp-250", name: "Rinnai heat pump 250 L", desc: "3–4 person homes", rebate: 2300, price: 3300 },
      { id: "rinnai-hp-315", name: "Rinnai heat pump 315 L", desc: "4–5 person homes", rebate: 2400, price: 3700 },
    ],
  },
];

const AC_BRANDS = [
  { id: "mitsu", t: "Mitsubishi Electric", s: "Premium quiet inverter" },
  { id: "kaden", t: "Kaden",               s: "Great value, 5-yr warranty" },
  { id: "rinnai", t: "Rinnai",             s: "Reliable, common parts" },
];

export function RebateCalculator() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<Category>("hp");
  const [brandId, setBrandId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [prop, setProp] = useState<Prop>("own");
  const [conc, setConc] = useState<Conc>("no");
  const [power, setPower] = useState<Power>("yes");

  const brand = HP_BRANDS.find((b) => b.id === brandId);
  const product = brand?.products.find((p) => p.id === productId);

  const { rebate, netPrice, powerAddOn } = useMemo(() => {
    if (!product) return { rebate: 0, netPrice: 0, powerAddOn: 0 };
    let r = product.rebate;
    if (prop === "rent") r = Math.round(r * 0.92);
    if (conc === "yes") r += 200;
    const addOn = product.needsPower && power === "no" ? 450 : 0;
    const net = Math.max(0, product.price + addOn);
    return { rebate: r, netPrice: net, powerAddOn: addOn };
  }, [product, prop, conc, power]);

  function pickCategory(c: Category) {
    setCategory(c);
    setBrandId("");
    setProductId("");
    setStep(1);
  }
  function pickBrand(id: string) {
    setBrandId(id);
    setProductId("");
    setStep(2);
  }
  function pickProduct(id: string) {
    setProductId(id);
    setStep(3);
  }

  return (
    <div className="rb-calc rb-calc--v2">
      <div className="rb-calc__head">
        <h3>Quick VEU rebate estimator</h3>
        <p className="rb-calc__sub">Indicative only — final eligibility &amp; rebate confirmed on-site.</p>
      </div>

      {/* Progress */}
      <div className="rb-calc__progress" aria-hidden="true">
        <i className={step >= 1 ? "is-on" : ""} />
        <i className={step >= 2 ? "is-on" : ""} />
        <i className={step >= 3 ? "is-on" : ""} />
        <span>Step {step} / 3</span>
      </div>

      {/* Step 1 — category */}
      <div className="rb-calc__block">
        <span className="rb-calc__qlabel">1. What are you upgrading?</span>
        <div className="rb-calc__grid rb-calc__grid--2">
          <button
            type="button"
            className={`rb-calc__card ${category === "hp" ? "is-on" : ""}`}
            onClick={() => pickCategory("hp")}
          >
            <span className="rb-calc__card-t">Heat pump hot water</span>
            <span className="rb-calc__card-s">Thermann · Reclaim · Dux · iStore · Rinnai</span>
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
          {/* Step 2 — brand */}
          <div className="rb-calc__block">
            <span className="rb-calc__qlabel">2. Which brand?</span>
            <div className="rb-calc__grid rb-calc__grid--3">
              {HP_BRANDS.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  className={`rb-calc__card ${brandId === b.id ? "is-on" : ""}`}
                  onClick={() => pickBrand(b.id)}
                >
                  <span className="rb-calc__card-t">{b.t}</span>
                  <span className="rb-calc__card-s">{b.s}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3 — product */}
          {brand && (
            <div className="rb-calc__block">
              <span className="rb-calc__qlabel">3. Which model / size?</span>
              <div className="rb-calc__grid rb-calc__grid--2">
                {brand.products.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={`rb-calc__card ${productId === p.id ? "is-on" : ""}`}
                    onClick={() => pickProduct(p.id)}
                  >
                    <span className="rb-calc__card-t">{p.name}</span>
                    <span className="rb-calc__card-s">{p.desc}</span>
                    <span className="rb-calc__card-rebate">~ ${p.rebate.toLocaleString()} rebate</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modifiers */}
          {product && (
            <>
              <div className="rb-calc__block rb-calc__block--modifiers">
                <div className="rb-calc__mod">
                  <span className="rb-calc__qlabel">Property</span>
                  <div className="rb-calc__grid rb-calc__grid--2">
                    <button type="button"
                      className={`rb-calc__pill ${prop === "own" ? "is-on" : ""}`}
                      onClick={() => setProp("own")}>Owner-occupied</button>
                    <button type="button"
                      className={`rb-calc__pill ${prop === "rent" ? "is-on" : ""}`}
                      onClick={() => setProp("rent")}>Rental</button>
                  </div>
                </div>
                <div className="rb-calc__mod">
                  <span className="rb-calc__qlabel">Concession card holder?</span>
                  <div className="rb-calc__grid rb-calc__grid--2">
                    <button type="button"
                      className={`rb-calc__pill ${conc === "no" ? "is-on" : ""}`}
                      onClick={() => setConc("no")}>No</button>
                    <button type="button"
                      className={`rb-calc__pill ${conc === "yes" ? "is-on" : ""}`}
                      onClick={() => setConc("yes")}>Yes</button>
                  </div>
                </div>
                {product.needsPower && (
                  <div className="rb-calc__mod rb-calc__mod--full">
                    <span className="rb-calc__qlabel">Power point within 50 cm of current hot water?</span>
                    <div className="rb-calc__grid rb-calc__grid--2">
                      <button type="button"
                        className={`rb-calc__pill ${power === "yes" ? "is-on" : ""}`}
                        onClick={() => setPower("yes")}>Yes</button>
                      <button type="button"
                        className={`rb-calc__pill ${power === "no" ? "is-on" : ""}`}
                        onClick={() => setPower("no")}>No — need a new one</button>
                    </div>
                    <p className="rb-calc__note">If &ldquo;No&rdquo;, we&rsquo;ll add electrical to install a new power point. Confirmed on site.</p>
                  </div>
                )}
              </div>

              <div className="rb-calc__result">
                <div className="rb-calc__result-row">
                  <span className="rb-calc__result-l">Estimated VEU rebate</span>
                  <span className="rb-calc__result-num">${rebate.toLocaleString()}</span>
                </div>
                <div className="rb-calc__result-row">
                  <span className="rb-calc__result-l">Est. fully installed price</span>
                  <span className="rb-calc__result-num rb-calc__result-num--net">${netPrice.toLocaleString()}<small> inc GST</small></span>
                </div>
                {powerAddOn > 0 && (
                  <p className="rb-calc__result-blurb">
                    Includes ~${powerAddOn.toLocaleString()} for a new power point (electrical + compliance).
                  </p>
                )}
                <p className="rb-calc__result-blurb">
                  <strong>{product.name}</strong> &mdash; rebate already applied in the price above. Final numbers confirmed after a free 20-minute site check.
                </p>
                <div className="rb-calc__cta">
                  <a href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Lock this rebate in →</a>
                  <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
                    Or call {site.phone}
                  </a>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Cooling path — brands but no fixed pricing (custom quote) */}
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
                  onClick={() => pickBrand(b.id)}
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
                Splits, multi-heads and ducted systems vary a lot with kW, zones and layout &mdash; we quote every cooling job individually after a quick site check so the price is honest.
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
