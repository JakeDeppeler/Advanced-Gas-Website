import Link from "next/link";
import { site, openingHoursShort } from "@/lib/site";
import "./not-found.css";

/** The six routes a wrong URL is nearly always aiming at. Ordered the way
 *  somebody who has just hit a dead end reads: what you do, what it costs,
 *  do you come here, then the two ways to get hold of us. */
const GO = [
  { href: "/services", label: "Everything we do", sub: "Aircon, heat pumps, gas and hot water" },
  { href: "/range", label: "The full range", sub: "Every model we fit, with installed prices" },
  { href: "/pricing", label: "What it costs", sub: "Installed prices and the VEU rebate applied" },
  { href: "/service-areas", label: "Do you come to me?", sub: "Every suburb, with drive times from Pakenham" },
  { href: "/quote", label: "Get a price", sub: "A written quote back inside 12 business hours" },
  { href: "/blog", label: "Guides and advice", sub: "Rebates, sizing and running costs, explained" },
];

export default function NotFound() {
  return (
    <>
      <section className="nf">
        <div className="wrap">
          <div className="nf__head">
            <p className="nf__num">404</p>
            <p className="nf__lead">This page isn&rsquo;t here any more, or it never was.</p>
            <p className="nf__sub">
              Most likely an old link, a typo in the address, or a page we&rsquo;ve since renamed. Everything
              below still works. If you&rsquo;re mid-problem, the quickest route is the phone.
            </p>
            <div className="nf__calls">
              <a className="ds-btn ds-btn--primary ds-btn--lg" href={`tel:${site.phoneE164}`}>
                Call {site.phone}
              </a>
              <Link className="ds-btn ds-btn--ghost ds-btn--lg" href="/quote">Get a free quote</Link>
            </div>
            <p className="nf__sub" style={{ marginTop: 14 }}>
              Mon&ndash;Fri {openingHoursShort()}. Gas leak, no hot water or a CO alarm after hours?{" "}
              <Link href="/contact#emergency" style={{ color: "var(--orange-ink)", fontWeight: 700 }}>
                We answer the emergency line
              </Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="nf__go">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" />Try one of these</span>
            <h2>Where you were probably headed</h2>
          </div>
          <ul className="nf__golist">
            {GO.map((g) => (
              <li key={g.href}>
                <Link href={g.href}>
                  <strong>{g.label}</strong>
                  <span>{g.sub}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
