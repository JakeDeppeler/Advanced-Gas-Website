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
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">From quote to installed in under 7 days</h2>
        </div>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="card">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 font-bold text-white">{s.n}</div>
              <h3 className="mt-3 text-lg font-bold">{s.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
