import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { services } from "@/lib/site";
import { serviceContent } from "@/lib/serviceContent";
import { resolveAsset } from "@/lib/publicAsset";
import { Crumbs, Hero, Head, Next, Cta } from "@/components/homepage/page/kit";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";

export const metadata: Metadata = {
  title: "Services, Heat Pumps, Aircon, Gas & Hot Water",
  description:
    "Heat pump hot water, split and ducted aircon, gas heating, servicing and commercial fit-outs. Pakenham VIC, servicing within 75 km. Free quote.",
  alternates: { canonical: "/services" },
};

/**
 * Every service, built from the same records its own page reads
 * (lib/site services + lib/serviceContent), so this page can't promise
 * something the service page doesn't.
 */
export default function ServicesPage() {
  return (
    // data-no-reveal: the redesign pages opt out of the old site's scroll reveal.
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: "Services" }]} back={{ label: "Find your system →", href: "/#find" }} />
      <Hero
        eye="Services"
        title={<>Heating, cooling, gas and hot water, <em>one licensed crew.</em></>}
        sub="Installs, servicing and repairs, from a bedroom split to a whole-home ducted system, by our own team out of Pakenham."
      />

      <section className="pxs">
        <div className="wrap pp__col">
          <Head eye="What we do" h="Pick a service." />
          <div className="kxs">
            {services.map((s) => {
              const c = serviceContent[s.slug];
              if (!c) return null;
              const img = c.heroPhoto ? resolveAsset(c.heroPhoto) ?? c.heroPhoto : null;
              return (
                <Link key={s.slug} href={`/services/${s.slug}`} className="kxs__card">
                  {img && <span className="kxs__img"><Image src={img} alt={c.heroPhotoAlt ?? ""} fill sizes="(max-width: 900px) 100vw, 680px" /></span>}
                  <span className="kxs__t">
                    <strong>{s.short}</strong>
                    <span>{s.blurb}</span>
                    {c.systems?.length ? <small>{c.systems.map((x) => x.label).join(" · ")}</small> : null}
                    <em>See {s.short.toLowerCase()} →</em>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pxs pxs--sky">
        <div className="wrap pp__col">
          <Head eye="Know what you want?" h="Go straight to the products." />
          <Next items={[
            { t: "Find your system", s: "Options, prices and how each one works", href: "/#find" },
            { t: "24/7 emergency", s: "Gas leak, no hot water or no heat", href: "/contact#emergency" },
            { t: "Commercial & strata", s: "Offices, shops, rentals and strata", href: "/commercial" },
          ]} />
        </div>
      </section>

      <Cta title="Not sure which one you need?" text="Tell us what's going on and we'll point you at the right job, with a fixed price in writing." />
    </div>
  );
}
