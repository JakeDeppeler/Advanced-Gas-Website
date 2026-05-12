export function WhyUs() {
  const items = [
    {
      t: "Fixed upfront pricing",
      d: "Detailed written quote before we lift a tool. No price-creep, no surprise call-out fees.",
    },
    {
      t: "Same-week installs",
      d: "Most aircon and heat pump jobs scheduled within 5-7 days. Emergencies same-day.",
    },
    {
      t: "VEU rebate done for you",
      d: "We handle the Victorian Energy Upgrades paperwork so your heat pump install can cost as little as $33*.",
    },
    {
      t: "6-year workmanship warranty",
      d: "Triple the industry standard. Manufacturer warranty on top — up to 7 years on premium units.",
    },
    {
      t: "One licensed team",
      d: "Plumbers, gas fitters and refrigeration techs in-house. No coordinating between three trades.",
    },
    {
      t: "Clean-up guarantee",
      d: "Drop sheets, dust mats and a full vacuum before we leave. You won't know we were there.",
    },
  ];
  return (
    <section className="section bg-slate-50">
      <div className="container">
        <div className="max-w-2xl">
          <span className="eyebrow">Why Advanced Gas</span>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Melbourne homeowners choose us because we make it simple
          </h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <div key={i.t} className="card">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent-500 text-slate-900 font-black">✓</div>
              <h3 className="mt-4 text-lg font-bold">{i.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{i.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
