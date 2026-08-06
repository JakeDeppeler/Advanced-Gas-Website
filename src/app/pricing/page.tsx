import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { brands } from "@/lib/brands";
import { breadcrumbSchema } from "@/lib/schema";
import "../detail.css";
import "../brands/[brand]/brand.css";
import "./pricing.css";

export const metadata: Metadata = {
  title: "Price List — Every System We Install, Fully Installed | Advanced Gas & Aircon",
  description:
    "Every product we install with the fully-installed price after VEU rebate where eligible. Mitsubishi Electric splits, Reclaim heat pumps, Thermann, iStore, Kaden ducted and Zonemate zoning. No hidden fees.",
  alternates: { canonical: "/pricing" },
};

// Category → readable label + emoji-free icon reference for the page nav.
const CATEGORY_ORDER: { key: string; label: string; desc: string }[] = [
  { key: "heat-pump", label: "Heat pump hot water", desc: "R290 & CO₂ systems, VEU rebate applied" },
  { key: "split-system", label: "Split system aircon", desc: "Wall-mounted single-room units" },
  { key: "multi-head", label: "Multi-head aircon", desc: "One outdoor unit, multiple indoor heads" },
  { key: "ducted", label: "Ducted aircon", desc: "Whole-home cooling + heating" },
  { key: "cassette", label: "Cassette aircon", desc: "Commercial ceiling-mounted 4-way" },
  { key: "floor-console", label: "Floor console", desc: "Under-window installs" },
  { key: "gas-continuous-flow", label: "Gas continuous flow", desc: "Rinnai / Thermann continuous flow" },
  { key: "gas-storage", label: "Gas storage hot water", desc: "Like-for-like storage replacement" },
  { key: "electric-storage", label: "Electric storage hot water", desc: "Emergency replacement only" },
  { key: "solar-hot-water", label: "Solar hot water", desc: "Close-couple & split systems" },
  { key: "zoning", label: "Zoning controllers", desc: "Room-by-room ducted control" },
  { key: "damper", label: "Zoning dampers", desc: "Per-zone airflow control" },
  { key: "controller", label: "Wall & Wi-Fi controllers", desc: "Physical + app control add-ons" },
  { key: "accessory", label: "Accessories & upgrades", desc: "PV diverters, spare parts" },
];

