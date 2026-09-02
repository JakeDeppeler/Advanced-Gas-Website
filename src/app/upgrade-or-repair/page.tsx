import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { RepairOrReplace } from "@/components/RepairOrReplace";
import { ReviewMarquee } from "@/components/ReviewMarquee";
import { faqSchema, breadcrumbSchema } from "@/lib/schema";
import { pageTitle, metaDescription } from "@/lib/seo";
import { LIFE_EXPECTANCY, REBATE_FACTS } from "@/lib/upgradeAngle";
import "./upgrade.css";

/**
 * "Repair it or replace it?" — the question behind most of the calls we
 * take, and one nobody in the trade answers honestly in public because
 * the honest answer is sometimes "repair it".
 *
 * This is also where the two arguments we make everywhere get their
 * long-form version: the ten-year threshold, and the VEU rebate being
 * worth the most at exactly the moment a system reaches it. The compact
 * <UpgradeNudge /> across the site links here.
 */

export const metadata: Metadata = {
  title: pageTitle("Repair or Replace? The 10-Year Rule"),
  description: metaDescription(
    "How long hot water systems, gas heaters and aircon actually last, when repairing stops making financial sense, and why the VEU rebate is worth most at exactly that point.",
  ),
  keywords: [
    "should I repair or replace my hot water system",
    "how long does a hot water system last",
    "how long does a ducted heater last",
    "is it worth repairing my air conditioner",
    "hot water system 10 years old",
    "gas heater 15 years old replace",
    "VEU rebate old system",
  ],
  alternates: { canonical: "/upgrade-or-repair" },
};

const FAQS = [
  {
    q: "How old is too old for a hot water system?",
    a: "Around ten years for a storage tank, gas or electric. The tank is a steel cylinder protected by a sacrificial anode, and once the anode is spent the steel starts going. Elements, thermostats and valves are all worth fixing on a young tank. None of them help an old one, because it isn't those parts that fail terminally, it's the cylinder.",
  },
  {
    q: "My ducted heater is 12 years old and still works. Should I replace it?",
    a: "Get it carbon monoxide tested first, and let the result decide. Heat exchangers crack with thermal cycling and a cracked one spills carbon monoxide with no smell to warn you. If it tests clean and runs well, you can keep going with annual tests. If it doesn't, it's a replacement, and that isn't a sales position, it's the law.",
  },
  {
    q: "Is it worth regassing an old air conditioner?",
    a: "Not usually, and here's the honest reason: aircon doesn't consume refrigerant. If it's low, it has leaked, so a regas without finding the leak is paying to fill a bucket with a hole in it. On an R22 unit — anything roughly fifteen years or older — the gas itself is phased out and expensive, which usually settles the argument on its own.",
  },
  {
    q: "Does the VEU rebate need my old system to be broken?",
    a: "No, and this is the part most people get wrong. The scheme rewards the efficiency improvement, not the failure. A working but inefficient old gas or electric tank is exactly what it was designed to replace, which means the best time to claim it is before you're standing in a cold shower making a rushed decision.",
  },
  {
    q: "How much is the VEU rebate worth?",
    a: `Up to about $${REBATE_FACTS.maxStacked.toLocaleString()} on heat pump hot water for an owner-occupier with everything stacked — VEEC, STC, the $${REBATE_FACTS.ausMade} Australian Made bonus on eligible brands, and the $${REBATE_FACTS.vicSolar.toLocaleString()} Solar Homes rebate if you qualify. Rentals get up to about $${REBATE_FACTS.maxRental.toLocaleString()}, because Solar Homes is owner-occupier only. We apply it at the quote rather than making you chase it.`,
  },
  {
    q: "What if you tell me to replace it and I don't believe you?",
    a: "Get another quote, and we mean that. What we'll give you is the repair price and the replacement price on the same page, with the rebate already applied, so you're comparing two real numbers rather than a number and a feeling. If someone else can genuinely repair it for less and make it last, take their quote.",
  },
];

