import Link from "next/link";
import Image from "next/image";

/**
 * The four ways we make hot water, as a chooser.
 *
 * Lives here rather than on one page because it belongs on more than one: the
 * hot water hub opens with it, and the heat pump service page needs the same
 * four options in the same words. Two copies of a chooser is how two pages
 * end up offering different things.
 *
 * `heading` so the page above it can set the question it is answering.
 */
export function HotWaterPicker({
  heading = "Four ways to make it. Which suits your place?",
  eyebrow = "Hot water",
}: { heading?: string; eyebrow?: string }) {
  return (
    <section className="hp-pick">
      <div className="wrap">
        <div className="ds-section-head ds-section-head--center">
          <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> {eyebrow}</span>
          <h2>{heading}</h2>
        </div>
        <div className="hp-pick__grid">
          <Link className="hp-pick__card" href="/services/heat-pump-installation/all-in-one">
            <span className="hp-pick__photo">
              <Image
                src="/Reclaim-EcoAIO-Products-NewLogo-600PX-400x631-1.webp"
                alt="An all-in-one heat pump, with the compressor sitting on top of the tank"
                fill
                sizes="(max-width: 900px) 50vw, 260px"
                style={{ objectFit: "contain" }}
              />
            </span>
            <span className="hp-pick__body">
              <strong>All-in-one</strong>
              <span className="hp-pick__d">Tank and compressor in the one unit. Goes where the old tank was.</span>
              <span className="hp-pick__meta">From $2,610 installed</span>
            </span>
            <span className="hp-pick__go" aria-hidden="true">&rarr;</span>
          </Link>

          <Link className="hp-pick__card" href="/services/heat-pump-installation/split-heat-pump">
            <span className="hp-pick__photo">
              <Image
                src="/reclaim-split-back.webp"
                alt="A split heat pump we installed: the tank against the wall with the compressor as a separate outdoor unit beside it"
                fill
                sizes="(max-width: 900px) 50vw, 260px"
                style={{ objectFit: "cover", objectPosition: "center 62%" }}
              />
            </span>
            <span className="hp-pick__body">
              <strong>Split system</strong>
              <span className="hp-pick__d">Compressor outside, on its own. Quieter at the tank and better in a cold snap.</span>
              <span className="hp-pick__meta">From $5,340 installed</span>
            </span>
            <span className="hp-pick__go" aria-hidden="true">&rarr;</span>
          </Link>

          <Link className="hp-pick__card" href="/services/gas-plumbing/continuous-flow">
            <span className="hp-pick__photo">
              <Image
                src="/thermann-contineues-flow-standing-back.webp"
                alt="A Thermann gas continuous flow unit we installed on an outside brick wall"
                fill
                sizes="(max-width: 900px) 50vw, 260px"
                style={{ objectFit: "cover", objectPosition: "center 45%" }}
              />
            </span>
            <span className="hp-pick__body">
              <strong>Gas continuous flow</strong>
              <span className="hp-pick__d">No tank at all, on an outside wall. Never runs out, and nothing is kept hot waiting for you.</span>
              <span className="hp-pick__meta">No rebate on gas</span>
            </span>
            <span className="hp-pick__go" aria-hidden="true">&rarr;</span>
          </Link>

          <Link className="hp-pick__card" href="/services/gas-plumbing">
            <span className="hp-pick__photo">
              <Image
                src="/Web_1200x900-Thermann-4-Star-Hot-Water-Unit-135ltr-Natural-Gas.jpg"
                alt="A Thermann gas storage hot water tank"
                fill
                sizes="(max-width: 900px) 50vw, 260px"
                style={{ objectFit: "contain" }}
              />
            </span>
            <span className="hp-pick__body">
              <strong>Gas storage</strong>
              <span className="hp-pick__d">A tank kept hot on gas. The straight swap when a tank has died and nothing else about the house is changing.</span>
              <span className="hp-pick__meta">No rebate on gas</span>
            </span>
            <span className="hp-pick__go" aria-hidden="true">&rarr;</span>
          </Link>

          <Link className="hp-pick__card hp-pick__card--ask" href="/quote">
            <span className="hp-pick__body">
              <strong>Not sure which one?</strong>
              <span className="hp-pick__d">
                Tell us how many people are in the house and where the old tank sits. We&rsquo;ll size it and put
                it in writing.
              </span>
              <span className="hp-pick__meta">Free, no obligation</span>
            </span>
            <span className="hp-pick__go" aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