export default function PricingPage() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Pricing", url: `${site.url}/pricing` },
  ]);

  // Flatten every SKU across every brand, keyed by category, so we render one
  // section per category with all brands mixed together (buyers usually pick
  // "heat pump ~270L" first, then compare brands).
  type Row = {
    brand: string;
    brandSlug: string;
    productSlug: string;
    name: string;
    model: string;
    capacity?: string;
    veu: boolean;
    price?: string;
    bestFor: string;
  };
  const rows: Record<string, Row[]> = {};
  for (const b of brands) {
    for (const p of b.products) {
      const arr = rows[p.category] ||= [];
      arr.push({
        brand: b.name,
        brandSlug: b.slug,
        productSlug: p.slug,
        name: p.name,
        model: p.model,
        capacity: p.capacity,
        veu: p.veuEligible,
        price: p.installedPriceFrom,
        bestFor: p.bestFor,
      });
    }
  }

  return (
    <div className="page-detail page-pricing">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <span className="cur">Pricing</span>
          </nav>
          <div className="dp-hero__eyebrow">
            <span className="ds-dot" /> Fully-installed price list
          </div>
          <h1>
            Every system we install — <span className="accent">real installed prices</span>.
          </h1>
          <p className="dp-hero__sub">
            Fully-installed prices for every SKU we install across Melbourne&rsquo;s south-east.
            All prices include labour, standard install, disposal of the old unit, compliance
            certificate, and the VEU rebate applied where the unit qualifies. No hidden
            extras — the number below is the number on your quote, and the number on the
            invoice.
          </p>
          <div className="dp-hero__ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a fixed quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
              Or call {site.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Fine print strip */}
      <section className="pricing-note">
        <div className="wrap">
          <div className="pricing-note__grid">
            <div>
              <div className="pricing-note__lbl">What&rsquo;s included in every price</div>
              <p>Unit + labour + standard install (up to 3 m line-set) + disposal of the old system + compliance certificate + registration for manufacturer warranty. GST inclusive.</p>
            </div>
            <div>
              <div className="pricing-note__lbl">What might add cost</div>
              <p>Extended pipe runs (&gt;5 m: +$300), first-floor roof access (+$500), salt-tolerant coating for coastal edge (+$200), backhoe / trenching for LPG bottle relocation (+$400).</p>
            </div>
            <div>
              <div className="pricing-note__lbl">VEU rebate</div>
              <p>Applied at quote — you don&rsquo;t pay it up-front then chase it back. Additional Solar Homes bonus (+$1,000) available for eligible owner-occupier households.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category tabs / anchor nav */}
      <section className="pricing-catnav">
        <div className="wrap">
          <div className="pricing-catnav__scroll" role="tablist" aria-label="Product categories">
            {CATEGORY_ORDER
              .filter((c) => (rows[c.key] ?? []).length > 0)
              .map((c) => (
                <a key={c.key} href={`#${c.key}`} className="pricing-catnav__chip">
                  {c.label}
                  <span>{(rows[c.key] ?? []).length}</span>
                </a>
              ))}
          </div>
        </div>
      </section>

      {/* One table per category */}
      <section className="pricing-body">
        <div className="wrap">
          {CATEGORY_ORDER
            .filter((c) => (rows[c.key] ?? []).length > 0)
            .map((c) => {
              const list = rows[c.key];
              return (
                <div key={c.key} id={c.key} className="pricing-block">
                  <div className="pricing-block__head">
                    <div>
                      <h2>{c.label}</h2>
                      <p>{c.desc}</p>
                    </div>
                    <span className="pricing-block__count">{list.length} SKUs</span>
                  </div>

                  <div className="pricing-block__tablewrap">
                    <table className="pricing-block__table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Model</th>
                          <th>Capacity</th>
                          <th>Best for</th>
                          <th>VEU</th>
                          <th className="pricing-block__pricecell">Installed from</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r) => (
                          <tr key={`${r.brandSlug}-${r.productSlug}`}>
                            <td>
                              <div className="pricing-block__brand">{r.brand}</div>
                              <div className="pricing-block__name">{r.name.replace(r.brand, "").trim() || r.name}</div>
                            </td>
                            <td><code>{r.model}</code></td>
                            <td>{r.capacity ?? "—"}</td>
                            <td className="pricing-block__bestfor">{r.bestFor}</td>
                            <td>{r.veu ? <span className="pricing-block__pill">VEU eligible</span> : <span className="pricing-block__pill pricing-block__pill--muted">—</span>}</td>
                            <td className="pricing-block__pricecell">
                              {r.price ? <strong>{r.price}</strong> : <span className="pricing-block__poa">POA</span>}
                            </td>
                            <td className="pricing-block__linkcell">
                              <Link href={`/brands/${r.brandSlug}/${r.productSlug}`}>Details →</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* Service call-out pricing */}
      <section className="pricing-body pricing-body--extras">
        <div className="wrap">
          <div className="pricing-block" id="service">
            <div className="pricing-block__head">
              <div>
                <h2>Service, repair &amp; call-out fees</h2>
                <p>Standard rates for planned service and emergency call-outs.</p>
              </div>
              <span className="pricing-block__count">7 items</span>
            </div>
            <div className="pricing-block__tablewrap">
              <table className="pricing-block__table">
                <thead>
                  <tr><th>Service</th><th>What&rsquo;s included</th><th className="pricing-block__pricecell">Price</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Split system service</strong></td>
                    <td>Coil clean, gas pressure check, filter clean, drain flush, thermistor calibration. Per unit.</td>
                    <td className="pricing-block__pricecell"><strong>$220</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Multi-unit bundle service</strong></td>
                    <td>Same as above for 3+ splits at the same address, per additional unit.</td>
                    <td className="pricing-block__pricecell"><strong>$140</strong> ea</td>
                  </tr>
                  <tr>
                    <td><strong>Ducted aircon service</strong></td>
                    <td>Return-air clean, coil clean, filter replacement, gas check, zone controller test.</td>
                    <td className="pricing-block__pricecell"><strong>$390</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Gas ducted heater service + CO test</strong></td>
                    <td>Burner clean, heat-exchanger inspection, CO analyser test, filter, gas pressure. Legally required every 2 years.</td>
                    <td className="pricing-block__pricecell"><strong>$220</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Heat pump hot water service</strong></td>
                    <td>Anode inspection (vitreous tanks), sacrificial anode swap if required, temperature calibration, filter clean.</td>
                    <td className="pricing-block__pricecell"><strong>$240</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Standard call-out (business hours)</strong></td>
                    <td>Attend site, diagnose fault, quote repair. Waived if you accept the repair on the day.</td>
                    <td className="pricing-block__pricecell"><strong>$120</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Emergency call-out (after hours, weekends)</strong></td>
                    <td>Same-day attendance for gas leaks, no-hot-water, CO alarms. On-call tradie, not overseas call centre.</td>
                    <td className="pricing-block__pricecell"><strong>$220</strong> + parts</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Want the exact price for your house?</h2>
            <p>60-second form, fixed quote back within 2 business hours. VEU rebate already applied.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Get my fixed quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>

      <Script id="ld-crumbs-pricing" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
    </div>
  );
}
