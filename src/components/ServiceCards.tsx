import Link from "next/link";
import { services } from "@/lib/site";

const ICONS: Record<string, string> = {
  "air-conditioning-installation": "snow",
  "heat-pump-installation": "flame",
  "aircon-servicing-repairs": "wrench",
  "gas-plumbing": "drop",
};

export function ServiceCards() {
  return (
    <section className="section">
      <div className="container">
        <div className="max-w-2xl">
          <span className="eyebrow">What we install</span>
          <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] md:text-5xl">
            One licensed team for heating, cooling and hot water.
          </h2>
          <p className="mt-5 max-w-xl text-lg text-navy-600">
            Aircon, heat pump hot water and gas plumbing under one roof.
            No third-party contractors. No finger-pointing. No surprise add-ons.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="card card-hover group"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <ServiceIcon name={ICONS[s.slug] ?? "snow"} />
              <h3 className="mt-5 text-lg font-bold leading-tight">{s.short}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">{s.blurb}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-cyan-600 transition group-hover:gap-2">
                Learn more <span aria-hidden>→</span>
              </span>
              <div className="absolute inset-x-7 -bottom-px h-0.5 origin-left scale-x-0 bg-gradient-to-r from-cyan-400 to-flame-500 transition-transform duration-500 group-hover:scale-x-100" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceIcon({ name }: { name: string }) {
  const wrap = "grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/10 to-navy-900/5 text-cyan-600 ring-1 ring-cyan-100";
  switch (name) {
    case "snow":
      return (
        <span className={wrap}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07L19.07 4.93" />
          </svg>
        </span>
      );
    case "flame":
      return (
        <span className={wrap + " from-flame-500/10 to-flame-500/5 text-flame-500 ring-flame-100"}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
          </svg>
        </span>
      );
    case "wrench":
      return (
        <span className={wrap}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
          </svg>
        </span>
      );
    case "drop":
      return (
        <span className={wrap}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
          </svg>
        </span>
      );
    default:
      return null;
  }
}
