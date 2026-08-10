import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import "../detail.css";
import "./press-kit.css";

/**
 * Press kit / media resources page.
 *
 * Purpose: kill the friction between "someone wants to link to us" and
 * "the link goes live." Chambers, manufacturer installer directories,
 * local news / lifestyle blogs and community sponsorship pages all need
 * the same 6 things — logo, boilerplate, key facts, headshot, quotes,
 * contact. This page lays them all out in one URL that can be pasted
 * into any outreach email.
 *
 * Copy-and-paste blocks are pre-formatted with the exact anchor text
 * and business description we want cited, so backlinks that come from
 * this page all reinforce the "Pakenham heat pump / aircon / gas" brand
 * signal we're chasing in local search.
 */

export const metadata: Metadata = {
  title: "Press Kit & Media Resources | Advanced Gas & Aircon Pakenham",
  description:
    "Media & partner resources for Advanced Gas & Aircon, Pakenham-based heat pump, aircon and gas plumbing specialists. Logo pack, business boilerplate, team photo, key facts, media contact and pre-approved backlink copy.",
  alternates: { canonical: "/press-kit" },
  // Unlinked and unindexed. Nothing on the site points here any more, so
  // the page is reachable only if you already have the URL — which is the
  // point: it's for handing to a journalist or a directory, not something
  // customers should stumble into. Kept rather than deleted so any link
  // already sent out doesn't turn into a 404.
  robots: { index: false, follow: false },
};

const KEY_FACTS: { label: string; value: string }[] = [
  { label: "Founded",         value: "2014, Pakenham VIC" },
  { label: "Owner-operator",  value: "Family-owned since day one" },
  { label: "Head office",     value: "1 Sierra Circuit, Pakenham VIC 3810" },
  { label: "Service radius",  value: "75 km from Pakenham · 64 postcodes" },
  { label: "Installs done",   value: "1,200+ residential + light commercial" },
  { label: "Google reviews",  value: "4.9 / 5 stars on Google" },
  { label: "Plumbing licence",value: "VIC Lic. 46828" },
  { label: "Refrigeration",   value: "ARCtick AU59557" },
  { label: "VEU accredited",  value: "Yes, rebates handled in-house" },
  { label: "Public liability",value: "$20M cover" },
  { label: "ABN",             value: site.abn },
  { label: "ACN",             value: site.acn },
];

const COPY_BLOCKS: { label: string; text: string; note?: string }[] = [
  {
    label: "One-line boilerplate (for directories with a short-description field)",
    text: "Advanced Gas & Aircon is a family-owned Pakenham installer of heat pump hot water, split-system and ducted air conditioning, and licensed gas plumbing, servicing every postcode within 75 km of Pakenham VIC.",
  },
  {
    label: "Two-sentence boilerplate (for chamber/community pages)",
    text: "Advanced Gas & Aircon is a family-owned installer based at 1 Sierra Circuit, Pakenham VIC 3810. Trading since 2014 across Melbourne's south-east and Gippsland, the team installs heat pump hot water, split-system and ducted air conditioning, and licensed gas plumbing, with VEU rebates handled in-house and a 6-year workmanship warranty on every job.",
  },
  {
    label: "Long-form bio (for guest posts, PR features, sponsorship pages)",
    text: "Advanced Gas & Aircon is a Pakenham-based installer of heat pump hot water, split-system and ducted air conditioning, and licensed gas plumbing. Founded in 2014 by owner-operator Jake Deppeler, the team has completed 1,200+ residential and light-commercial installs across the south-east, Pakenham, Berwick, Officer, Cranbourne, Narre Warren, the Dandenong Ranges hills postcodes, and out to Drouin/Warragul in Gippsland. Every install includes a fixed-price quote inside two business hours, a 6-year workmanship warranty, and the VEU rebate applied at the quote stage rather than chased after the fact. Fully licensed: Plumbing Lic. 46828, ARCtick refrigeration handling licence AU59557, VEU accredited, $20 M public liability.",
  },
  {
    label: "Suggested anchor text (for a hyperlink pointing to advancedgas.com.au)",
    text: "Advanced Gas & Aircon · Pakenham heat pump and aircon installer",
    note: "Vary this every 3rd or 4th link, a link profile of 100 % identical anchors looks unnatural. Alternates below.",
  },
  {
    label: "Anchor text alternates",
    text: [
      "Pakenham heat pump installer",
      "Advanced Gas & Aircon",
      "licensed gas plumber Pakenham",
      "aircon installation Melbourne south-east",
      "Advanced Gas, VEU-accredited heat pump installer",
      "advancedgas.com.au",
    ].map((s) => `• ${s}`).join("\n"),
  },
  {
    label: "Suggested pull-quote (from Jake, for feature articles)",
    text: "“We answer the phone ourselves, quote the job ourselves, and we're the same face on the tools on install day. That trail of trust doesn't exist with most of the bigger mobs anymore, and it's the only reason a family-owned installer can still hold its own in this market.”, Jake Deppeler, founder, Advanced Gas & Aircon",
  },
  {
    label: "Suggested pull-quote (on rebates)",
    text: "“We apply the VEU rebate at the quote stage so the customer never pays it up-front and chases it back. The number on the quote is the number you pay.”, Jake Deppeler",
  },
];

