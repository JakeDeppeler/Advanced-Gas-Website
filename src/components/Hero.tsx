import Link from "next/link";
import { site } from "@/lib/site";

export function Hero({
  eyebrow = "Melbourne · Licensed plumbing & refrigeration",
  title,
  subtitle,
  highlights,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  highlights: string[];
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white">
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="container relative grid gap-10 py-16 md:grid-cols-2 md:py-24">
        <div>
          <span className="eyebrow bg-white/15 text-white">{eyebrow}</span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-brand-50">{subtitle}</p>
          <ul className="mt-6 grid gap-2 text-sm">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-500 text-slate-900 text-xs font-black">✓</span>
                {h}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/quote" className="btn-accent">Get my free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
              📞 {site.phone}
            </a>
          </div>
          <p className="mt-3 text-xs text-brand-100">Same-day quotes · No-obligation · Replies within 1 business hour</p>
        </div>

        <div className="relative">
          <div className="rounded-2xl bg-white/10 p-1 ring-1 ring-white/20 backdrop-blur">
            <div className="rounded-xl bg-white p-6 text-slate-800 shadow-2xl">
              <div className="flex items-center gap-2 text-amber-500">
                {"★★★★★".split("").map((s, i) => <span key={i}>{s}</span>)}
                <span className="text-xs font-semibold text-slate-500">5.0 · 200+ Google reviews</span>
              </div>
              <p className="mt-3 italic text-slate-700">
                "Quoted Monday, installed Thursday. Sparky, plumber and refrigeration guy turned up on time, cleaned up after themselves. Couldn't fault them."
              </p>
              <p className="mt-2 text-sm font-semibold">— Sarah K., Richmond VIC</p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                <Badge top="6yr" bot="Warranty" />
                <Badge top="$33*" bot="Heat pump w/ VEU" />
                <Badge top="<1hr" bot="Quote reply" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Badge({ top, bot }: { top: string; bot: string }) {
  return (
    <div className="rounded-lg bg-brand-50 px-2 py-2">
      <div className="font-extrabold text-brand-700">{top}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{bot}</div>
    </div>
  );
}
