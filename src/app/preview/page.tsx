import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import "./preview.css";

export const metadata: Metadata = {
  title: "Preview — phone-first home page mock",
  description: "Live preview of the phone-first home page redesign. Not indexed.",
  robots: { index: false, follow: false },
};

const REVIEWS = [
  { title: "Quoted Mon, installed Fri", txt: "Bloke on the phone is the bloke on the tools. Rebate handled, paid less than $400.", who: "Jess M.", suburb: "Pakenham", a: "JM" },
  { title: "Actually got up in the roof", txt: "Only ones who crawled in. Middle price, cleanest install of the three.", who: "Dean R.", suburb: "Officer", a: "DR" },
  { title: "Sunday emergency sorted", txt: "Hot water died with three kids. Loaner running by lunch, iStore Tuesday.", who: "Sam K.", suburb: "Berwick", a: "SK" },
  { title: "No surprises on the invoice", txt: "Quote number matched the invoice exactly. No 'we hit unexpected wiring' story. Nice change.", who: "Priya S.", suburb: "Cranbourne", a: "PS" },
  { title: "Family business, feels it", txt: "Answered myself, quoted myself, showed up myself. That trail of trust doesn't exist anymore.", who: "Tom H.", suburb: "Narre Warren", a: "TH" },
];

const BRANDS = [
  ["RECLAIM", "Heat pumps"],
  ["iStore", "Heat pumps"],
  ["Thermann", "Hot water"],
  ["Mitsubishi", "Aircon"],
  ["Kaden", "Aircon"],
  ["Milieu Lab", "Controls"],
  ["Rinnai", "Gas & hw"],
];

const FAQS = [
  { q: "How much is the VEU rebate, really?", a: "It depends on your existing hot water unit and the new one going in. Most Pakenham households see between $2,400 and $3,200 off. We apply it at the quote stage so you don't pay it then claim it back." },
  { q: "Am I eligible if I'm a renter or in a unit?", a: "Owner-occupiers and landlords are both eligible under VEU. Renters can ask their landlord to upgrade — we'll talk to them directly if easier." },
  { q: "How long does an install take?", a: "A like-for-like heat pump swap is usually one day. A new split is half a day. Full ducted retrofit is 2–3 days. We give a firm window when you accept the quote." },
  { q: "What brands do you install, and why those?", a: "Reclaim (premium heat pumps), iStore (best mid-range), Thermann (budget-friendly), Mitsubishi Electric and Kaden for aircon, Rinnai / Brivis / Braemar for gas. We recommend, not upsell." },
  { q: "Do you do emergencies on weekends?", a: "Yes. Gas leak, no hot water, smoking flue — call the main number any time. After hours goes to a real on-call tradie, not an overseas call centre." },
];

const SUBURBS = [
  "Pakenham", "Officer", "Beaconsfield", "Berwick", "Narre Warren", "Cranbourne",
  "Clyde", "Clyde North", "Hampton Park", "Hallam", "Endeavour Hills", "Dandenong",
  "Keysborough", "Lynbrook", "Bunyip", "Garfield", "Drouin", "Warragul", "Emerald",
];