const SIGNS = [
  {
    t: "The repair quote is over about a third of a new one",
    d: "Standard rule of thumb across the trade, and it holds up. Spend $1,400 on a ten-year-old tank and you've bought maybe two years on a system that owes you nothing. Put that toward a replacement with the rebate applied and you've bought fifteen.",
  },
  {
    t: "It's the second repair in two years",
    d: "One failure is a component. Two is the system telling you where it is in its life. The second call-out is usually the one where we stop quoting parts and start quoting both options side by side.",
  },
  {
    t: "Rusty water, or water on the floor",
    d: "On a storage tank this is the end. A weeping tank cannot be repaired and a wet tank gets worse quickly, not slowly. Turn the water off at the isolation valve and ring someone, because it will fail properly at the least convenient moment available.",
  },
  {
    t: "The running costs have crept up and nothing else changed",
    d: "Efficiency drops as things age — sediment in a tank, a coil that's lost capacity, a heater burning more gas to hold the same temperature. It rarely shows up as a fault. It shows up on the bill.",
  },
  {
    t: "Parts are on back-order",
    d: "When a part takes three weeks, that isn't just an inconvenience, it's the supply chain telling you the model is being wound down. We'll always tell you when we're chasing a part for a discontinued unit rather than quietly adding days.",
  },
  {
    t: "A gas appliance over ten that hasn't been CO tested",
    d: "This one isn't economics. A cracked heat exchanger has no smell and no warning, and the test takes minutes with a calibrated analyser. Whatever you decide about replacing it, get it tested.",
  },
];

const REPAIR_INSTEAD = [
  "It's under about six years old and the fault is a component — an element, a thermostat, a capacitor, a sensor",
  "A gas heater that won't light, where it's an igniter or a flame sense rod. Both are stocked parts and both are a one-visit fix",
  "An aircon that isn't cooling because the filters and coil are filthy. That's a service, not a system",
  "A hot water system with a spent anode but a sound tank — an anode change is cheap and it genuinely buys years",
  "Anything still inside its manufacturer warranty. Ring the manufacturer before you ring us, and we'll tell you that on the phone for free",
];

