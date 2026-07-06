"use client";

import { useMemo, useState } from "react";
import { site } from "@/lib/site";

/**
 * VEU rebate estimator — Advanced Gas & Aircon partner calculator.
 * Two paths:
 *   1) Heat pump hot water — brands: Thermann, Reclaim, Dux, iStore, Rinnai
 *   2) Cooling            — brands: Rinnai, Kaden, Mitsubishi Electric
 *
 * All figures are indicative estimates for the VEU rebate portion. The
 * final rebate is confirmed at the on-site check — this is a ballpark.
 */

type Category = "hp" | "ac";
type Prop = "own" | "rent";
type Conc = "no" | "yes";

type Product = {
  id: string;
  name: string;
  desc: string;
  rebate: number;   // approximate VEU rebate ($)
  price: number;    // approximate fully-installed sticker price before rebate ($)
};

const HP_BRANDS: { id: string; t: string; s: string; products: Product[] }[] = [
  {
    id: "reclaim",
    t: "Reclaim",
    s: "Australian made · R290 / CO₂",
    products: [
      { id: "reclaim-r290-200",  name: "Reclaim R290 all-in-one 200 L", desc: "1–2 person homes",    rebate: 2400, price: 5010 },
      { id: "reclaim-r290-300",  name: "Reclaim R290 all-in-one 300 L", desc: "3–4 person homes",    rebate: 2600, price: 5610 },
      { id: "reclaim-co2-250",   name: "Reclaim CO₂ split 250 L",       desc: "Premium, stainless",  rebate: 2800, price: 6530 },
      { id: "reclaim-co2-315",   name: "Reclaim CO₂ split 315 L",       desc: "4–5 person homes",    rebate: 3000, price: 7100 },
    ],
  },
  {
    id: "thermann",
    t: "Thermann",
    s: "Great value",
    products: [
      { id: "thermann-aio-200",  name: "Thermann all-in-one 200 L", desc: "1–2 person homes", rebate: 2200, price: 4380 },
      { id: "thermann-aio-285",  name: "Thermann all-in-one 285 L", desc: "3–4 person homes", rebate: 2400, price: 4860 },
      { id: "thermann-split-270",name: "Thermann split 270 L",      desc: "3–4 person homes", rebate: 2500, price: 5320 },
    ],
  },
  {
    id: "istore",
    t: "iStore",
    s: "Smart-app ready",
    products: [
      { id: "istore-aio-180", name: "iStore all-in-one 180 L", desc: "1–3 person homes", rebate: 2200, price: 4390 },
      { id: "istore-aio-275", name: "iStore all-in-one 275 L", desc: "3–5 person homes", rebate: 2400, price: 4890 },
    ],
  },
  {
    id: "dux",
    t: "Dux",
    s: "Australian designed",
    products: [
      { id: "dux-airoheat-250", name: "Dux Airoheat 250 L", desc: "3–4 person homes", rebate: 2300, price: 4680 },
      { id: "dux-airoheat-315", name: "Dux Airoheat 315 L", desc: "4–5 person homes", rebate: 2500, price: 5210 },
    ],
  },
  {
    id: "rinnai",
    t: "Rinnai",
    s: "Reliable, common parts",
    products: [
      { id: "rinnai-hp-250", name: "Rinnai heat pump 250 L", desc: "3–4 person homes", rebate: 2300, price: 4520 },
      { id: "rinnai-hp-315", name: "Rinnai heat pump 315 L", desc: "4–5 person homes", rebate: 2400, price: 4980 },
    ],
  },
];

