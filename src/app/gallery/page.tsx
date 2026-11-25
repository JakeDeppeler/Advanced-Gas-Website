import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { site } from "@/lib/site";
import { GALLERY, GALLERY_CATEGORY_LABELS, BEFORE_AFTER, type GalleryCategory } from "@/lib/gallery";
import { BeforeAfter } from "@/components/BeforeAfter";
import { InstagramCTA } from "@/components/InstagramCTA";
import { InstagramFeed } from "@/components/InstagramFeed";
import { getInstagramFeed } from "@/lib/instagram";
import { breadcrumbSchema } from "@/lib/schema";
import { ALBUMS } from "@/lib/albums";
import { AlbumGrid } from "@/components/AlbumGrid";
import { brands as allBrands } from "@/lib/brands";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/homepage/page/PageHero";
import { PHOTO } from "@/lib/homepage/data";
import { BkHead, Bands, Tabs, EndCta, BandPage, type Band } from "@/components/homepage/page/bands";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
// The Instagram feed and the album grid still style from the old sheets.
import "../detail.css";
import "@/components/homepage/page/gallery.css";

export const metadata: Metadata = {
  title: "Install Gallery, Real Jobs Round Here",
  description:
    "Real photos from our installs: heat pumps, split and ducted aircon, gas ducted heating and evap, across Pakenham, Berwick, Officer and Cranbourne.",
  alternates: { canonical: "/gallery" },
};

const CATEGORY_ORDER: GalleryCategory[] = ["heat-pump", "aircon", "ducted", "gas", "evap", "team"];

export default async function GalleryPage() {
  // Whole feed — see lib/instagram.ts. Empty when unconfigured.
  const igPosts = await getInstagramFeed(24);

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Gallery", url: `${site.url}/gallery` },
  ]);

  const grouped = CATEGORY_ORDER
    .map((c) => ({ category: c, shots: GALLERY.filter((g) => g.category === c) }))
    .filter((g) => g.shots.length > 0);
  // The header shows one of the jobs, not a product shot: this page is the work.
  const lead = GALLERY.find((g) => g.category !== "team") ?? GALLERY[0];

  const bands: Band[] = [
    ...(ALBUMS.length > 0 ? [{
      id: "albums", tab: "Job albums",
      body: (
        <>
          <BkHead h="Click any job to {walk through it}.">
            Whole jobs rather than single shots, photos and video together. Filter by brand, then click through at your own pace.
          </BkHead>
          <AlbumGrid albums={ALBUMS} brandLabels={Object.fromEntries(allBrands.map((b) => [b.slug, b.name]))} />
        </>
      ),
    }] : []),
    ...(BEFORE_AFTER.length > 0 ? [{
      id: "before-after", tab: "Before & after",
      body: (
        <>
          <BkHead h="Drag the handle. {Same house, same corner}.">
            The clearest way to show what a changeover actually looks like when it&rsquo;s finished properly: new pad, re-run pipework, nothing left hanging.
          </BkHead>
          <div className="glx__ba" data-anim="stagger">
            {BEFORE_AFTER.map((ba) => (
              <article key={ba.slug} className="glx__baitem">
                <div className="glx__bamedia">
                  <BeforeAfter before={ba.before} after={ba.after} ratio="3 / 4" />
                </div>
                <div className="glx__bacopy">
                  <h3>{ba.title}</h3>
                  <p>{ba.blurb}</p>
                  {ba.meta && <ul className="glx__meta">{ba.meta.map((m) => <li key={m}>{m}</li>)}</ul>}
                  <Link href="/tools/hot-water-savings" className="abtn abtn--line glx__balink">Work out your own savings →</Link>
                </div>
              </article>
            ))}
          </div>
        </>
      ),
    }] : []),
    {
      id: "jobs", tab: "Jobs we've finished",
      body: (
        <>
          <BkHead h="Jobs we’ve {finished}.">Shot on site, on the day. Jump to the kind of job you&rsquo;re after.</BkHead>
          <nav className="glx__jump" aria-label="Kinds of job">
            {grouped.map((g) => (
              <a key={g.category} href={`#gal-${g.category}`}>{GALLERY_CATEGORY_LABELS[g.category]} <b>{g.shots.length}</b></a>
            ))}
          </nav>
          {grouped.map((g) => (
            <div key={g.category} className="glx__group" id={`gal-${g.category}`}>
              <h3 className="glx__gt">
                <span>{GALLERY_CATEGORY_LABELS[g.category]}</span>
                <span className="glx__count">{g.shots.length} photo{g.shots.length === 1 ? "" : "s"}</span>
              </h3>
              <div className="glx__grid" data-anim="stagger">
                {g.shots.map((s) => (
                  <figure key={s.src} className="glx__cell">
                    {/* Through the optimiser. Eighteen install photographs
                        were being served at full size; two of them have spaces
                        in the filename, which the optimiser rejects unless the
                        path is encoded. */}
                    <span className="glx__img">
                      <Image src={encodeURI(s.src)} alt={s.alt} fill sizes="(max-width: 620px) 100vw, (max-width: 1100px) 50vw, 380px" />
                    </span>
                    <figcaption>
                      {s.caption}
                      {s.suburb && <span className="glx__suburb">{s.suburb}</span>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
          <div className="glx__ig">
            <InstagramCTA
              heading="The full gallery lives on Instagram"
              body="We post jobs as they're finished. Splits, ducted, heat pumps and gas heaters going into real houses across the south-east."
            />
          </div>
        </>
      ),
    },
  ];

  return (
    // The homepage's top (PageHero), behind it the first of the jobs below.
    <BandPage hero={
      <PageHero
        crumbs={[{ name: "Gallery" }]}
        eye="Our work, not catalogue shots"
        title="Real installs across {Melbourne’s south-east}."
        sub={<>Every photo below is one of our own jobs, shot on site, on the day. Product photography elsewhere on the site is manufacturer imagery so you can see exactly which unit we&rsquo;re quoting; this page is the actual work.</>}
        photo={lead ? encodeURI(lead.src) : PHOTO.team} from="gallery-hero"
        trust={[
          // The team photo is in the gallery but isn't a job, so it counts in neither.
          { v: String(GALLERY.filter((g) => g.category !== "team").length), k: "Photos of our own jobs" },
          { v: String(grouped.filter((g) => g.category !== "team").length), k: "Kinds of job" },
        ]}
      />
    }>
      <Tabs list={bands} />
      <Bands list={bands} />
      <div className="glx__feed">
        <InstagramFeed
          posts={igPosts}
          eyebrow="Live feed"
          heading="Everything we've finished lately."
          blurb="Pulled straight from our Instagram, so it's current, not a gallery someone forgot to update two years ago."
        />
      </div>
      <EndCta title={<>Want yours to look <span>like this</span>?</>} text="A callback within 12 business hours, a free site check, then a written price. Six years on our workmanship." from="gallery-cta" />
      <JsonLd data={crumbs} />
    </BandPage>
  );
}
