import Link from "next/link";
import { site } from "@/lib/site";
import { LogoMark } from "./Logo";

export function Hero({
  eyebrow = "South-East Vic & Gippsland · Licensed plumbing & refrigeration",
  title,
  titleAccent,
  subtitle,
  highlights,
}: {
  eyebrow?: string;
  title: string;
  titleAccent?: string;
  subtitle: string;
  highlights: string[];
}) {
  return (
    <section className="relative isolate overflow-hidden bg-navy-900 text-white">
      {/* Layered background */}
      <div className="absolute inset-0 bg-hero-glow" aria-hidden />
      <div className="absolute inset-0 bg-hero-grid [background-size:32px_32px]" aria-hidden />
      <div
        className="absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-cyan-400/15 blur-[120px]"
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-flame-500/10 blur-[120px]"
        aria-hidden
      />

      <div className="relative container grid items-center gap-12 py-20 md:grid-cols-12 md:py-28">
        <div className="md:col-span-7 animate-fade-up">
          <span className="eyebrow-dark">{eyebrow}</span>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tightest text-balance md:text-6xl lg:text-[68px]">
            {title}{" "}
            {titleAccent && (
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-cyan-300 via-cyan-400 to-cyan-300 bg-clip-text text-transparent">
                  {titleAccent}
                </span>
              </span>
            )}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-100 md:text-xl">
            {subtitle}
          </p>

          <ul className="mt-8 grid gap-3 text-[15px] sm:grid-cols-2">
            {highlights.map((h) => (
              <li key={h} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cyan-400 text-navy-900">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-navy-100">{h}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/quote" className="btn-accent">
              Get my free quote
              <span aria-hidden>→</span>
            </Link>
            <a href={`tel:${site.phoneE164}`} className="btn-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {site.phone}
            </a>
          </div>
          <p className="mt-4 text-xs text-navy-300">
            <span className="relative inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              Replies within 1 business hour · No-obligation · Fixed pricing
            </span>
          </p>
        </div>

        {/* Floating trust card */}
        <div className="md:col-span-5 animate-fade-up [animation-delay:120ms]">
          <div className="relative">
            {/* Glow */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-cyan-400/30 via-transparent to-flame-500/20 blur-2xl" aria-hidden />

            <div className="relative rounded-3xl bg-white/[0.04] p-1.5 ring-1 ring-white/15 backdrop-blur-xl">
              <div className="rounded-[20px] bg-white p-7 text-navy-900 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-flame-500">
                    {"★★★★★".split("").map((s, i) => (
                      <span key={i} className="text-lg">{s}</span>
                    ))}
                  </div>
                  <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-cyan-700">
                    5.0 Google
                  </span>
                </div>
                <p className="mt-4 text-[15px] leading-relaxed text-navy-700">
                  "Quoted Monday, installed Thursday. Plumber and refrigeration tech turned up
                  on time, cleaned up after themselves. Couldn't fault them."
                </p>
                <div className="mt-5 flex items-center gap-3 border-t border-navy-50 pt-5">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-navy-900 font-bold text-white">
                    SK
                  </div>
                  <div>
                    <div className="font-semibold text-navy-900">Sarah K.</div>
                    <div className="text-xs text-navy-500">Heat pump install · Pakenham</div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <Badge top="$33*" bot="VEU heat pump" />
                  <Badge top="6yr" bot="Warranty" />
                  <Badge top="<1hr" bot="Reply time" />
                </div>
              </div>
            </div>

            {/* Floating sticker */}
            <div className="absolute -bottom-4 -left-4 hidden rotate-[-6deg] rounded-2xl bg-flame-500 px-4 py-2.5 text-sm font-bold text-white shadow-cardHover md:block">
              <div className="flex items-center gap-2">
                <LogoMark className="h-7 w-7" />
                <span className="leading-tight">
                  <span className="block text-[10px] font-medium uppercase tracking-wider text-white/80">
                    VEU Approved
                  </span>
                  <span>Heat pumps from $33</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="relative -mb-px">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="block h-12 w-full text-white" aria-hidden>
          <path d="M0 80V40c240 30 480 30 720 0s480-30 720 0v40H0z" fill="currentColor" />
        </svg>
      </div>
    </section>
  );
}

function Badge({ top, bot }: { top: string; bot: string }) {
  return (
    <div className="rounded-xl bg-gradient-to-b from-cyan-50 to-white p-2.5 text-center ring-1 ring-cyan-100">
      <div className="font-display text-lg font-extrabold text-navy-900">{top}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-navy-500">{bot}</div>
    </div>
  );
}
