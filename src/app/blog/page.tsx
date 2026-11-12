import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NewsletterForm } from "@/components/NewsletterForm";
import { AUTHORS, type BlogPost } from "@/lib/blog";
import { publishedPosts } from "@/lib/blogLive";
import { Crumbs, Hero } from "@/components/homepage/page/kit";
import { BkHead, Bands, EndCta, BandPage } from "@/components/homepage/page/bands";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/page/articles.css";

export const metadata: Metadata = {
  title: "Guides, VEU Rebates, Heat Pumps & Aircon",
  description:
    "Plain-English guides on VEU rebates, heat pump sizing, aircon selection and gas safety. Written by the people on the tools in Pakenham, not marketers.",
  alternates: { canonical: "/blog" },
};

/** Formatted from the ISO date, with "Updated" where the post has been
 *  revised — so the card and the article agree. */
function fmtDate(p: BlogPost): string {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  return p.updatedISO ? `Updated ${fmt(p.updatedISO)}` : fmt(p.publishedISO);
}

/** One guide, as a card: the photo, its topic, the headline and the first line. */
function ArticleCard({ p, big = false }: { p: BlogPost; big?: boolean }) {
  return (
    <Link href={`/blog/${p.slug}`} className={`art-card${big ? " art-card--big" : ""}`}>
      <span className="art-card__img">
        <Image src={p.photo} alt={p.photoAlt} fill sizes={big ? "(max-width: 900px) 100vw, 640px" : "(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 400px"} />
        <span className="art-card__tag">{big ? `Featured · ${p.cat}` : p.cat}</span>
      </span>
      <span className="art-card__body">
        <span className="art-card__meta">{p.read} · {fmtDate(p)}</span>
        <strong className="art-card__t">{p.title}</strong>
        <span className="art-card__d">{p.blurb}</span>
        <span className="art-card__foot">
          {big && <span className="art-card__by">By {AUTHORS[p.author]?.name ?? "the team"}</span>}
          <span className="art-card__go">{big ? "Read the guide" : "Read article"} <i aria-hidden="true">→</i></span>
        </span>
      </span>
    </Link>
  );
}

export default async function BlogPage() {
  // Posts written in the portal, over the ones in blog.ts.
  const posts = await publishedPosts();
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p.slug !== featured.slug);
  const topics = new Set(posts.map((p) => p.cat)).size;
  const writers = [...new Set(posts.map((p) => AUTHORS[p.author]?.name.split(" ")[0]).filter(Boolean))];

  return (
    // The product pages' bands (Jake, Nov 2026), like the rest of the inside pages.
    <BandPage>
      <Crumbs trail={[{ name: "Guides & articles" }]} />
      <Hero
        eye="Guides & articles"
        title={<>Plain-English answers, <em>written by the people on the tools.</em></>}
        sub={<>Real questions we get on jobs, written up properly. No fluff, actual answers from people who&rsquo;ve fitted the gear.</>}
        ctas={false}
        facts={[
          { v: String(posts.length), k: posts.length === 1 ? "Guide" : "Guides" },
          { v: String(topics), k: topics === 1 ? "Topic" : "Topics" },
          ...(writers.length ? [{ v: writers.join(" & "), k: "Who writes them" }] : []),
          { v: "12 hrs", k: "To answer a quote request" },
        ]}
      />

      <Bands list={[
        {
          id: "featured",
          body: (
            <>
              <BkHead h="Start {here}.">The one we point most people to first.</BkHead>
              <ArticleCard p={featured} big />
            </>
          ),
        },
        ...(rest.length ? [{
          id: "all",
          body: (
            <>
              <BkHead h="Every {guide}.">Rebates, heat pumps, air con, gas safety and what it all costs.</BkHead>
              <div className="art-grid" data-anim="stagger">
                {rest.map((p) => <ArticleCard key={p.slug} p={p} />)}
              </div>
            </>
          ),
        }] : []),
        {
          id: "news",
          navy: true,
          cls: "art-news",
          body: (
            <>
              <div className="art-news__copy">
                <h2 className="h2">Be the first to know when the <span>VEU rules change</span>.</h2>
                <p>The government tweaks rebate values every year. We send a short email when it happens, plus seasonal tips for keeping your gear running.</p>
                <small>One email a month, max. Local stuff only. Unsubscribe anytime.</small>
              </div>
              <NewsletterForm />
            </>
          ),
        },
      ]} />

      <EndCta title={<>Ready <span>when you are</span>.</>} text="Free quote with the rebate already applied. Usually back within 12 hours." from="blog-cta" />
    </BandPage>
  );
}