export default function UpgradeOrRepairPage() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Repair or replace", url: `${site.url}/upgrade-or-repair` },
  ]);

  return (
    <div className="page-upgrade">
      <Script id="uog-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(FAQS)) }} />
      <Script id="uog-crumbs" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

      <section className="ug-hero">
        <div className="wrap">
          <div className="ds-eyebrow ds-eyebrow--on-dark wf-eyebrow">
            <span className="ds-dot" />
            The question behind most of our call-outs
          </div>
          <h1>
            Repair it, or <em>replace it?</em>
          </h1>
          <p className="ug-hero__sub">
            Ten years is usually where the answer changes. Nobody in this trade wants to say out
            loud that sometimes the right answer is
            "fix it and keep going", because there's no invoice in it. So here's the whole
            argument in public: how long these things actually last, where repair spend stops
            earning its keep, when we'd tell you to repair instead — and why the VEU rebate
            happens to be worth the most at exactly the moment your system hits the line.
          </p>
          <div className="pg-ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get both prices side by side →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
              Or just ask us
            </a>
          </div>

          {/* The figures, same strip the service and filtration headers
              carry. The ages here are the ones the table below argues. */}
          <ul className="dp-hero__at ug-hero__at">
            <li><strong>10 yrs</strong><span>Where hot water tanks stop earning repairs</span></li>
            <li><strong>10 yrs</strong><span>Where a gas heater becomes a safety question</span></li>
            <li><strong>12 yrs</strong><span>Where a refrigerated compressor does</span></li>
            <li><strong>$120</strong><span>Fixed diagnosis, so you know before you spend</span></li>
          </ul>
        </div>
      </section>

      {/* THE TABLE */}
      {/* THE CALCULATOR — the page argues the case in prose below, but
          somebody standing next to a dead heater has a system, an age and
          a number a tradesman just quoted them, and no way to tell
          whether that number is worth paying. This does that sum. */}
      <section className="ug-tool">
        <div className="wrap">
          <RepairOrReplace />
        </div>
      </section>

      <section className="ug-life">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> How long they actually last</span>
            <h2>Design life, and where we stop recommending you spend.</h2>
            <p>
              These aren&rsquo;t marketing numbers. They&rsquo;re what the manufacturers quote for
              design life, and what we see replacing this gear across the corridor every week.
              &ldquo;Replace from&rdquo; is the age past which a significant repair usually costs
              more per remaining year than a new system does.
            </p>
          </div>

          <div className="ug-tablewrap">
            <table className="ug-table">
              <thead>
                <tr>
                  <th>System</th>
                  <th>Typical life</th>
                  <th>Replace from</th>
                  <th>Why that age</th>
                  <th>What you gain</th>
                </tr>
              </thead>
              <tbody>
                {LIFE_EXPECTANCY.map((l) => (
                  <tr key={l.system}>
                    <td><strong>{l.system}</strong></td>
                    <td className="ug-td--num">{l.typicalLife}</td>
                    <td className="ug-td--num"><span className="ug-age">{l.replaceFrom} yrs</span></td>
                    <td>{l.why}</td>
                    <td>{l.upside}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SIGNS */}
      <section className="ug-signs">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> Six signs it's replacement time</span>
            <h2>You usually know before we tell you.</h2>
            <p>These are the six that decide it.</p>
          </div>
          <div className="ug-signs__grid">
            {SIGNS.map((s, i) => (
              <div className="ug-sign" key={s.t}>
                <span className="ug-sign__num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE HONEST HALF */}
      <section className="ug-repair">
        <div className="wrap ug-repair__grid">
          <div>
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot" /> The other half</span>
              <h2>When we'd tell you to repair it and keep your money.</h2>
            </div>
            <p>
              This page pushes replacement because most of the time, on most of the systems
              we're called to, that's the right call and the numbers say so. But a page that
              only ever pointed one way would be an advertisement, not advice. Here's where
              we'd tell you to fix it.
            </p>
            <p className="ug-repair__note">
              Selling someone a system they didn't need is how you get one job instead of a
              family's worth. We'd genuinely rather have the family.
            </p>
          </div>
          <ul className="ug-repair__list">
            {REPAIR_INSTEAD.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      </section>

      {/* REBATE */}
      <section className="ug-rebate">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> Why the timing matters</span>
            <h2>The rebate is worth most at exactly the moment you hit the line.</h2>
          </div>
          <div className="ug-rebate__grid">
            <div className="ug-rebate__copy">
              <p>
                The Victorian Energy Upgrades program pays to get old, inefficient appliances
                out of houses. That's the whole design of it. Which means the appliance the
                scheme values most is precisely the one you're standing in front of wondering
                whether to repair — the ten-year-old gas or electric tank, the 3-star ducted
                heater, the aircon running phased-out refrigerant.
              </p>
              <p>
                Two things follow from that, and both are worth knowing before you decide.
                First, <strong>your old system does not need to be broken to qualify</strong>.
                The rebate rewards the efficiency improvement, not the failure. Second, the
                worst time to make this decision is the morning it dies, because you'll take
                whoever can come today at whatever they charge. Deciding while you still have
                hot water is how you get a better system for less money.
              </p>
              <p>
                We apply the rebate at the quote. Not a claim form, not a rebate you chase
                afterwards, not "you'll get it back later". If an installer quotes you a
                number and tells you to claim it yourself, that's worth a second look.
              </p>
              <p className="ug-rebate__links">
                <Link href="/rebates">How the VEU rebate works →</Link>
                <Link href="/tools/veu-rebate-estimator">Estimate yours →</Link>
                <Link href="/services/gas-plumbing/temporary-hot-water">Need hot water while you decide? →</Link>
              </p>
            </div>
            <div className="ug-rebate__numbers">
              <div className="ug-num">
                <strong>${REBATE_FACTS.maxStacked.toLocaleString()}</strong>
                <span>up to, owner-occupier, everything stacked</span>
              </div>
              <div className="ug-num">
                <strong>${REBATE_FACTS.maxRental.toLocaleString()}</strong>
                <span>up to, rentals — no Solar Homes, everything else applies</span>
              </div>
              <div className="ug-num">
                <strong>${REBATE_FACTS.ausMade}</strong>
                <span>Australian Made bonus, on the brands that qualify</span>
              </div>
              <div className="ug-num ug-num--flat">
                <strong>$0</strong>
                <span>for you to chase. We do the paperwork</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="ug-faq">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> Straight answers</span>
            <h2>The questions we get asked on the phone.</h2>
          </div>
          <div className="ug-faq__list">
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <ReviewMarquee heading="Reviews from households across the south-east." />

      <section className="ug-cta">
        <div className="wrap">
          <h2>Both numbers, on one page, with the rebate already in them.</h2>
          <p>
            Tell us what you've got and roughly how old it is. We'll come back with what the
            repair costs, what the replacement costs after the rebate, and which one we'd do
            if it were our house. If that's the repair, we'll say so.
          </p>
          <div className="pg-ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get both prices →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
              {site.phone}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
