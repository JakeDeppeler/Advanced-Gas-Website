import type { Metadata } from "next";
import Link from "next/link";
import { publishedSuburbs } from "@/lib/site";
import { areaSuburbs } from "@/lib/homepage/areas";
import { ServiceArea } from "@/components/homepage/ServiceArea";
import { Crumbs, Hero, Head, Cta } from "@/components/homepage/page/kit";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";

export const metadata: Metadata = {
  title: "Service Areas, Pakenham + 75 km",
  description:
    "Aircon, heat pump and gas plumbing across Pakenham and within 75 km: Berwick, Officer, Cranbourne, Narre Warren, Dandenong, Drouin, Warragul and between.",
  alternates: { canonical: "/service-areas" },
};

export default function ServiceAreasPage() {
  return (
    // data-no-reveal: the redesign pages opt out of the old site's scroll reveal.
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: "Service areas" }]} />
      <Hero
        eye="Service areas"
        title={<>Pakenham &amp; <em>75 km around.</em></>}
        sub="Our own crews, out of one Pakenham workshop. Type your suburb into the map to see how far it is and whether we come to you."
      />

      {/* The homepage's map and suburb checker, so the two can't disagree about who we reach. */}
      <ServiceArea suburbs={areaSuburbs()} />

      <section className="pxs pxs--navy">
        <div className="wrap pp__col">
          <Head dark eye="Suburbs" h="Every suburb with its own page." lede="What we install most there, and how long it takes us to get to you." />
          <div className="kxc">
            {publishedSuburbs.map((s) => (
              <Link key={s.slug} href={`/areas/${s.slug}`} className="kxc__i"><strong>{s.name}</strong><small>VIC {s.postcode}</small></Link>
            ))}
          </div>
        </div>
      </section>

      <Cta title="Free quote, rebate applied." text="A free, no-obligation quote back within 12 business hours." />
    </div>
  );
}
