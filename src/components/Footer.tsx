import Link from "next/link";
import { site, services, publishedSuburbs } from "@/lib/site";
import { NewsletterForm } from "@/components/NewsletterForm";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="ftr">
      <div className="wrap">

        {/* ============ Brand + newsletter row ============ */}
        <div className="ftr__top">
          <div className="ftr__brand">
            <Link href="/" className="ftr__signature" aria-label={`${site.name} home`}>
              {/* Real designed logo asset — the webp has a white background
                  so we sit it inside a padded white plate so it reads
                  cleanly against the footer's navy. */}
              <span className="ftr__logo-plate">
                <img
                  src="/advanced-gas-logo.webp"
                  alt={`${site.name} logo`}
                  width="240"
                  height="120"
                />
              </span>
            </Link>
            <p className="ftr__tag">
              Family-run gas, hot water &amp; aircon specialists across South-East Vic and Gippsland.
              Locally owned. Same-day quotes. Fixed prices. No surprises.
            </p>

            <ul className="ftr__nap">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>
                  {site.address.street}, {site.address.suburb} {site.address.state} {site.address.postcode}
                </span>
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/></svg>
                <a href={`tel:${site.phoneE164}`}>{site.phone}</a>
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7 12 13 2 7"/></svg>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <span>Mon–Fri 8am–4pm · 24/7 emergency call-out</span>
              </li>
            </ul>

            <div className="ftr__social" aria-label="Social">
              <a href="https://www.facebook.com/" aria-label="Facebook" className="ftr__social-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.7c0-.9.2-1.5 1.6-1.5h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3V14h2.8v8h3.4z"/></svg>
              </a>
              <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="ftr__social-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
              </a>
              <a href="https://www.google.com/maps" aria-label="Google Reviews" className="ftr__social-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 14.5 8.6 21.5 9.2 16.2 13.8 17.9 20.6 12 16.9 6.1 20.6 7.8 13.8 2.5 9.2 9.5 8.6z"/></svg>
              </a>
            </div>
          </div>

          <aside className="ftr__news">
            <h4>Seasonal service reminders</h4>
            <p>
              Straight to your inbox. Rebate news, honest maintenance tips,
              first-in-line pricing. One email a season. Zero spam.
            </p>
            <NewsletterForm />
            <small>By subscribing you agree to our privacy notice. Unsubscribe any time.</small>
          </aside>
        </div>

        {/* ============ Link columns ============ */}
        <nav className="ftr__cols" aria-label="Site links">
          <div className="ftr__col">
            <h4>Services</h4>
            <ul>
              {services.map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`}>{s.short}</Link>
                </li>
              ))}
              <li><Link href="/services#commercial">Commercial &amp; strata</Link></li>
              <li><Link href="/contact#emergency">24/7 emergency</Link></li>
              <li><Link href="/pricing"><strong>Full price list</strong></Link></li>
            </ul>
          </div>

          <div className="ftr__col">
            <h4>Brands &amp; guides</h4>
            <ul>
              <li><Link href="/brands">All brands we install</Link></li>
              <li><Link href="/brands/mitsubishi-electric">Mitsubishi Electric</Link></li>
              <li><Link href="/brands/reclaim">Reclaim CO₂ heat pumps</Link></li>
              <li><Link href="/brands/thermann">Thermann range</Link></li>
              <li><Link href="/rebates">VEU rebate explained</Link></li>
              <li><Link href="/heat-pumps">Heat pump vs gas</Link></li>
              <li><Link href="/tools/veu-rebate-estimator">VEU rebate estimator</Link></li>
              <li><Link href="/tools/sizing-calculator">Aircon sizing calculator</Link></li>
              <li><Link href="/tools/running-cost-calculator">Running cost calculator</Link></li>
              <li><Link href="/tools/hot-water-savings">Hot water savings calculator</Link></li>
              <li><Link href="/tools/heating-comparator">Gas vs reverse-cycle</Link></li>
              <li><Link href="/tools/heat-pump-compare">Heat pump compare</Link></li>
              <li><Link href="/tools/system-comparison">System comparison</Link></li>
              <li><Link href="/tools/fault-codes">Fault code lookup</Link></li>
              <li><Link href="/blog">Blog &amp; guides</Link></li>
            </ul>
          </div>

          <div className="ftr__col">
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About the team</Link></li>
              <li><Link href="/gallery">Install gallery</Link></li>
              <li><Link href="/reviews">Reviews</Link></li>
              <li><Link href="/service-areas">All service areas</Link></li>
              <li><Link href="/press-kit">Press kit &amp; media</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/quote">Get a fixed quote</Link></li>
              <li><a href={`tel:${site.phoneE164}`}>Call {site.phone}</a></li>
            </ul>
          </div>

          <div className="ftr__col">
            <h4>Compliance</h4>
            <ul className="ftr__creds">
              <li>
                <span className="ftr__cred-lbl">Plumbing</span>
                <span className="ftr__cred-val">Lic. 46828</span>
              </li>
              <li>
                <span className="ftr__cred-lbl">Refrigeration</span>
                <span className="ftr__cred-val">ARC AU59557</span>
              </li>
              <li>
                <span className="ftr__cred-lbl">ABN</span>
                <span className="ftr__cred-val">{site.abn}</span>
              </li>
              <li>
                <span className="ftr__cred-lbl">ACN</span>
                <span className="ftr__cred-val">{site.acn}</span>
              </li>
              <li>
                <span className="ftr__cred-lbl">Insurance</span>
                <span className="ftr__cred-val">$20M public liability</span>
              </li>
            </ul>
          </div>
        </nav>

        {/* ============ Trust badges strip ============ */}
        <ul className="ftr__badges" aria-label="Accreditations">
          <li>
            <span className="ftr__badge-tag">Accredited</span>
            <span className="ftr__badge-name">VEU Provider</span>
          </li>
          <li>
            <span className="ftr__badge-tag">Authorised</span>
            <span className="ftr__badge-name">ARC Refrigeration</span>
          </li>
          <li>
            <span className="ftr__badge-tag">Licensed</span>
            <span className="ftr__badge-name">Victorian Plumber</span>
          </li>
          <li>
            <span className="ftr__badge-tag">Partner</span>
            <span className="ftr__badge-name">Reece Trade</span>
          </li>
          <li>
            <span className="ftr__badge-tag">Rated</span>
            <span className="ftr__badge-name">4.9★ · 380+ reviews</span>
          </li>
          <li>
            <span className="ftr__badge-tag">Insured</span>
            <span className="ftr__badge-name">$20M Public Liability</span>
          </li>
        </ul>

        {/* ============ Service areas chips ============ */}
        <div className="ftr__areas">
          <h4>Servicing across South-East Vic &amp; Gippsland</h4>
          <ul className="ftr__chips">
            {publishedSuburbs.map((s) => (
              <li key={s.slug}>
                <Link href={`/areas/${s.slug}`}>{s.name}</Link>
              </li>
            ))}
            <li className="ftr__chips-more">
              <Link href="/service-areas">+ every suburb within 75km →</Link>
            </li>
          </ul>
        </div>

        {/* ============ Bottom bar ============ */}
        <div className="ftr__bottom">
          <span className="ftr__copy">
            © {year} {site.legalName}. All rights reserved.
          </span>
          <nav className="ftr__legal" aria-label="Legal">
            <Link href="/privacy">Privacy</Link>
            <span className="ftr__legal-sep" aria-hidden>·</span>
            <Link href="/terms">Terms</Link>
            <span className="ftr__legal-sep" aria-hidden>·</span>
            <Link href="/sitemap.xml">Sitemap</Link>
            <span className="ftr__legal-sep" aria-hidden>·</span>
            <Link href="/contact">Complaints &amp; feedback</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
