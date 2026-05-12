export function ProcessSteps() {
  const steps = [
    { n: 1, t: "Free quote in 60 seconds", d: "Tell us what you need and where. We reply within 1 business hour with a fixed price." },
    { n: 2, t: "On-site assessment", d: "Licensed tech inspects the site, confirms scope and recommends the right system for your home." },
    { n: 3, t: "Same-week installation", d: "Our in-house team installs, commissions and walks you through your new system." },
    { n: 4, t: "Rebates + warranty", d: "We lodge VEU rebates and register your manufacturer + 6-year workmanship warranty." },
  ];
  return (
    <section className="section">
      <div className="container">
        <div className="max-w-2xl">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] md:text-5xl">
            From quote to installed in under 7 days.
          </h2>
        </div>

        <ol className="relative mt-14 grid gap-6 md:grid-cols-4">
          {/* Connector line */}
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-cyan-200 via-cyan-400 to-flame-500 md:block" aria-hidden />
          {steps.map((s) => (
            <li key={s.n} className="relative">
              <div className="relative z-10 mx-auto grid h-14 w-14 place-items-center rounded-full bg-white font-display text-xl font-extrabold text-navy-900 shadow-card ring-4 ring-white">
                <span className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-navy-900 opacity-10" />
                {s.n}
              </div>
              <div className="mt-5 text-center">
                <h3 className="text-base font-bold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
