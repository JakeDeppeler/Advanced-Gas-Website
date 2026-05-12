export function BrandStrip() {
  const brands = [
    "Daikin",
    "Mitsubishi Electric",
    "Fujitsu",
    "Reclaim Energy",
    "Sanden",
    "iStore",
    "Rheem",
    "Rinnai",
  ];
  return (
    <section className="border-y border-navy-50 bg-white py-10">
      <div className="container">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-navy-400">
          Approved installer · Tier-1 brands only
        </p>
        <div className="mt-6 grid grid-cols-2 items-center justify-items-center gap-x-6 gap-y-4 text-navy-400 sm:grid-cols-4 lg:grid-cols-8">
          {brands.map((b) => (
            <span
              key={b}
              className="font-display text-base font-bold tracking-tight md:text-lg transition hover:text-navy-700"
              aria-label={b}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
