import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Thanks — your quote request is in",
  description: "We've received your request and will be in touch within 1 business hour.",
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  return (
    <section className="section">
      <div className="container max-w-2xl text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-navy-900 text-white shadow-glow">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <h1 className="mt-8 text-balance font-display text-4xl font-extrabold leading-[1.05] md:text-5xl">
          Got it — we're on it.
        </h1>
        <p className="mt-4 text-lg text-navy-600">
          Your quote request is in. One of our licensed team will text or call you within
          <strong className="text-navy-900"> 1 business hour</strong> with a fixed price and the next available install slot.
        </p>
        <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-3">
          <a href={`tel:${site.phoneE164}`} className="btn-accent">
            ☎ Or call us now: {site.phone}
          </a>
          <Link href="/" className="btn-ghost">Back to home</Link>
        </div>
        <p className="mt-12 text-xs text-navy-400">
          {/* Conversion tracking pixels go here — see README. */}
          Tracking pixel placeholder (Google Ads, Meta, GA4 conversion).
        </p>
      </div>
    </section>
  );
}
