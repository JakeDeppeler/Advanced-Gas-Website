import { site, services, suburbs } from "./site";

// Generates JSON-LD blocks for SEO. Embed via <Script type="application/ld+json">.

export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "HVACBusiness",
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
    areaServed: suburbs.map((s) => ({
      "@type": "City",
      name: s.name,
    })),
    openingHoursSpecification: site.hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.day,
      opens: h.open,
      closes: h.close,
    })),
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

export function serviceSchema(serviceSlug: string, location?: string) {
  const svc = services.find((s) => s.slug === serviceSlug);
  if (!svc) return null;
  const name = location ? `${svc.name} in ${location}` : svc.name;
  const url = location
    ? `${site.url}/areas/${location.toLowerCase().replace(/\s+/g, "-")}/${svc.slug}`
    : `${site.url}/services/${svc.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    serviceType: svc.name,
    provider: { "@id": `${site.url}#business` },
    areaServed: location ?? site.primaryRegion,
    description: svc.blurb,
    url,
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
