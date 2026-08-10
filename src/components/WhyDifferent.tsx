import Link from "next/link";
import type { ServiceContent } from "@/lib/serviceContent";

/**
 * "Why this gear, and why us" for service pages.
 *
 * The rest of a service page is specification — models, prices, steps.
 * None of it answers the question someone has after their third quote,
 * which is why this crew and this equipment rather than the cheaper one.
 *
 * The main argument is per-service (serviceContent.whyThese), because
 * the case for Mitsubishi in a bedroom wall is a different case from
 * Reclaim on a hot water pad. The four points underneath are the ones
 * that hold whatever the job is, so they live here rather than being
 * copy-pasted into every service.
 */

const HOUSE_RULES = [
  {
    t: "We only install what we'd put in our own homes",
    d: "That's the whole brand list. If a unit has a reputation for warranty claims or parts you can't get in a hurry, it doesn't go on the quote, no matter what margin is on it.",
  },
  {
    t: "The bloke who quotes it is the bloke who installs it",
    d: "No sales rep, no subcontractor you've never met turning up on the day. Nothing gets lost between the quote and the install because it's the same person.",
  },
  {
    t: "Finished properly, not just working",
    d: "Drop sheets down before we start. Conduit colour-matched, brackets level, pipework straight. Old unit taken away, driveway swept. A system that works is the minimum.",
  },
  {
    t: "We'd rather talk you out of it",
    d: "If your existing system has five good years left, we'll tell you and service it instead. Selling someone a system they didn't need is how you get one job instead of a family's worth.",
  },
];

export function WhyDifferent({
  service,
  content,
}: {
  service: string;
  content?: ServiceContent["whyThese"];
}) {
  const heading = content?.heading ?? `Anyone can fit a ${service}. Here's what we do differently.`;
  const blurb =
    content?.blurb ??
    "You'll get three quotes and two of them will look the same on paper. This is the part that isn't on the paper.";
  const points = content?.points ?? [];

  return (
    <section className="whydiff">
      <div className="wrap">
        <div className="ds-section-head ds-section-head--hl">
          <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Why this gear</span>
          <h2>{heading}</h2>
          <p>{blurb}</p>
        </div>

        {points.length > 0 && (
          <div className="whydiff__grid">
            {points.map((p, i) => (
              <div key={p.t} className="whydiff__card">
                <span className="whydiff__num" aria-hidden="true">/{String(i + 1).padStart(2, "0")}</span>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        )}

        <div className="whydiff__rules">
          <h3 className="whydiff__rules-lbl">However we quote it, these don&rsquo;t change</h3>
          <div className="whydiff__rules-grid">
            {HOUSE_RULES.map((p) => (
              <div key={p.t} className="whydiff__rule">
                <h4>{p.t}</h4>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="whydiff__foot">
          <p>
            Family-owned, run out of Pakenham since 2014. Same family answering the
            phone, doing the quote and standing behind the work.
          </p>
          <Link href="/about" className="ds-btn ds-btn--ghost ds-btn--sm">
            Meet the team →
          </Link>
        </div>
      </div>
    </section>
  );
}
