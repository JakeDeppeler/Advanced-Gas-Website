export function StatsBar() {
  const stats = [
    { v: "2,400+", l: "Systems installed" },
    { v: "5.0★", l: "Google rating" },
    { v: "$33", l: "Heat pump from*" },
    { v: "<1hr", l: "Quote reply time" },
  ];
  return (
    <section className="bg-navy-900 text-white">
      <div className="container grid grid-cols-2 gap-y-10 py-14 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="text-center">
            <div className="font-display text-4xl font-extrabold tracking-tightest md:text-5xl">
              <span className="bg-gradient-to-b from-white to-cyan-300 bg-clip-text text-transparent">
                {s.v}
              </span>
            </div>
            <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-navy-300">
              {s.l}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
