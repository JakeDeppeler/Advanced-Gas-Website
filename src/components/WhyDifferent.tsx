import Link from "next/link";

/**
 * "Why us" for service pages.
 *
 * The rest of a service page is specification — models, prices, steps.
 * None of it answers the question someone actually has after their third
 * quote, which is why this crew rather than the cheaper one. That's what
 * this section is for, and the answer is the standard of the work rather
 * than a list of badges.
 *
 * Deliberately concrete. "We care about quality" is what everyone
 * writes; "we don't leave until the pipework is straight and the
 * driveway is swept" is something a customer can check.
 */
export function WhyDifferent({ service }: { service: string }) {
  const points = [
    {
      t: "We only install what we'd put in our own homes",
      d: `That's the whole brand list. If a unit has a reputation for warranty claims or parts you can't get in a hurry, it doesn't go on the quote — no matter what margin is on it. We're the ones who have to come back and fix it, and we live in the same suburbs as you do.`,
    },
    {
      t: "The bloke who quotes it is the bloke who installs it",
      d: `No sales rep, no subcontractor you've never met turning up on the day. Whoever walks your house and writes the number is on the tools when the job happens, so nothing gets lost between the quote and the install.`,
    },
    {
      t: "Finished properly, not just working",
      d: `Drop sheets down before we start. Dust extraction on the wall cut. Conduit outside colour-matched to your cladding, brackets level, pipework straight. Old unit taken away, driveway swept. A system that works is the minimum — the finish is the part you look at every day.`,
    },
    {
      t: "We'd rather talk you out of it",
      d: `If your existing system has five good years left, we'll tell you and we'll service it instead. If a smaller unit does the job, we quote the smaller unit. Selling someone a system they didn't need is how you get one job instead of a family's worth.`,
    },
    {
      t: "Sized on the numbers, not a guess",
      d: `Room-by-room heat load for aircon, actual draw-off for hot water. Oversizing is the easy way out — it costs you more up front and more every quarter after that. We do the calculation and show you it.`,
    },
    {
      t: "Paperwork done before you have to ask",
      d: `Compliance certificate emailed within 24 hours. Warranty registered in your name, not ours. Rebate paperwork filled in and lodged by us. You sign once and it's handled.`,
    },
  ];

  return (
    <section className="whydiff">
      <div className="wrap">
        <div className="ds-section-head">
          <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Why us</span>
          <h2>Anyone can fit a {service}. Here&rsquo;s what we do differently.</h2>
          <p>
            You&rsquo;ll get three quotes and two of them will look the same on paper.
            This is the part that isn&rsquo;t on the paper.
          </p>
        </div>

        <div className="whydiff__grid">
          {points.map((p, i) => (
            <div key={p.t} className="whydiff__card">
              <span className="whydiff__num" aria-hidden="true">/{String(i + 1).padStart(2, "0")}</span>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
            </div>
          ))}
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
