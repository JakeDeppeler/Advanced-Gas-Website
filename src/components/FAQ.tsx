import Script from "next/script";
import { faqSchema } from "@/lib/schema";

export function FAQ({ items, id = "faq" }: { items: { q: string; a: string }[]; id?: string }) {
  return (
    <section className="section" id={id}>
      <div className="container max-w-3xl">
        <span className="eyebrow">FAQs</span>
        <h2 className="mt-3 text-3xl font-bold md:text-4xl">Questions our Melbourne customers ask</h2>
        <div className="mt-8 divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-100">
          {items.map((f, i) => (
            <details key={i} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-slate-900">
                {f.q}
                <span className="text-brand-600 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-slate-600 leading-relaxed">{f.a}</p>
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
