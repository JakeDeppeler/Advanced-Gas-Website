import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { site } from "@/lib/site";
import { seoMeta } from "@/lib/seo";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import { CATS, findSystem, money, PRODUCT_FAQS } from "@/lib/homepage/data";
import { SYS_INTRO } from "@/lib/homepage/learn";
import { SystemPage } from "@/components/homepage/page/SystemPage";
import { HomeHeader } from "@/components/homepage/HomeHeader";
import { SiteModeStrip } from "@/components/Header";
import "@/components/homepage/homepage.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";

/** /find/split-system and the rest: a page about the kind of system, above its three product pages. */

type Params = { system: string };

export const dynamicParams = false;
export function generateStaticParams() {
  return CATS.flatMap((c) => c.systems.map((s) => ({ system: s.slug })));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const ref = findSystem(params.system);
  if (!ref) notFound();
  const { sys } = ref;
  const prices = sys.tiers.map((t) => t.price).filter((p): p is number => typeof p === "number");
  const from = prices.length ? ` From ${money(Math.min(...prices))} installed.` : "";
  return seoMeta({
    title: `${sys.label}: how it works, pros and cons, and the options`,
    description: `${SYS_INTRO[sys.slug] ?? sys.sub}${from} Installed by our own crew, 6 years on our workmanship.`,
    canonical: `/find/${sys.slug}`,
  });
}

export default function FindSystemPage({ params }: { params: Params }) {
  const ref = findSystem(params.system);
  if (!ref) notFound();
  const { cat, sys } = ref;
  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: cat.label, url: `${site.url}/?find=${cat.id}` },
    { name: sys.label, url: `${site.url}/find/${sys.slug}` },
  ]);
  return (
    <>
      {/* /find/* draws its own header: the layout's is held back for the homepage and product pages. */}
      <SiteModeStrip tabs={false} />
      <div className="ag ag--flat" style={{ display: "contents" }}><HomeHeader variant="flat" /></div>
      <SystemPage cat={cat} sys={sys} />
      <Script id="ld-system-crumbs" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Script id="ld-system-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(PRODUCT_FAQS[sys.faq])) }} />
    </>
  );
}