const OUTREACH_PLAN: { audience: string; whyLink: string; useThis: string }[] = [
  {
    audience: "Manufacturer installer directories (Reclaim, iStore, Thermann, Brivis, Mitsubishi Electric, Kaden, Zonemate)",
    whyLink: "You install their products at volume, every accredited-installer directory on their site is a link worth chasing.",
    useThis: "Two-sentence boilerplate + logo pack + Pakenham postcode.",
  },
  {
    audience: "Reece trade partner listing (reece.com.au)",
    whyLink: "You're already a Reece trade partner. Ask your Reece rep to list you on the installer finder.",
    useThis: "Two-sentence boilerplate + logo pack + coverage postcodes.",
  },
  {
    audience: "VEU / Solar Victoria accredited-installer page",
    whyLink: "Government domain, high trust, accredited installers get a public listing.",
    useThis: "One-line boilerplate + VEU accreditation number.",
  },
  {
    audience: "Cardinia / Casey Chambers of Commerce",
    whyLink: "Local-authority chamber pages hand out do-follow links to member businesses. ~$200 / yr membership is worth it for the link alone.",
    useThis: "Long-form bio + logo pack.",
  },
  {
    audience: "Star News Group, Berwick News, Pakenham Gazette, Officer/Pakenham Star",
    whyLink: "Local news covers accredited trades. Offer a rebate-explainer piece or an install case study, link back to /rebates or /heat-pumps.",
    useThis: "Long-form bio + pull-quote + team photo.",
  },
  {
    audience: "hipages, Oneflare, ServiceSeeking, Airtasker Pro, Yellow Pages, White Pages, TrueLocal, StartLocal",
    whyLink: "Free directory listings, some are do-follow, some are no-follow, all reinforce name/address/phone (NAP) consistency for local SEO.",
    useThis: "One-line boilerplate + logo pack + full contact block below.",
  },
  {
    audience: "Local sports club sponsorship pages (Pakenham Bombers FC, Berwick Cricket, Cardinia Netball, etc.)",
    whyLink: "Sponsoring a club typically earns a sponsors-page backlink, bonus community-signal for local search.",
    useThis: "Logo pack + short boilerplate + link target /contact.",
  },
];

