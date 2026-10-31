"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { site } from "@/lib/site";
import { SHOW_FINANCE } from "@/lib/homepage/data";
import { AgLogo, PhoneIcon } from "./HomeHeader";

const COLS: { head: string; links: [string, string][]; more: [string, string] }[] = [
  { head: "Services", links: [["Aircon installation", "/services/air-conditioning-installation"], ["Heat pump installation", "/services/heat-pump-installation"], ["Aircon service & repairs", "/services/aircon-servicing-repairs"], ["Gas & plumbing", "/services/gas-plumbing"], ["Commercial & strata", "/commercial"], ["24/7 emergency", "/contact#emergency"], ["Full price list", "/pricing"]], more: ["Our full range", "/range"] },
  { head: "Service areas", links: [["Pakenham", "/areas/pakenham"], ["Officer", "/areas/officer"], ["Beaconsfield", "/areas/beaconsfield"], ["Berwick", "/areas/berwick"], ["Narre Warren", "/areas/narre-warren"], ["Cranbourne", "/areas/cranbourne"], ["Clyde North", "/areas/clyde-north"], ["Drouin", "/areas/drouin"]], more: ["All areas within 75 km →", "/service-areas"] },
  { head: "Brands & guides", links: [["All brands we install", "/brands"], ["Mitsubishi Electric", "/brands/mitsubishi-electric"], ["Reclaim CO₂ heat pumps", "/brands/reclaim"], ["Thermann range", "/brands/thermann"], ["VEU rebate explained", "/rebates"], ["Heat pump vs gas", "/heat-pumps"], ["Repair or replace?", "/upgrade-or-repair"], ["Water filtration", "/water-filtration"]], more: ["Blog & guides", "/blog"] },
  { head: "Tools", links: [["VEU rebate calculator", "/tools/veu-rebate-estimator"], ["Aircon sizing calculator", "/tools/sizing-calculator"], ["Running cost calculator", "/tools/running-cost-calculator"], ["Hot water savings", "/tools/hot-water-savings"], ["Gas vs reverse-cycle", "/tools/heating-comparator"], ["Heat pump compare", "/tools/heat-pump-compare"], ["Fault code lookup", "/tools/fault-codes"]], more: ["All tools →", "/tools"] },
  { head: "Company", links: [["About the team", "/about"], ["Install gallery", "/gallery"], ["Reviews", "/reviews"], ["All service areas", "/service-areas"], ["Contact", "/contact"], ["Team portal", "/portal"]], more: ["Get a quote →", "/quote"] },
];

export function HomeFooter() {
  const onHome = usePathname() === "/";
  const quoteHref = onHome ? "#quote" : "/#quote";
  return (
    <footer id="footer" className="hft">
      <div className="hft__strip">
        <div className="wrap">
          <span><span className="fping" aria-hidden="true" />Gas leak, no hot water or no heat? We pick up 24/7.</span>
          <a href="tel:+61359478000" className="abtn abtn--white abtn--sm" data-call-from="footer-strip">Call (03) 5947 8000</a>
        </div>
      </div>

      <div className="wrap hft__main">
        <div className="hft__top">
          <div className="hft__brand">
            <Link href="/" className="hft__logo" aria-label="Advanced Gas & Aircon home"><AgLogo size="ft" /></Link>
            <p>Heating, cooling, gas and hot water across Melbourne&apos;s south-east and Gippsland. Directly employed crews. Prices in writing. One standard, every job.</p>
            <div className="hft__soc" aria-label="Find us online">
              {site.social.facebook && (
                <a className="fsoc" href={site.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8z" /></svg>
                </a>
              )}
              <a className="fsoc" href={site.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" /></svg>
              </a>
              <Link className="fsoc" href="/reviews" aria-label="Google reviews">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zM6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9.1L6.4 14zM12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" /></svg>
              </Link>
            </div>
          </div>

          <div className="hft__contact">
            <span className="fhead" style={{ marginBottom: 0 }}>Get in touch</span>
            <div>
              <Link href="/contact" className="addr">
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF7A36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                1 Sierra Circuit, Pakenham VIC 3810
              </Link>
              <a href="tel:+61359478000" data-call-from="footer"><PhoneIcon size={15} color="#FF7A36" />(03) 5947 8000</a>
              <a href={`mailto:${site.email}`}>
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF7A36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7 12 13 2 7" /></svg>
                {site.email}
              </a>
            </div>
            <span className="hft__small">Quotes back within 12 business hours.</span>
          </div>

          <Newsletter />
        </div>

        <nav aria-label="Site links" className="hft__cols">
          {COLS.map((c) => (
            <div key={c.head} className="fcol">
              <span className="fhead">{c.head}</span>
              {c.links.map(([t, h]) => <Link key={h} className="flink" href={h}>{t}</Link>)}
              <Link className="flink flink--b" href={c.more[1]}>{c.more[0]}</Link>
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="fhead" style={{ marginBottom: 12 }}>Opening hours</span>
            <span className="fhours"><span>Mon–Fri</span><span>7am–3:30pm</span></span>
            <span className="fhours"><span>Weekends</span><span>Emergencies</span></span>
            <span className="fhours"><span>Holidays</span><span>Emergencies</span></span>
            <span className="fhours fhours--last"><span>After hours</span><span>24/7 call-out</span></span>
            <Link href={quoteHref} className="abtn abtn--or abtn--sm abtn--flat" style={{ marginTop: 14, alignSelf: "flex-start" }}>Get a free quote</Link>
          </div>
        </nav>

        <p className="hft__lic">
          VEU accredited · Plumbing Lic. 46828 · ARC AU59557 · $20M public liability{SHOW_FINANCE ? " · Finance with Brighte" : ""} · Trade partner of Reece
        </p>

        <div className="hft__legal">
          <span>© {new Date().getFullYear()} Advanced Gas &amp; Airconditioning Services Pty Ltd · ABN {site.abn} · ACN {site.acn}</span>
          <nav aria-label="Legal">
            <Link className="flink" href="/privacy">Privacy</Link>
            <Link className="flink" href="/terms">Terms</Link>
            <a className="flink" href="/sitemap.xml">Sitemap</a>
            <Link className="flink" href="/contact">Complaints &amp; feedback</Link>
            <a href="#top" className="hft__top-link">Back to top ↑</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

/** Seasonal reminders sign-up. Says so if it fails, rather than thanking someone for a signup that never arrived. */
function Newsletter() {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "failed">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, hp }) });
      setState(res.ok ? "done" : "failed");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="hft__news">
      <h3>Seasonal service reminders</h3>
      <p>Rebate news, honest maintenance tips, first-in-line pricing. One email a season. Zero spam.</p>
      {state === "done" ? (
        <div role="status" className="hft__ok pop"><span aria-hidden="true">✓</span>You&apos;re on the list. See you next season.</div>
      ) : (
        <form onSubmit={submit}>
          <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1 }} />
          <label htmlFor="ft-email" className="asr">Email address</label>
          <input id="ft-email" type="email" required autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="abtn abtn--or" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Subscribe"}</button>
        </form>
      )}
      {state === "failed" && <small role="alert" style={{ color: "#FFB4A0" }}>That didn&apos;t go through. Try again in a moment.</small>}
      <small>By subscribing you agree to our <Link href="/privacy">privacy notice</Link>. Unsubscribe any time.</small>
    </div>
  );
}
