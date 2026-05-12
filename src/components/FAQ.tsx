import Script from "next/script";
import { faqSchema } from "@/lib/schema";

export function FAQ({ items, id = "faq" }: { items: { q: string; a: string }[]; id?: string }) {
  return (
    <section className="section" id={id}>
      <div className="container max-w-3xl">
        <span className="eyebrow">Frequently asked</span>
        <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] md:text-5xl">
          Answers our local customers ask.
        </h2>

        <div className="mt-10 divide-y divide-navy-50 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-navy-50">
          {items.map((f, i) => (
            <details key={i} className="group [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-6 p-6 transition hover:bg-cyan-50/30">
                <span className="font-display text-[17px] font-semibold text-navy-900">{f.q}</span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-50 text-cyan-600 transition group-open:rotate-45 group-open:bg-cyan-100">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M7 2v10M2 7h10" />
                  </svg>
                </span>
              </summary>
              <div className="px-6 pb-6 -mt-1">
                <p className="text-[15px] leading-relaxed text-navy-600">{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
      <Script
        id={`ld-faq-${id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(items)) }}
      />
    </section>
  );
}
