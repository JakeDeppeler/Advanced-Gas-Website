"use client";

import { useState } from "react";

/**
 * Tabbed content panel on the product detail page.
 *
 * Three panels: Specs · Features · Why we install. Switching tabs is
 * client-side (single useState) so the whole thing stays in one JS chunk
 * without a route change. Panels that would be empty are hidden from the
 * tab list rather than left as blank tabs.
 */

type Spec = { label: string; value: string };

type Props = {
  specs: Spec[];
  features: string[];
  whyWeInstall: string[];
  brandName: string;
  brandWarranty?: string;
};

type TabKey = "specs" | "features" | "why";

export function ProductTabs({ specs, features, whyWeInstall, brandName, brandWarranty }: Props) {
  const allTabs: { key: TabKey; label: string; count: number }[] = [
    { key: "specs",    label: "Full specs",       count: specs.length },
    { key: "features", label: "Features",         count: features.length },
    { key: "why",      label: "Why we install",   count: whyWeInstall.length },
  ];
  const tabs = allTabs.filter((t) => t.count > 0);

  const [active, setActive] = useState<TabKey>((tabs[0]?.key ?? "specs") as TabKey);

  return (
    <div className="ptabs">
      <div className="ptabs__nav" role="tablist" aria-label="Product information">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`ptab-${t.key}`}
            aria-selected={active === t.key}
            aria-controls={`ppanel-${t.key}`}
            className={`ptabs__tab${active === t.key ? " is-active" : ""}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
            <span className="ptabs__count">{t.count}</span>
          </button>
        ))}
      </div>

      {active === "specs" && (
        <div
          role="tabpanel"
          id="ppanel-specs"
          aria-labelledby="ptab-specs"
          className="ptabs__panel ptabs__panel--specs"
        >
          <dl className="ptabs__specs">
            {specs.map((s) => (
              <div key={s.label} className="ptabs__specrow">
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
          {brandWarranty && (
            <div className="ptabs__note">
              <div className="ptabs__note-lbl">{brandName} warranty</div>
              <p>{brandWarranty}</p>
            </div>
          )}
        </div>
      )}

      {active === "features" && (
        <div
          role="tabpanel"
          id="ppanel-features"
          aria-labelledby="ptab-features"
          className="ptabs__panel ptabs__panel--features"
        >
          <ul className="ptabs__list ptabs__list--features">
            {features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {active === "why" && (
        <div
          role="tabpanel"
          id="ppanel-why"
          aria-labelledby="ptab-why"
          className="ptabs__panel ptabs__panel--why"
        >
          <ul className="ptabs__list ptabs__list--why">
            {whyWeInstall.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
