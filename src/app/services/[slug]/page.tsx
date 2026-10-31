import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { services, site } from "@/lib/site";
import { serviceContent } from "@/lib/serviceContent";
import { breadcrumbSchema, serviceSchema, faqSchema } from "@/lib/schema";
import { seoMeta } from "@/lib/seo";
import { ServiceView } from "@/components/homepage/page/ServiceView";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";

/**
 * A service page, in the redesign. All its words, prices and photos come
 * from lib/serviceContent.ts as before; the page that laid them out (with
 * the advisor, Instagram strip and before-and-after) is in git history.
 */

const CHOOSE_HEAD: Record<string, { h2: string; lede: string }> = {
  "air-conditioning-installation": {
    h2: "Four shapes. One of them is your house.",
    lede:
      "Before anyone talks model numbers, the choice is what shape the system takes: one room or the whole house, on the wall or in the roof, refrigerated or evaporative. Everything else follows from that.",
  },
  "heat-pump-installation": {
    h2: "One shell, or two pieces?",
    lede:
      "That's genuinely the whole decision. All-in-one is a single unit where the old tank stood. Split puts the compressor outside and the tank against the wall, which is what buys you the cold-weather performance and the tank options.",
  },
  "aircon-servicing-repairs": {
    h2: "What are we servicing?",
    lede:
      "Refrigerated and evaporative are different machines with different service intervals, different consumables and different prices. Pick the one on your roof.",
  },
  "gas-plumbing": {
    h2: "Heating, hot water, or the gas itself.",
    lede:
      "Three trades on one licence, so this page covers all of them. Start with the one that brought you here. Each has its own page with the models, the prices and the honest limits.",
  },
};

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const content = serviceContent[params.slug];
  if (!content) notFound();
  return seoMeta({
    title: content.metaTitle,
    description: content.metaDescription,
    canonical: `/services/${params.slug}`,
  });
}

export default function ServicePage({ params }: { params: { slug: string } }) {
  const content = serviceContent[params.slug];
  const svc = services.find((s) => s.slug === params.slug);
  if (!content || !svc) notFound();

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Services", url: `${site.url}/services` },
    { name: svc.short, url: `${site.url}/services/${params.slug}` },
  ]);

  return (
    <>
      <ServiceView slug={params.slug} name={svc.short} c={content} choose={CHOOSE_HEAD[params.slug]} />
      <Script id={`ld-crumbs-${params.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Script id={`ld-svc-${params.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema(svc.slug)) }} />
      {content.faqs.length > 0 && <Script id={`ld-faq-${params.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(content.faqs)) }} />}
    </>
  );
}
