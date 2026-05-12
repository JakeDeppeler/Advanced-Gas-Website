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
    image: `${site.url}/og.jpg`,
    logo: `${site.url}/logo.png`,
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
    ? `${site.url}/melbourne/${location.toLowerCase().replace(/\s+/g, "-")}/${svc.slug}`
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
