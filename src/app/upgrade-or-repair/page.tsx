import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { Crumbs, Hero, Tiles } from "@/components/homepage/page/kit";
import { BkHead, Bands, Tabs, EndCta, BandPage, type Band } from "@/components/homepage/page/bands";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import { RepairOrReplace } from "@/components/RepairOrReplace";
import { getReviews } from "@/lib/googleReviews";
import { faqSchema, breadcrumbSchema } from "@/lib/schema";
import { pageTitle, metaDescription } from "@/lib/seo";
import { LIFE_EXPECTANCY, REBATE_FACTS } from "@/lib/upgradeAngle";
// The calculator's styles live with the route, scoped to .page-upgrade; the bands are new.
import "./upgrade.css";
import "@/components/homepage/page/repair.css";
import { JsonLd } from "@/components/JsonLd";

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
    a: "Not usually, and here's the honest reason: aircon doesn't consume refrigerant. If it's low, it has leaked, so a regas without finding the leak is paying to fill a bucket with a hole in it. On an R22 unit: anything roughly fifteen years or older: the gas itself is phased out and expensive, which usually settles the argument on its own.",
  },
  {
    q: "Does the VEU rebate need my old system to be broken?",
    a: "No, and this is the part most people get wrong. The scheme rewards the efficiency improvement, not the failure. A working but inefficient old gas or electric tank is exactly what it was designed to replace, which means the best time to claim it is before you're standing in a cold shower making a rushed decision.",
  },
  {
    q: "How much is the VEU rebate worth?",
    a: `Up to about $${REBATE_FACTS.maxStacked.toLocaleString()} on heat pump hot water for an owner-occupier with everything stacked. VEEC, STC, the $${REBATE_FACTS.ausMade} Australian Made bonus on eligible brands, and the $${REBATE_FACTS.vicSolar.toLocaleString()} Solar Homes rebate if you qualify. Rentals get up to about $${REBATE_FACTS.maxRental.toLocaleString()}, because Solar Homes is owner-occupier only. We apply it at the quote rather than making you chase it.`,
  },
  {
    q: "What if you tell me to replace it and I don't believe you?",
    a: "Get another quote, and we mean that. What we'll give you is the repair price and the replacement price on the same page, with the rebate already applied, so you're comparing two real numbers rather than a number and a feeling. If someone else can genuinely repair it for less and make it last, take their quote.",
  },
];

