import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { services, site } from "@/lib/site";
import { serviceContent } from "@/lib/serviceContent";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import { systemDetail } from "@/lib/systemDetail";
import { seoMeta } from "@/lib/seo";
import { SystemView, FINDER_FOR } from "@/components/homepage/page/ServiceView";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";

/**
 * A page per system type — /services/gas-plumbing/gas-ducted and so on.
 *
 * These used to be fragments on the parent service page, which meant the
 * header's "Split system" and "Multi-head" links landed a customer on the
 * same page twice. Each system now has somewhere of its own to rank and
 * somewhere of its own to send people.
 *
 * Content lives on serviceContent[svc].systems[] — a system without an
 * `intro` is treated as not ready for its own page and 404s rather than
 * shipping a thin one.
 */

function find(slug: string, systemId: string) {
  const content = serviceContent[slug];
  const svc = services.find((s) => s.slug === slug);
  const system = content?.systems?.find((x) => x.id === systemId);
  if (!content || !svc || !system?.intro) return null;
  return { content, svc, system };
}

export function generateStaticParams() {
  return Object.entries(serviceContent).flatMap(([slug, c]) =>
    (c.systems ?? [])
      .filter((s) => s.intro)
      .map((s) => ({ slug, system: s.id })),
  );
}

export function generateMetadata({
  params,
}: {
  params: { slug: string; system: string };
}): Metadata {
  const found = find(params.slug, params.system);
  if (!found) notFound();
  const { system } = found;
  return seoMeta({
    title: system.seoTitle ?? `${system.label}, Melbourne South-East`,
    description: system.seoDescription ?? system.blurb,
    canonical: `/services/${params.slug}/${params.system}`,
  });
}

export default function SystemPage({ params }: { params: { slug: string; system: string } }) {
  const found = find(params.slug, params.system);
  if (!found) notFound();
  const { svc, system } = found;

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Services", url: `${site.url}/services` },
    { name: svc.short, url: `${site.url}/services/${svc.slug}` },
    { name: system.label, url: `${site.url}/services/${svc.slug}/${system.id}` },
  ]);

  return (
    <>
      <SystemView slug={svc.slug} name={svc.short} s={system} d={systemDetail(svc.slug, system.id)} finder={FINDER_FOR[`${svc.slug}/${system.id}`]} />
      <Script id={`ld-crumbs-${svc.slug}-${system.id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      {system.faqs && system.faqs.length > 0 && (
        <Script id={`ld-faq-${svc.slug}-${system.id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(system.faqs)) }} />
      )}
    </>
  );
}
