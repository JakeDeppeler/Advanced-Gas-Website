import { site, services, publishedSuburbs } from "./site";

// Generates JSON-LD blocks for SEO. Embed with <JsonLd data={...} /> from
// components/JsonLd, never next/script (see that file for why).

/**
 * schema.org wants full day names. `site.hours` keeps the "Mon-Fri" shorthand
 * people read, and it was being passed straight through as
 * `dayOfWeek: "Mon-Fri"`, which schema.org doesn't recognise, so the one
 * record Google reads our hours from gave hours for no day at all.
 */
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
function dayNames(span: string): string[] {
  const idx = (d: string) => DAYS.findIndex((x) => x.startsWith(d.trim().slice(0, 3)));
  const [from, to = from] = span.split("-").map(idx);
  return from < 0 || to < 0 ? [] : DAYS.slice(from, to + 1);
}

export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    // Both, because the work is both. The gas and hot water half of the
    // business runs on a plumbing licence, and Plumber is the type that
    // "hot water Cranbourne" and "gas fitter Officer" belong to. HVACBusiness
    // on its own described only the aircon half.
    "@type": ["HVACBusiness", "Plumber"],
    "@id": `${site.url}#business`,
    name: site.name,
    legalName: site.legalName,
    url: site.url,
    telephone: site.phoneE164,
    email: site.email,
    image: `${site.url}/logo-full.jpg`,
    logo: `${site.url}/logo-full.jpg`,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.suburb,
      addressRegion: site.address.state,
      postalCode: site.address.postcode,
      addressCountry: site.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.geo.lat,
      longitude: site.geo.lng,
    },
    // Published suburbs, each pinned to Victoria ("Officer" and "Clyde" are
    // place names in other states too) and pointing at its page.
    areaServed: publishedSuburbs.map((s) => ({
      "@type": "City",
      name: s.name,
      url: `${site.url}/areas/${s.slug}`,
      containedInPlace: { "@type": "State", name: site.primaryState },
    })),
    openingHoursSpecification: site.hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: dayNames(h.day),
      opens: h.open,
      closes: h.close,
    })),
    taxID: `ABN ${site.abn}`,
    sameAs: Object.values(site.social).filter(Boolean),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.name,
          url: `${site.url}/services/${s.slug}`,
        },
      })),
    },
  };
}

/**
 * A Service, provided by the business record the layout prints on every page.
 *
 * This used to take a location and build a URL to /areas/<suburb>/<service>.
 * Those pages were pruned in WEB-008 and 301 to the suburb hub, so a caller
 * passing a location would have marked up a redirect as the service's home.
 * Suburbs have suburbServiceSchema below, which points at the hub. A system
 * page (/services/<service>/<system>) passes its system so the Service names
 * the job the page is actually about.
 */
export function serviceSchema(serviceSlug: string, system?: { id: string; label: string; blurb?: string }) {
  const svc = services.find((s) => s.slug === serviceSlug);
  if (!svc) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: system ? system.label : svc.name,
    serviceType: svc.name,
    provider: { "@id": `${site.url}#business` },
    areaServed: { "@type": "AdministrativeArea", name: site.primaryRegion },
    description: system?.blurb ?? svc.blurb,
    url: system ? `${site.url}/services/${svc.slug}/${system.id}` : `${site.url}/services/${svc.slug}`,
  };
}

/**
 * A suburb page as structured data: the services we provide in that one
 * suburb, provided by the Pakenham business record.
 *
 * The suburb pages carried only a breadcrumb, so nothing in their markup said
 * which place they were about. This states where the work is done, not that
 * we have a presence there: the provider's address stays Sierra Circuit.
 */
export function suburbServiceSchema(sub: { name: string; slug: string; postcode: string }) {
  const place = {
    "@type": "City",
    name: sub.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: sub.name,
      postalCode: sub.postcode,
      addressRegion: site.address.state,
      addressCountry: site.address.country,
    },
  };
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Air conditioning, heating and hot water in ${sub.name}`,
    url: `${site.url}/areas/${sub.slug}`,
    provider: { "@id": `${site.url}#business` },
    areaServed: place,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `Services in ${sub.name}`,
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.name, url: `${site.url}/services/${s.slug}` },
      })),
    },
  };
}

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbSchema(trail: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: t.url,
    })),
  };
}

/**
 * A product page, as a Product.
 *
 * Eighty-four model pages carried nothing but a breadcrumb and the sitewide
 * business record, so every one of them was, to a search engine, a page about
 * Advanced Gas rather than a page about an MSZ-AP50.
 *
 * Deliberately no `offers`. A Product with an offer and a price is what earns
 * the rich result with the price in the listing — and not one of the 84 has an
 * `installedPriceFrom` set, so an offer here would either be omitted (useless)
 * or invented (worse). The moment those prices land, the offer block below
 * starts emitting and 84 pages become eligible without another change.
 *
 * Deliberately no `aggregateRating` either. `starRating` on these products is
 * the energy label, not a review score, and passing one off as the other is
 * the kind of thing that gets structured data ignored site-wide.
 */
export function productSchema(p: {
  name: string;
  model: string;
  slug: string;
  brandName: string;
  categoryLabel: string;
  bestFor: string;
  capacity?: string;
  refrigerant?: string;
  photo?: string;
  specs?: { label: string; value: string }[];
  installedPriceFrom?: string;
}, brandSlug: string) {
  // "$2,538" and "From $2,538" both reduce to the number schema.org wants.
  const priceNum = p.installedPriceFrom
    ? Number(p.installedPriceFrom.replace(/[^0-9.]/g, "")) || null
    : null;

  const props = [
    ...(p.capacity ? [{ "@type": "PropertyValue", name: "Capacity", value: p.capacity }] : []),
    ...(p.refrigerant ? [{ "@type": "PropertyValue", name: "Refrigerant", value: p.refrigerant }] : []),
    ...(p.specs ?? []).map((s) => ({ "@type": "PropertyValue", name: s.label, value: s.value })),
  ];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${site.url}/brands/${brandSlug}/${p.slug}#product`,
    name: p.name,
    sku: p.model,
    mpn: p.model,
    category: p.categoryLabel,
    description: p.bestFor,
    ...(p.photo ? { image: `${site.url}${p.photo}` } : {}),
    brand: { "@type": "Brand", name: p.brandName },
    ...(props.length ? { additionalProperty: props } : {}),
    ...(priceNum
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "AUD",
            price: priceNum,
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            url: `${site.url}/brands/${brandSlug}/${p.slug}`,
            seller: { "@id": `${site.url}#business` },
          },
        }
      : {}),
  };
}