const SIGNS = [
  {
    t: "The repair quote is over about a third of a new one",
    d: "Standard rule of thumb across the trade, and it holds up. Spend a third of a new tank repairing a ten-year-old one and you've bought maybe two years on a system that owes you nothing. Put that toward a replacement with the rebate applied and you've bought fifteen.",
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
    d: "Efficiency drops as things age: sediment in a tank, a coil that's lost capacity, a heater burning more gas to hold the same temperature. It rarely shows up as a fault. It shows up on the bill.",
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
  "It's under about six years old and the fault is a component: an element, a thermostat, a capacitor, a sensor",
  "A gas heater that won't light, where it's an igniter or a flame sense rod. Both are stocked parts and both are a one-visit fix",
  "An aircon that isn't cooling because the filters and coil are filthy. That's a service, not a system",
  "A hot water system with a spent anode but a sound tank, an anode change is cheap and it genuinely buys years",
  "Anything still inside its manufacturer warranty. Ring the manufacturer before you ring us, and we'll tell you that on the phone for free",
];

export default async function UpgradeOrRepairPage() {
  // The homepage's moving review columns, as the suburb pages carry them.
  const { reviews, summary } = await getReviews(12);
  const cols = [0, 1, 2].map((c) => reviews.filter((_, i) => i % 3 === c));
  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Repair or replace", url: `${site.url}/upgrade-or-repair` },
  ]);

  const bands: Band[] = [
    {
      // Somebody standing next to a dead heater has a system, an age and a
      // number a tradesman just quoted them, and no way to tell whether that
      // number is worth paying. The calculator does that sum, so it leads.
      id: "sum", tab: "Do the sum",
      body: <div className="page-upgrade rpx__tool"><RepairOrReplace /></div>,
    },
    {
      id: "life", tab: "How long they last",
      body: (
        <>
          <BkHead h="Design life, and where we {stop recommending you spend}.">
            These aren&rsquo;t marketing numbers. They&rsquo;re what the manufacturers quote for design life, and what
            we see replacing this gear across the corridor every week. &ldquo;Replace from&rdquo; is the age past which a
            significant repair usually costs more per remaining year than a new system does.
          </BkHead>
          <div className="rpx__tablewrap">
            <table className="rpx__table">
              <thead>
                <tr><th>System</th><th>Typical life</th><th>Replace from</th><th>Why that age</th><th>What you gain</th></tr>
              </thead>
              <tbody>
                {LIFE_EXPECTANCY.map((l) => (
                  <tr key={l.system}>
                    <th scope="row">{l.system}</th>
                    <td className="rpx__num" data-k="Typical life">{l.typicalLife}</td>
                    <td className="rpx__num" data-k="Replace from"><span className="rpx__age">{l.replaceFrom} yrs</span></td>
                    <td data-k="Why that age">{l.why}</td>
                    <td data-k="What you gain">{l.upside}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ),
    },
    {
      id: "signs", tab: "Six signs", navy: true,
      body: (
        <>
          <BkHead h="You usually know {before we tell you}.">These are the six signs that decide it.</BkHead>
          <Tiles anim items={SIGNS.map((x) => ({ t: x.t, d: x.d }))} />
        </>
      ),
    },
    {
      // The honest half: a page that only ever pointed one way would be an
      // advertisement, not advice.
      id: "repair", tab: "When to repair", cls: "rpx__two",
      body: (
        <>
          <div className="rpx__copy">
            <BkHead h="When we’d tell you to repair it and {keep your money}." />
            <p>
              This page pushes replacement because most of the time, on most of the systems we&rsquo;re called to,
              that&rsquo;s the right call and the numbers say so. But a page that only ever pointed one way would be an
              advertisement, not advice. Here&rsquo;s where we&rsquo;d tell you to fix it.
            </p>
            <p className="rpx__note">
              Selling someone a system they didn&rsquo;t need is how you get one job instead of a family&rsquo;s worth.
              We&rsquo;d genuinely rather have the family.
            </p>
          </div>
          <div className="pcx__col pcx__col--pro rpx__list">
            <h3><span aria-hidden="true">+</span> Repair it if</h3>
            <ul>{REPAIR_INSTEAD.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
        </>
      ),
    },
    {
      id: "rebate", tab: "Why timing matters", cls: "rpx__two",
      body: (
        <>
          <div className="rpx__copy">
            <BkHead h="The rebate is worth most at exactly the moment {you hit the line}." />
            <p>
              The Victorian Energy Upgrades program pays to get old, inefficient appliances out of houses. That&rsquo;s
              the whole design of it. Which means the appliance the scheme values most is precisely the one you&rsquo;re
              standing in front of wondering whether to repair: the ten-year-old gas or electric tank, the 3-star ducted
              heater, the aircon running phased-out refrigerant.
            </p>
            <p>
              Two things follow from that, and both are worth knowing before you decide. First, <strong>your old system
              does not need to be broken to qualify</strong>. The rebate rewards the efficiency improvement, not the
              failure. Second, the worst time to make this decision is the morning it dies, because you&rsquo;ll take
              whoever can come today at whatever they charge. Deciding while you still have hot water is how you get a
              better system for less money.
            </p>
            <p>
              We apply the rebate at the quote. Not a claim form, not a rebate you chase afterwards, not &ldquo;you&rsquo;ll
              get it back later&rdquo;. If an installer quotes you a number and tells you to claim it yourself, that&rsquo;s
              worth a second look.
            </p>
            <p className="rpx__links">
              <Link href="/rebates">How the VEU rebate works →</Link>
              <Link href="/tools/veu-rebate-estimator">Estimate yours →</Link>
              <Link href="/services/gas-plumbing/temporary-hot-water">Need hot water while you decide? →</Link>
            </p>
          </div>
          <dl className="kx__facts rpx__nums" data-anim="stagger">
            <div><dd>${REBATE_FACTS.maxStacked.toLocaleString()}</dd><dt>up to, owner-occupier, everything stacked</dt></div>
            <div><dd>${REBATE_FACTS.maxRental.toLocaleString()}</dd><dt>up to, rentals, no Solar Homes, everything else applies</dt></div>
            <div><dd>${REBATE_FACTS.ausMade}</dd><dt>Australian Made bonus, on the brands that qualify</dt></div>
            <div><dd>$0</dd><dt>for you to chase. We do the paperwork</dt></div>
          </dl>
        </>
      ),
    },
    {
      id: "faq", tab: "FAQs", cls: "pp__two",
      body: (
        <>
          <BkHead h="The questions we get asked {on the phone}.">
            Still want a human? <a href={`tel:${site.phoneE164}`} data-call-from="repair-faq">Call {site.phone}</a>.
          </BkHead>
          <div className="afaqs">
            {FAQS.map((f) => <details key={f.q} className="afaq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
          </div>
        </>
      ),
    },
  ];

  return (
    <BandPage>
      <JsonLd data={faqSchema(FAQS)} />
      <JsonLd data={crumbs} />
      <Crumbs trail={[{ name: "Repair or replace" }]} />
      <Hero
        eye="The question behind most of our call-outs"
        title={<>Repair it, or <em>replace it?</em></>}
        sub={<>Ten years is usually where the answer changes. Nobody in this trade wants to say out loud that sometimes the right answer is &ldquo;fix it and keep going&rdquo;, because there&rsquo;s no invoice in it. So here&rsquo;s the whole argument in public: how long these things actually last, where repair spend stops earning its keep, when we&rsquo;d tell you to repair instead, and why the VEU rebate is worth the most at exactly the moment your system hits the line.</>}
        ctas={false}
        facts={[
          { v: "10 yrs", k: "Where hot water tanks stop earning repairs" },
          { v: "10 yrs", k: "Where a gas heater becomes a safety question" },
          { v: "12 yrs", k: "Where a refrigerated compressor does" },
          { v: "In writing", k: "The repair price, so you know before you spend" },
        ]}
      >
        <div className="bxh__ctas">
          <Link href="/quote" className="abtn abtn--or abtn--flat">Get both prices side by side →</Link>
          <a href={`tel:${site.phoneE164}`} className="abtn abtn--line" data-call-from="repair-hero">Or just ask us</a>
        </div>
      </Hero>
      <Tabs list={bands} />
      <Bands list={bands} />
      {reviews.length > 0 && (
        <section id="reviews" className="revs">
          <div className="wrap revs__in">
            <div className="sechead" style={{ gap: 24 }}>
              <div className="sechead__t" style={{ gap: 14, maxWidth: 620 }}>
                <h2 className="h2">Reviews from households across the south-east.</h2>
              </div>
              <div className="revs__score">
                <span className="stars stars--ink" style={{ letterSpacing: 4 }} aria-hidden="true">★★★★★</span>
                <span><strong>{summary.value.toFixed(1)} / 5</strong> from {summary.count} Google reviews</span>
                <Link href="/reviews">Read all reviews →</Link>
              </div>
            </div>
            <div className="revs__cols">
              {cols.map((list, c) => (
                <div key={c} className="arevcol">
                  {/* Doubled so the upward scroll loops without a seam. The copy is hidden from screen readers. */}
                  <div className={`revtrack revtrack--${c}`}>
                    {[...list, ...list].map((r, i) => (
                      <article key={i} className="rev" aria-hidden={i >= list.length ? true : undefined}>
                        <span className="stars stars--ink" aria-hidden="true">★★★★★</span>
                        <h3>{r.title}</h3>
                        <p>&ldquo;{r.txt}&rdquo;</p>
                        <div className="rev__who">
                          <span aria-hidden="true">{r.a}</span>
                          <span className="rev__whot"><strong>{r.who}</strong><small>{r.what}</small></span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <EndCta
        title={<>Both numbers, on one page, with the <span>rebate already in them</span>.</>}
        text="Tell us what you've got and roughly how old it is. We'll come back with what the repair costs, what the replacement costs after the rebate, and which one we'd do if it were our house. If that's the repair, we'll say so."
        from="repair-cta"
      />
    </BandPage>
  );
}
