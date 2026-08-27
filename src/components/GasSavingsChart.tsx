/**
 * "What a higher star rating saves you" — the gas energy-rating savings
 * chart on the Brivis (gas ducted) page. A native, responsive bar chart
 * rather than an embedded image: 4 / 5 / 6 star against the yearly saving
 * over a 1-star heater. Figures are the standard Australian gas energy
 * rating comparison; the note keeps them honest as indicative.
 */
const BARS = [
  { star: 4, save: "13%", amount: "$339", pct: 42, tone: "g1" },
  { star: 5, save: "22%", amount: "$603", pct: 74, tone: "g2" },
  { star: 6, save: "30%", amount: "$814", pct: 100, tone: "g3" },
];

export function GasSavingsChart() {
  return (
    <section className="gsc">
      <div className="wrap">
        <div className="ds-section-head">
          <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> What the stars are worth</span>
          <h2>What a higher star rating saves you.</h2>
          <p>
            Every extra star on a gas ducted heater is less gas burnt for the same warmth. Here&rsquo;s the
            yearly saving against a 1-star heater &mdash; the gap that decides whether the efficient model
            pays for itself in a house you heat all winter.
          </p>
        </div>

        <div className="gsc__chart" role="img" aria-label="Yearly gas savings by star rating against a 1-star heater: 4-star saves 13% or $339, 5-star saves 22% or $603, 6-star saves 30% or $814">
          {BARS.map((b) => (
            <div key={b.star} className="gsc__col">
              <div className="gsc__bar-wrap">
                <div className={`gsc__bar gsc__bar--${b.tone}`} style={{ height: `${b.pct}%` }}>
                  <span className="gsc__save">SAVE {b.save}</span>
                  <span className="gsc__amt">{b.amount}</span>
                </div>
              </div>
              <div className="gsc__star">
                <strong>{b.star}</strong>
                <span>STAR</span>
              </div>
            </div>
          ))}
        </div>

        <p className="gsc__note">
          Estimated saving per year against a 1-star gas ducted heater on standard Melbourne usage. Indicative
          only &mdash; your saving depends on the house, the ductwork and how many hours you run it. We put the
          running-cost numbers next to the install price on the quote.
        </p>
      </div>
    </section>
  );
}
