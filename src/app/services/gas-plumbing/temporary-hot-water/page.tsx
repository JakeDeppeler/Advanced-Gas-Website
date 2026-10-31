import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { site } from "@/lib/site";
import { faqSchema, breadcrumbSchema } from "@/lib/schema";
import { absoluteTitle, metaDescription } from "@/lib/seo";
import { serviceContent } from "@/lib/serviceContent";
import { systemDetail } from "@/lib/systemDetail";
import { SystemView } from "@/components/homepage/page/ServiceView";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";

/**
 * Temporary hot water hire, on its own route so its search title and
 * keywords stay; the page itself is the redesign's system page, reading the
 * same serviceContent and systemDetail entries as before.
 */

const SERVICE = "gas-plumbing";
const SYSTEM = "temporary-hot-water";

const sys = serviceContent[SERVICE]?.systems?.find((x) => x.id === SYSTEM);
const detail = systemDetail(SERVICE, SYSTEM);

export const metadata: Metadata = {
  title: absoluteTitle("Temporary Hot Water Hire | $30/day | Advanced Gas & Aircon"),
  description: metaDescription(
    "Temporary hot water unit connected the same day while you choose a replacement. $30 a day, $350 set-up waived if we do the job. Pakenham, Officer, Berwick and the south-east.",
  ),
  keywords: [
    "temporary hot water hire",
    "hot water unit hire melbourne",
    "emergency hot water rental",
    "no hot water pakenham",
    "temporary hot water rental victoria",
  ],
  alternates: { canonical: `/services/${SERVICE}/${SYSTEM}` },
};

export default function TemporaryHotWaterPage() {
  if (!sys) notFound();
  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Services", url: `${site.url}/services` },
    { name: "Gas & Plumbing", url: `${site.url}/services/${SERVICE}` },
    { name: sys.label, url: `${site.url}/services/${SERVICE}/${SYSTEM}` },
  ]);
  return (
    <>
      <SystemView slug={SERVICE} name="Gas & Plumbing" s={sys} d={detail} />
      <Script id="ld-crumbs-hire" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      {sys.faqs?.length ? <Script id="ld-faq-hire" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(sys.faqs)) }} /> : null}
    </>
  );
}