export default function PressKitPage() {
  return (
    <div className="page-detail page-press">
      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/about">About</Link>
            <span className="sep">/</span>
            <span className="cur">Press kit</span>
          </nav>
          <div className="dp-hero__eyebrow"><span className="ds-dot" /> Media &amp; partner resources</div>
          <h1>
            Press kit for <span className="accent">Advanced Gas &amp; Aircon</span>.
          </h1>
          <p className="dp-hero__sub">
            Everything a chamber, manufacturer directory, community sponsor or local news outlet
            needs to link to us in one place. Logo pack, business boilerplate, key facts, team photo,
            pre-approved quotes and a media contact, copy, paste, publish.
          </p>
        </div>
      </section>

      {/* ------------------ Quick contact for media ------------------ */}
      <section className="press-contact">
        <div className="wrap press-contact__grid">
          <div>
            <span className="ds-eyebrow"><span className="ds-dot" /> Media contact</span>
            <h2>Jake Deppeler · founder / owner-operator.</h2>
            <p>
              For media enquiries, feature interviews, guest-post proposals, sponsorship,
              or directory-listing requests, please reach out directly.
            </p>
            <ul className="press-contact__list">
              <li>
                <span className="press-contact__lbl">Email</span>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
              <li>
                <span className="press-contact__lbl">Phone</span>
                <a href={`tel:${site.phoneE164}`}>{site.phone}</a>
              </li>
              <li>
                <span className="press-contact__lbl">Office</span>
                <span>{site.address.street}, {site.address.suburb} {site.address.state} {site.address.postcode}</span>
              </li>
              <li>
                <span className="press-contact__lbl">Website</span>
                <a href={site.url}>{site.url.replace(/^https?:\/\//, "")}</a>
              </li>
            </ul>
          </div>
          <div className="press-contact__badge">
            <div className="press-contact__badge-inner">
              <div className="press-contact__badge-num">4.9 / 5</div>
              <div className="press-contact__badge-lbl">Google reviews</div>
              <div className="press-contact__badge-divider" />
              <div className="press-contact__badge-num">1,200+</div>
              <div className="press-contact__badge-lbl">installs done</div>
              <div className="press-contact__badge-divider" />
              <div className="press-contact__badge-num">12 yrs</div>
              <div className="press-contact__badge-lbl">Pakenham local trading</div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------ Logo pack + team photo ------------------ */}
      <section className="press-assets">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Downloadable assets</span>
            <h2>Logo pack &amp; team photo.</h2>
            <p>
              Right-click any asset and choose &ldquo;Save image as&hellip;&rdquo; to download.
              Please don&rsquo;t alter the logo colours or crop the wordmark. On-brand palette:
              navy <code>#050a30</code>, orange <code>#f36722</code>, sky <code>#00b0ed</code>.
            </p>
          </div>
          <div className="press-assets__grid">
            <figure className="press-asset">
              <div className="press-asset__frame press-asset__frame--white">
                <img src="/advanced-gas-logo.webp" alt="Advanced Gas & Aircon full-colour logo, white background" />
              </div>
              <figcaption>
                <b>Full-colour logo · white background</b>
                <span>WebP · use on light / white backgrounds</span>
                <a href="/advanced-gas-logo.webp" download>Download →</a>
              </figcaption>
            </figure>

            <figure className="press-asset">
              <div className="press-asset__frame press-asset__frame--navy">
                <img src="/logo-mark.svg" alt="Advanced Gas & Aircon icon-only mark" />
              </div>
              <figcaption>
                <b>Icon mark · reversed</b>
                <span>SVG · avatar, favicon, small placements</span>
                <a href="/logo-mark.svg" download>Download →</a>
              </figcaption>
            </figure>

            <figure className="press-asset">
              <div className="press-asset__frame press-asset__frame--photo">
                <img src="/team-photo.webp" alt="Advanced Gas & Aircon team standing in front of the Pakenham workshop with sign-written vans" />
              </div>
              <figcaption>
                <b>Team photo · workshop</b>
                <span>WebP · 1800×1200 · use for feature articles &amp; sponsorship pages</span>
                <a href="/team-photo.webp" download>Download →</a>
              </figcaption>
            </figure>

            <figure className="press-asset">
              <div className="press-asset__frame press-asset__frame--white">
                <img src="/advanced gas logo with white background.jpg" alt="Advanced Gas & Aircon logo, high-res JPG" />
              </div>
              <figcaption>
                <b>High-res logo · JPG</b>
                <span>JPG · for print, invoices, sponsor boards</span>
                <a href="/advanced%20gas%20logo%20with%20white%20background.jpg" download>Download →</a>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ------------------ Key facts ------------------ */}
      <section className="press-facts">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Business facts</span>
            <h2>At a glance.</h2>
          </div>
          <dl className="press-facts__grid">
            {KEY_FACTS.map((f) => (
              <div key={f.label} className="press-facts__row">
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ------------------ Copy-and-paste boilerplate ------------------ */}
      <section className="press-copy">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Copy &amp; paste</span>
            <h2>Boilerplate, anchor text &amp; pull-quotes.</h2>
            <p>
              Pre-approved text for directory listings, chamber pages, guest posts and news
              features. Any of these can be pasted verbatim.
            </p>
          </div>
          <div className="press-copy__list">
            {COPY_BLOCKS.map((c) => (
              <div key={c.label} className="press-copy__block">
                <div className="press-copy__lbl">{c.label}</div>
                <pre className="press-copy__pre">{c.text}</pre>
                {c.note && <p className="press-copy__note">{c.note}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------ Suggested outreach targets ------------------ */}
      <section className="press-outreach">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Where to place links</span>
            <h2>Australian backlink targets worth chasing.</h2>
            <p>
              The link profile that moves your Google rankings is <strong>relevant</strong>,
              <strong> local</strong>, and <strong>credible</strong>. These are the seven target
              categories that fit all three.
            </p>
          </div>
          <div className="press-outreach__list">
            {OUTREACH_PLAN.map((o) => (
              <article key={o.audience} className="press-outreach__card">
                <h3>{o.audience}</h3>
                <p className="press-outreach__why"><b>Why link:</b> {o.whyLink}</p>
                <p className="press-outreach__use"><b>Use:</b> {o.useThis}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------ Full contact block for NAP consistency ------------------ */}
      <section className="press-nap">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> NAP block</span>
            <h2>Name, address, phone. Use exactly this format.</h2>
            <p>
              Local search rewards <strong>NAP consistency</strong>, every directory listing
              should show the business name, address and phone in the same format. Copy this
              block verbatim into every listing.
            </p>
          </div>
          <pre className="press-copy__pre press-copy__pre--nap">
{`Advanced Gas & Aircon
1 Sierra Circuit
Pakenham VIC 3810
Australia

Phone: ${site.phone}
Email: ${site.email}
Website: ${site.url}

ABN: ${site.abn}
ACN: ${site.acn}
Plumbing Licence: 46828
ARCtick Licence: AU59557`}
          </pre>
        </div>
      </section>

      {/* ------------------ Big CTA ------------------ */}
      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Ready to feature us?</h2>
            <p>We reply to media enquiries within 2 business hours.</p>
          </div>
          <div className="bigcta__btns">
            <a href={`mailto:${site.email}`} className="ds-btn ds-btn--orange ds-btn--xl">Email {site.email} →</a>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
