import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import "./about.css";

export const metadata: Metadata = {
  title: "About — Family-run Pakenham tradies since 2014",
  description:
    "Family-run gas, hot water and aircon specialists in Pakenham. 12 years local, 8-strong crew, fully licensed and VEU accredited.",
  alternates: { canonical: "/about" },
};

const timeline = [
  { year: "2014", h: "Dean leaves the union", p: "After years on the tools under the union ticket, Dean strikes out on his own. One ute, one phone, one mobile number he still answers." },
  { year: "2016", h: "Jye comes on board", p: "First hire — Jye starts as an installer and is still on the trucks today as lead installer. Most installs that go out get his hands on them." },
  { year: "2019", h: "Kellie & Tash in the office", p: "Kellie (Dean's wife) steps in to run the books and keep the install crew moving. Mate Tash is alongside her most days." },
  { year: "2021", h: "Reece trade partnership", p: "Joined the Reece trade program — direct supply, real warranties, no inflated middleman pricing." },
  { year: "2023", h: "VEU accreditation", p: "Became an accredited installer under the Victorian Energy Upgrades program. Started doing the rebate paperwork in-house." },
  { year: "2024", h: "Our own factory in Pakenham", p: "Moved out of the rented garage and into our own Pakenham factory. Stock, trucks, and customer meetings all under one roof." },
];

const team = [
  { name: "Dean", role: "Director", bio: "Started Advanced Gas in 2014. Still on most quotes, still answers his own phone.", photo: "/dean.png" },
  { name: "Jake", role: "Commercial & Operations", bio: "Runs the commercial book and the day-to-day. Cafés, gyms, offices, fit-outs — one PM, one invoice.", photo: "/jake.png" },
  { name: "Jye", role: "Lead installer", bio: "Cleanest pipework in the south-east. Splits, multi-heads and ducted retrofits.", photo: "/jye.png" },
  { name: "Kellie", role: "General Manager", bio: "Keeps the wheels on. Bookings, VEU paperwork and the reason your compliance certs land in 24 hours.", photo: "/kellie.png" },
];

const values = [
  { n: "01", h: "Fixed quotes", p: "The quote you sign is the price you pay. Variations only with your written OK first. No surprise invoices on completion." },
  { n: "02", h: "Clean job sites", p: "Drop sheets, vacuum, old unit disposed. We leave it cleaner than we found it — or we hear about it from the customer, and rightly so." },
  { n: "03", h: "Paperwork in 24 hours", p: "Compliance certificate, warranty pack, rebate confirmation — all emailed to you within 24 hours of completion. No chase." },
];

export default function AboutPage() {
  return (
    <div className="page-about">
      <section className="ab-hero">
        <div className="wrap">
          <span className="ds-eyebrow"><span className="ds-dot" /> About us · est. 2014</span>
          <h1>Started in a Pakenham garage. <em>Still answering the phone.</em></h1>
          <p>Family-owned, locally run. The bloke on the phone is the bloke on the tools. The bloke on the tools is the bloke who signs the warranty. Twelve years on, that hasn&apos;t changed.</p>
        </div>
      </section>

      <section className="ab-frame">
        <div className="wrap">
          <div
            className="ab-frame__big"
            role="img"
            aria-label="Advanced Gas team photo"
            style={{ backgroundImage: "url(/team-photo.png)" }}
          />
        </div>
      </section>

      <section className="ab-stats">
        <div className="wrap ab-stats__grid">
          <div className="ab-stats__item"><strong>12</strong><span>years local trading</span></div>
          <div className="ab-stats__item"><strong>75 km</strong><span>service radius from Pakenham</span></div>
          <div className="ab-stats__item"><strong>4.9★</strong><span>Google · 280 reviews</span></div>
          <div className="ab-stats__item"><strong>8</strong><span>family-run team</span></div>
        </div>
      </section>

      <section className="ab-story">
        <div className="wrap ab-story__grid">
          <div className="ab-story__copy">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Our story</span>
            <h2>From one ute to an 8-person family crew, with the same handshake.</h2>
            <p>Dean started Advanced Gas in 2014 — he&apos;d had enough of the union and wanted to run his own jobs his own way. One ute, one phone, one promise: if he quoted it, he installed it, and he stood behind it.</p>
            <p>A couple of years in he hired <strong>Jye</strong> — first apprentice, now lead installer. The rest of the team grew slowly from there, one good hire at a time. Today we&apos;re an <strong>8-person family-run crew</strong>. <strong>Kellie</strong> (Dean&apos;s wife) runs the office and keeps the install crew moving; her mate <strong>Tash</strong> is alongside her most days, fielding calls and chasing rebate paperwork.</p>
            <p>In 2024 we moved out of the rented garage and into our own factory in Pakenham — somewhere to store the gear, prep the trucks and meet customers without apologising for the mess.</p>
            <p>What hasn&apos;t changed: <strong>family-owned, locally run, no call-centres, no quote-pumping middlemen.</strong> When you ring {site.phone} you get a tradie or a family member — same as day one.</p>
            <p>We picked Pakenham because it&apos;s home. We service within 75 km because beyond that we can&apos;t promise the same turnaround. We chose Reece as our trade partner because their stock is real and their warranties are honoured. We chose Reclaim, Mitsubishi, Kaden and Rinnai because we&apos;ve installed enough of each to know which house suits which model.</p>
          </div>
          <ol className="ab-timeline">
            {timeline.map((t) => (
              <li key={t.year}>
                <span className="ab-timeline__year">{t.year}</span>
                <h3>{t.h}</h3>
                <p>{t.p}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ab-team">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> The team</span>
            <h2>Real names, real faces, real numbers you can ring.</h2>
            <p>Same blokes on the quote and the install. When something needs sorting after-hours, you ring the same name.</p>
          </div>
          <div className="team-grid">
            {team.map((m) => (
              <article key={m.name} className="team">
                <div
                  className="team__photo"
                  role="img"
                  aria-label={`${m.name} — ${m.role}`}
                  style={{ backgroundImage: `url(${m.photo})` }}
                />
                <div className="team__body">
                  <h3 className="team__name">{m.name}</h3>
                  <p className="team__role">{m.role}</p>
                  <p className="team__bio">{m.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ab-values">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> How we work</span>
            <h2>Three things we don&apos;t negotiate on.</h2>
          </div>
          <div className="values-grid">
            {values.map((v) => (
              <div key={v.n} className="val">
                <span className="val__n">/{v.n}</span>
                <h3>{v.h}</h3>
                <p>{v.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ab-acc">
        <div className="wrap ab-acc__grid">
          <div>
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> Accreditations &amp; licences</span>
            <h2>The boring tickets that mean we can sign your compliance cert.</h2>
            <p>Every install gets a compliance certificate from a licensed tradie. No subcontracted-out-the-back jobs.</p>
          </div>
          <div className="acc-list">
            <div className="acc"><span className="acc__name">Licensed Plumber & Gasfitter (VIC)</span><span className="acc__num">{site.licences.plumbing}</span></div>
            <div className="acc"><span className="acc__name">ARC Refrigeration</span><span className="acc__num">{site.licences.refrigeration}</span></div>
            <div className="acc"><span className="acc__name">VEU Accredited Installer</span><span className="acc__num">VEET program</span></div>
            <div className="acc"><span className="acc__name">Reece Trade Partner</span><span className="acc__num">since 2019</span></div>
            <div className="acc"><span className="acc__name">$20M Public Liability</span><span className="acc__num">CGU Insurance</span></div>
          </div>
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Want to talk to the family running this thing?</h2>
            <p>We&apos;re around Mon–Sat. After hours for emergencies.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Get a free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
