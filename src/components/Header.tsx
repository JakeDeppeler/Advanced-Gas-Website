"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { site, services } from "@/lib/site";
import { Logo } from "./Logo";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40">
      {/* Announcement bar */}
      <div className="bg-navy-900 text-white">
        <div className="container flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
          <span className="hidden sm:inline text-navy-100">
            <span className="font-semibold text-cyan-300">VEU rebate approved</span>
            <span className="mx-2 text-navy-400">·</span>
            Heat pump hot water from $33
            <span className="mx-2 text-navy-400">·</span>
            6-year workmanship warranty
          </span>
          <a href={`tel:${site.phoneE164}`} className="font-semibold hover:text-cyan-300 transition">
            ☎ {site.phone}
          </a>
        </div>
      </div>

      {/* Main nav */}
      <div
        className={`bg-white/90 backdrop-blur-lg transition-shadow ${
          scrolled ? "shadow-[0_1px_0_0_rgb(14_22_56_/_0.06)]" : ""
        }`}
      >
        <div className="container flex items-center justify-between py-3.5">
          <Logo />

          <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-navy-700">
            <div className="group relative py-2">
              <button className="flex items-center gap-1 hover:text-cyan-600 transition">
                Services
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="transition group-hover:rotate-180">
                  <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="invisible absolute left-1/2 z-10 mt-2 w-[340px] -translate-x-1/2 rounded-2xl bg-white p-2 opacity-0 shadow-cardHover ring-1 ring-navy-50 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-y-0">
                {services.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/services/${s.slug}`}
                    className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-cyan-50/50 transition"
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-navy-900 text-xs font-black text-white">AG</span>
                    <span>
                      <span className="block font-semibold text-navy-900">{s.short}</span>
                      <span className="block text-xs text-navy-500">{s.blurb.slice(0, 70)}…</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <Link href="/service-areas" className="hover:text-cyan-600 transition">Service Areas</Link>
            <Link href="/about" className="hover:text-cyan-600 transition">About</Link>
            <Link href="/contact" className="hover:text-cyan-600 transition">Contact</Link>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <a href={`tel:${site.phoneE164}`} className="btn-ghost">{site.phone}</a>
            <Link href="/quote" className="btn-accent">Free Quote</Link>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden rounded-xl p-2.5 ring-1 ring-navy-100"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-navy-50 bg-white">
          <div className="container py-3 flex flex-col gap-1 text-sm">
            {services.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="rounded-lg px-2 py-2.5 font-medium hover:bg-cyan-50" onClick={() => setOpen(false)}>
                {s.short}
              </Link>
            ))}
            <Link href="/service-areas" className="rounded-lg px-2 py-2.5 font-medium hover:bg-cyan-50" onClick={() => setOpen(false)}>Service Areas</Link>
            <Link href="/about" className="rounded-lg px-2 py-2.5 font-medium hover:bg-cyan-50" onClick={() => setOpen(false)}>About</Link>
            <Link href="/contact" className="rounded-lg px-2 py-2.5 font-medium hover:bg-cyan-50" onClick={() => setOpen(false)}>Contact</Link>
            <Link href="/quote" className="btn-accent mt-2 w-full" onClick={() => setOpen(false)}>Get Free Quote</Link>
          </div>
        </div>
      )}
    </header>
  );
}
