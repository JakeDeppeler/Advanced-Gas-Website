export function WhyUs() {
  const items = [
    { t: "Fixed upfront pricing", d: "Detailed written quote before we lift a tool. No price-creep, no surprise call-out fees." },
    { t: "Same-week installs", d: "Most aircon and heat pump jobs scheduled within 5–7 days. Emergencies same-day." },
    { t: "VEU rebate done for you", d: "We handle the Victorian Energy Upgrades paperwork — heat pump installs from $33." },
    { t: "6-year workmanship warranty", d: "Triple the industry standard. Manufacturer warranty on top — up to 7 years on premium units." },
    { t: "One licensed team", d: "Plumbers, gas fitters and refrigeration techs in-house. No coordinating between three trades." },
    { t: "Clean-up guarantee", d: "Drop sheets, dust mats and a full vacuum before we leave. You won't know we were there." },
  ];
  return (
    <section className="section bg-gradient-to-b from-cyan-50/30 to-white">
      <div className="container">
        <div className="grid items-end gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <span className="eyebrow">Why Advanced Gas &amp; Aircon</span>
            <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] md:text-5xl">
              We make heating, cooling and hot water <span className="gradient-text">simple</span>.
            </h2>
          </div>
          <p className="md:col-span-5 text-lg text-navy-600">
            Six reasons homeowners across South-East Vic and Gippsland keep choosing us
            for the work that actually matters in their home.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((i, idx) => (
            <div key={i.t} className="card card-hover">
              <span className="absolute -left-2 -top-2 font-display text-6xl font-extrabold text-navy-100/80 select-none">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="relative">
                <h3 className="text-lg font-bold">{i.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-navy-600">{i.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
