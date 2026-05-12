import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Thanks — Your quote request is in",
  description: "We've received your request and will be in touch within 1 business hour.",
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  return (
    <section className="section">
      <div className="container max-w-2xl text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-3xl text-brand-700">
          ✓
        </div>
        <h1 className="mt-6 text-4xl font-extrabold">Got it — we're on it.</h1>
        <p className="mt-3 text-slate-600">
          Your quote request is in. One of our licensed team will text or call you within
          <strong> 1 business hour</strong> with a fixed price and the next available install slot.
        </p>
        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3">
          <a href={`tel:${site.phoneE164}`} className="btn-accent">
            📞 Or call us now: {site.phone}
          </a>
          <Link href="/" className="btn-ghost">Back to home</Link>
        </div>
        <p className="mt-10 text-xs text-slate-500">
          {/* Conversion tracking pixels go here — see README. */}
          Tracking pixel placeholder (Google Ads, Facebook, GA4 conversion).
        </p>
      </div>
    </section>
  );
}
