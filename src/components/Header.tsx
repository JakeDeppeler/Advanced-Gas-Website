"use client";

import Link from "next/link";
import { useState } from "react";
import { site, services } from "@/lib/site";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="bg-brand-900 text-white text-sm">
        <div className="container flex flex-wrap items-center justify-between gap-2 py-1.5">
          <span className="hidden sm:inline">
            Licensed plumbing &amp; refrigeration · Melbourne-wide · 6-year warranty
          </span>
          <a
            href={`tel:${site.phoneE164}`}
            className="font-semibold hover:text-accent-500"
          >
            Call {site.phone}
          </a>
        </div>
      </div>

      <div className="container flex items-center justify-between py-3">
        <Link href="/" className="flex items-center gap-2" aria-label={`${site.name} home`}>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 font-black text-white">
            AG
          </span>
          <span className="text-lg font-bold text-slate-900">{site.name}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
          <div className="group relative">
            <button className="hover:text-brand-700">Services</button>
            <div className="invisible absolute left-1/2 z-10 mt-2 w-72 -translate-x-1/2 rounded-xl bg-white p-2 opacity-0 shadow-lg ring-1 ring-slate-100 transition group-hover:visible group-hover:opacity-100">
              {services.map((s) => (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  className="block rounded-lg px-3 py-2 hover:bg-brand-50"
                >
                  <div className="font-semibold text-slate-900">{s.short}</div>
                  <div className="text-xs text-slate-500">{s.blurb.slice(0, 70)}…</div>
                </Link>
              ))}
            </div>
          </div>
          <Link href="/service-areas" className="hover:text-brand-700">Service Areas</Link>
          <Link href="/about" className="hover:text-brand-700">About</Link>
          <Link href="/contact" className="hover:text-brand-700">Contact</Link>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <a href={`tel:${site.phoneE164}`} className="btn-ghost">{site.phone}</a>
          <Link href="/quote" className="btn-accent">Free Quote</Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden rounded-lg p-2 ring-1 ring-slate-200"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white">
          <div className="container py-3 flex flex-col gap-1 text-sm">
            {services.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="py-2 font-medium" onClick={() => setOpen(false)}>
                {s.short}
              </Link>
            ))}
            <Link href="/service-areas" className="py-2 font-medium" onClick={() => setOpen(false)}>Service Areas</Link>
            <Link href="/about" className="py-2 font-medium" onClick={() => setOpen(false)}>About</Link>
            <Link href="/contact" className="py-2 font-medium" onClick={() => setOpen(false)}>Contact</Link>
            <Link href="/quote" className="btn-accent mt-2" onClick={() => setOpen(false)}>Get Free Quote</Link>
          </div>
        </div>
      )}
    </header>
  );
}