export default function PreviewPage() {
  return (
    <div className="page-preview">
      {/* Preview ribbon — makes it obvious this isn't the live home page */}
      <div className="pv-ribbon">
        <span className="pv-ribbon__dot" />
        <span><strong>Preview mock</strong> — not the live home page. Iterate here, then promote.</span>
        <Link href="/" className="pv-ribbon__link">Real home →</Link>
      </div>

      <div className="pv-stack">

        {/* HERO card */}
        <div className="pv-hero">
          <div className="pv-hero__bg" aria-hidden="true" />
          <div className="pv-hero__scrim" aria-hidden="true" />
          <div className="pv-hero__wrap">
            <span className="pv-hero__badge">
              <span className="pv-hero__badge-dot" />
              Pakenham locals since 2014
            </span>
            <h1 className="pv-hero__h1">The team you&rsquo;d want in your house.</h1>
            <p className="pv-hero__sub">
              Family owned. Same face on the quote as on the tools. Twelve years, 1,200+ installs.
            </p>
            <div className="pv-hero__ctas">
              <a href="#quote" className="pv-btn pv-btn--orange">Get a fixed quote →</a>
              <a href={`tel:${site.phoneE164}`} className="pv-btn pv-btn--ghost">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
                </svg>
                Call {site.phone}
              </a>
            </div>
          </div>
        </div>

        {/* TRUST card */}
        <div className="pv-trust">
          <span className="pv-trust__stars">★★★★★</span>
          <div className="pv-trust__col">
            <strong>4.9 / 5</strong>
            <span>Google reviews</span>
          </div>
          <div className="pv-trust__divider" />
          <div className="pv-trust__col">
            <strong>1,200+</strong>
            <span>installs done</span>
          </div>
        </div>

        {/* BRANDS card */}
        <div className="pv-card">
          <div className="pv-eye"><span className="pv-eye__dot" /> Authorised installer of</div>
          <div className="pv-brand-rail">
            {BRANDS.map(([name, kind]) => (
              <div key={name} className="pv-brand-chip">
                <strong>{name}</strong>
                <span>{kind}</span>
              </div>
            ))}
          </div>
        </div>

        {/* QUOTE card */}
        <div className="pv-card" id="quote">
          <div className="pv-eye"><span className="pv-eye__dot" /> 60-second quote</div>
          <h2 className="pv-h">Fixed price back within 12&nbsp;hrs.</h2>
          <p className="pv-lede">Tell us what you need, we&rsquo;ll price it straight. Rebates already applied, no chasing.</p>

          <div className="pv-qcard">
            <div className="pv-qcard__ribbon">
              <span className="pv-qcard__dot" />
              Usually replied within 12 hrs
            </div>
            <div className="pv-qcard__h">What do you need?</div>
            <p className="pv-qcard__sub">Tick every option, we&rsquo;ll quote the lot.</p>
            <div className="pv-qcard__progress" aria-hidden="true">
              <i className="is-on" /><i /><i /><i /><i /><i />
            </div>
            <div className="pv-qcard__step">Step 1 of 6</div>
            <div className="pv-qcard__step-h">Pick a service</div>
            <div className="pv-qcard__grid">
              <button type="button" className="pv-qopt is-on">
                <strong>Heat pump</strong>
                <em>Hot water</em>
              </button>
              <button type="button" className="pv-qopt">
                <strong>Split system</strong>
                <em>Room aircon</em>
              </button>
              <button type="button" className="pv-qopt">
                <strong>Ducted</strong>
                <em>Whole home</em>
              </button>
              <button type="button" className="pv-qopt">
                <strong>Service</strong>
                <em>$280 + GST</em>
              </button>
            </div>
            <Link href="/quote" className="pv-qcard__next">Next → the specifics</Link>
          </div>
        </div>

        {/* REVIEWS card */}
        <div className="pv-card">
          <div className="pv-eye"><span className="pv-eye__dot" /> What locals say</div>
          <h2 className="pv-h">Reviews from real households.</h2>
          <div className="pv-rev-rating">
            <span className="pv-rev-rating__stars">★★★★★</span>
            <strong>4.9 / 5</strong>
            <span>· 4.9 on Google</span>
          </div>
          <div className="pv-rev-rail">
            {REVIEWS.map((r, i) => (
              <article key={i} className="pv-rev-card">
                <div className="pv-rev-card__stars">★★★★★</div>
                <h3 className="pv-rev-card__t">{r.title}</h3>
                <p className="pv-rev-card__txt">&ldquo;{r.txt}&rdquo;</p>
                <div className="pv-rev-card__by">
                  <span className="pv-rev-card__avatar">{r.a}</span>
                  <div>
                    <strong>{r.who}</strong>
                    <span>{r.suburb}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* FIXED PRICE card */}
        <div className="pv-card">
          <div className="pv-eye pv-eye--orange"><span className="pv-eye__dot" /> Fixed-price installs</div>
          <h2 className="pv-h">Three popular jobs, locked-in.</h2>
          <p className="pv-lede">VEU rebate applied, GST included, warranty pack in 24&nbsp;hrs.</p>
          <div className="pv-fp">
            <article className="pv-fp-item">
              <div className="pv-fp-thumb" style={{ backgroundImage: "url('/thermann-heat-pump.webp')" }} />
              <div className="pv-fp-body">
                <div className="pv-fp-eye">All-in-one · Best value</div>
                <h3 className="pv-fp-t">Reclaim R290, fully installed</h3>
                <div className="pv-fp-price">
                  <span className="pv-fp-num">$2,610</span>
                  <span className="pv-fp-lbl">inc GST</span>
                </div>
              </div>
            </article>
            <article className="pv-fp-item pv-fp-item--feature">
              <span className="pv-fp-flag">Highest quality</span>
              <div className="pv-fp-thumb" style={{ backgroundImage: "url('/reclaim-split-back.webp')" }} />
              <div className="pv-fp-body">
                <div className="pv-fp-eye">Split · AUS-made</div>
                <h3 className="pv-fp-t">Reclaim CO₂ split, fully installed</h3>
                <div className="pv-fp-price">
                  <span className="pv-fp-num">$5,340</span>
                  <span className="pv-fp-lbl">from · inc GST</span>
                </div>
              </div>
            </article>
            <article className="pv-fp-item">
              <div className="pv-fp-thumb" style={{ backgroundImage: "url('/ducted-condenser.webp')" }} />
              <div className="pv-fp-body">
                <div className="pv-fp-eye">Ducted · Whole home</div>
                <h3 className="pv-fp-t">18&nbsp;kW Mitsubishi ducted</h3>
                <div className="pv-fp-price">
                  <span className="pv-fp-num">$11,000</span>
                  <span className="pv-fp-lbl">from · inc GST</span>
                </div>
              </div>
            </article>
          </div>
        </div>

        {/* SERVICES card */}
        <div className="pv-card">
          <div className="pv-eye"><span className="pv-eye__dot" /> What we do</div>
          <h2 className="pv-h">Gas, hot water &amp; air.</h2>
          <div className="pv-sv">
            <Link href="/services#heatpump" className="pv-sv-tile pv-sv-tile--wide">
              <span className="pv-sv-ico pv-sv-ico--orange">🔥</span>
              <span className="pv-sv-t">Heat pump hot water</span>
              <span className="pv-sv-s">Reclaim, iStore, Thermann. Under $500 out of pocket with VEU.</span>
            </Link>
            <Link href="/services#split" className="pv-sv-tile">
              <span className="pv-sv-ico">❄</span>
              <span className="pv-sv-t">Split systems</span>
              <span className="pv-sv-s">Bedroom, living, granny flat.</span>
            </Link>
            <Link href="/services#ducted" className="pv-sv-tile">
              <span className="pv-sv-ico">🌬</span>
              <span className="pv-sv-t">Ducted aircon</span>
              <span className="pv-sv-s">Zoned whole-home.</span>
            </Link>
            <Link href="/services#gas-heating" className="pv-sv-tile">
              <span className="pv-sv-ico pv-sv-ico--navy">🔧</span>
              <span className="pv-sv-t">Gas heating</span>
              <span className="pv-sv-s">Rinnai, Brivis, Braemar.</span>
            </Link>
            <Link href="/services#service" className="pv-sv-tile">
              <span className="pv-sv-ico pv-sv-ico--orange">🛠</span>
              <span className="pv-sv-t">Service &amp; CO test</span>
              <span className="pv-sv-s">$280 + GST annual.</span>
            </Link>
            <Link href="/services#hotwater" className="pv-sv-tile pv-sv-tile--dark">
              <span className="pv-sv-ico">💧</span>
              <span className="pv-sv-t">Hot water swaps</span>
              <span className="pv-sv-s">Same-day on common models.</span>
            </Link>
            <Link href="/contact#emergency" className="pv-sv-tile pv-sv-tile--red pv-sv-tile--wide">
              <span className="pv-sv-ico">🚨</span>
              <span className="pv-sv-t">Emergency call-outs · 24/7</span>
              <span className="pv-sv-s">Gas leak, no hot water, smoking flue. Phones answered after hours.</span>
            </Link>
          </div>
        </div>

        {/* WHY US card */}
        <div className="pv-card">
          <div className="pv-eye"><span className="pv-eye__dot" /> Why locals call us first</div>
          <h2 className="pv-h">Boring stuff done properly.</h2>
          <div className="pv-why">
            <div className="pv-why-row">
              <span className="pv-why-num">01</span>
              <div>
                <div className="pv-why-t">Family-owned since 2014</div>
                <div className="pv-why-s">Same family answering, quoting and standing behind the work.</div>
              </div>
            </div>
            <div className="pv-why-row">
              <span className="pv-why-num">02</span>
              <div>
                <div className="pv-why-t">Reece trade partner</div>
                <div className="pv-why-s">Direct supply, real stock, no middleman markup.</div>
              </div>
            </div>
            <div className="pv-why-row">
              <span className="pv-why-num">03</span>
              <div>
                <div className="pv-why-t">Rebate paperwork sorted</div>
                <div className="pv-why-s">VEU accredited. Everything handled inside the quote.</div>
              </div>
            </div>
            <div className="pv-why-row">
              <span className="pv-why-num">04</span>
              <div>
                <div className="pv-why-t">Tickets &amp; licences current</div>
                <div className="pv-why-s">Licensed gasfitter + ARC refrigeration. Compliance cert in 24 hrs.</div>
              </div>
            </div>
          </div>
        </div>

        {/* PROCESS dark card */}
        <div className="pv-card pv-card--dark">
          <div className="pv-eye pv-eye--orange"><span className="pv-eye__dot" /> How it works</div>
          <h2 className="pv-h">Simple, honest, no runaround.</h2>
          <ol className="pv-proc">
            {[
              [1, "You get in touch", "Fill the form or call, tell us what you need.", "~ 5 min"],
              [2, "Quote back within 12 hrs", "Fixed-price quote straight to your inbox.", "within 12 hrs"],
              [3, "Site visit if needed", "For ducted and tricky retrofits we pop out.", "when required"],
              [4, "We install & show you how", "Clean install, old unit gone, walk-through.", "install day"],
              [5, "Follow-up next week", "Quick call to make sure all is running right.", "week after"],
            ].map(([n, t, d, time]) => (
              <li key={n as number} className="pv-proc-step">
                <span className="pv-proc-num">{n}</span>
                <div>
                  <div className="pv-proc-t">{t}</div>
                  <div className="pv-proc-s">{d}</div>
                  <div className="pv-proc-time">{time}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* AREA card */}
        <div className="pv-card">
          <div className="pv-eye"><span className="pv-eye__dot" /> Where we work</div>
          <h2 className="pv-h">Pakenham + 75&nbsp;km south-east.</h2>
          <p className="pv-lede">South-east of Melbourne. No travel surcharge inside the ring.</p>
          <div className="pv-map" aria-label="Service area, 75km radius from Pakenham">
            <div className="pv-map__pin" />
            <div className="pv-map__badge">
              <span className="pv-map__badge-eye">Radius</span>
              <span className="pv-map__badge-num">75 km</span>
            </div>
          </div>
          <div className="pv-chips">
            {SUBURBS.map((s) => (
              <span key={s} className="pv-chip">{s}</span>
            ))}
          </div>
        </div>

        {/* FAQ card */}
        <div className="pv-card">
          <div className="pv-eye"><span className="pv-eye__dot" /> Questions we get a lot</div>
          <h2 className="pv-h">Rebates &amp; the fine print.</h2>
          <div className="pv-faq">
            {FAQS.map((f, i) => (
              <details key={f.q} className="pv-faq-item" {...(i === 0 ? { open: true } : {})}>
                <summary>
                  <span>{f.q}</span>
                  <span className="pv-faq-plus">+</span>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* BIG CTA card */}
        <div className="pv-bcta">
          <h2 className="pv-bcta__h">VEU rebate already in the quote.</h2>
          <p className="pv-bcta__p">Free, no-obligation. Usually back within 2 hrs during business hours.</p>
          <Link href="/quote" className="pv-bcta__btn">Start my free quote →</Link>
          <div className="pv-bcta__call">
            or call <a href={`tel:${site.phoneE164}`}><strong>{site.phone}</strong></a>
          </div>
        </div>

        <div className="pv-foot">
          <strong>Advanced Gas &amp; Airconditioning Services Pty Ltd</strong><br />
          Pakenham VIC · Mon-Fri 8am-4pm
        </div>

      </div>
    </div>
  );
}