const AC_BRANDS: { id: string; t: string; s: string; products: Product[] }[] = [
  {
    id: "mitsu",
    t: "Mitsubishi Electric",
    s: "Premium quiet inverter",
    products: [
      { id: "mitsu-25",     name: "Mitsubishi 2.5 kW split",    desc: "Bedroom / small room",       rebate:  900, price: 2100 },
      { id: "mitsu-35",     name: "Mitsubishi 3.5 kW split",    desc: "Small living / large bed",   rebate: 1200, price: 2450 },
      { id: "mitsu-50",     name: "Mitsubishi 5.0 kW split",    desc: "Standard living",            rebate: 1600, price: 2900 },
      { id: "mitsu-71",     name: "Mitsubishi 7.1 kW split",    desc: "Open-plan living",           rebate: 2000, price: 3450 },
      { id: "mitsu-ducted", name: "Mitsubishi 18 kW ducted",    desc: "Whole-home, up to 12 zones", rebate: 4800, price: 11000 },
    ],
  },
  {
    id: "kaden",
    t: "Kaden",
    s: "Great value, 5-yr warranty",
    products: [
      { id: "kaden-25", name: "Kaden 2.5 kW split", desc: "Bedroom / small room",     rebate:  800, price: 1780 },
      { id: "kaden-35", name: "Kaden 3.5 kW split", desc: "Small living / large bed", rebate: 1100, price: 2050 },
      { id: "kaden-50", name: "Kaden 5.0 kW split", desc: "Standard living",          rebate: 1500, price: 2380 },
      { id: "kaden-71", name: "Kaden 7.1 kW split", desc: "Open-plan living",         rebate: 1900, price: 2880 },
    ],
  },
  {
    id: "rinnai",
    t: "Rinnai",
    s: "Reliable, common parts",
    products: [
      { id: "rinnai-25", name: "Rinnai 2.5 kW split", desc: "Bedroom / small room",     rebate:  800, price: 1820 },
      { id: "rinnai-35", name: "Rinnai 3.5 kW split", desc: "Small living / large bed", rebate: 1100, price: 2120 },
      { id: "rinnai-50", name: "Rinnai 5.0 kW split", desc: "Standard living",          rebate: 1500, price: 2460 },
    ],
  },
];

export function RebateCalculator() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<Category>("hp");
  const [brandId, setBrandId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [prop, setProp] = useState<Prop>("own");
  const [conc, setConc] = useState<Conc>("no");

  const brands = category === "hp" ? HP_BRANDS : AC_BRANDS;
  const brand = brands.find((b) => b.id === brandId);
  const product = brand?.products.find((p) => p.id === productId);

  const { rebate, netPrice } = useMemo(() => {
    if (!product) return { rebate: 0, netPrice: 0 };
    let r = product.rebate;
    if (prop === "rent") r = Math.round(r * 0.92);
    if (conc === "yes") r += category === "hp" ? 200 : 400;
    const net = Math.max(0, product.price - r);
    return { rebate: r, netPrice: net };
  }, [product, prop, conc, category]);

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

      {/* Step 2 — brand */}
      {step >= 1 && (
        <div className="rb-calc__block">
          <span className="rb-calc__qlabel">2. Which brand?</span>
          <div className="rb-calc__grid rb-calc__grid--3">
            {brands.map((b) => (
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
      )}

      {/* Step 3 — product / size */}
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
                <button
                  type="button"
                  className={`rb-calc__pill ${prop === "own" ? "is-on" : ""}`}
                  onClick={() => setProp("own")}
                >
                  Owner-occupied
                </button>
                <button
                  type="button"
                  className={`rb-calc__pill ${prop === "rent" ? "is-on" : ""}`}
                  onClick={() => setProp("rent")}
                >
                  Rental
                </button>
              </div>
            </div>
            <div className="rb-calc__mod">
              <span className="rb-calc__qlabel">Concession card holder?</span>
              <div className="rb-calc__grid rb-calc__grid--2">
                <button
                  type="button"
                  className={`rb-calc__pill ${conc === "no" ? "is-on" : ""}`}
                  onClick={() => setConc("no")}
                >
                  No
                </button>
                <button
                  type="button"
                  className={`rb-calc__pill ${conc === "yes" ? "is-on" : ""}`}
                  onClick={() => setConc("yes")}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>

          <div className="rb-calc__result">
            <div className="rb-calc__result-row">
              <span className="rb-calc__result-l">Estimated VEU rebate</span>
              <span className="rb-calc__result-num">${rebate.toLocaleString()}</span>
            </div>
            <div className="rb-calc__result-row">
              <span className="rb-calc__result-l">Est. price after rebate</span>
              <span className="rb-calc__result-num rb-calc__result-num--net">${netPrice.toLocaleString()}<small> inc GST</small></span>
            </div>
            <p className="rb-calc__result-blurb">
              <strong>{product.name}</strong> — final rebate is confirmed after a free 20-minute site check. Prices include GST, VEU paperwork and workmanship warranty.
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
    </div>
  );
}
