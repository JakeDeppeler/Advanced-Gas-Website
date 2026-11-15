import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/lib/site";
import { AUTHORS } from "@/lib/blog";
import { publishedPost, publishedPosts } from "@/lib/blogLive";
import { seoMeta } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { Crumbs, Hero } from "@/components/homepage/page/kit";
import { BkHead, Bands, EndCta, BandPage } from "@/components/homepage/page/bands";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/page/articles.css";

type Params = { slug: string };

/**
 * The slugs known at build time. A post written in the portal after a
 * deploy is not in this list; Next renders it on the first request and
 * caches it, and publishing revalidates this path, so it appears without a
 * redeploy. Prerendering the ones we do know keeps the archive fast.
 */
export async function generateStaticParams() {
  return (await publishedPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await publishedPost(slug);
  if (!post) notFound();
  // seoTitle over title: WEB-005. The editorial headlines run 53–72
  // chars and clamping them for the site suffix produced titles ending
  // on a dangling "the". The H1 below still uses the full title.
  return seoMeta({
    title: post.seoTitle ?? post.title,
    description: post.blurb,
    canonical: `/blog/${post.slug}`,
    image: post.photo,
    article: {},
  });
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const posts = await publishedPosts();
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  // Same category first, then top up from the rest of the archive
  // starting at this post's own position rather than at index 0.
  //
  // The old fallback took the first three posts every time, so seven
  // articles ended up with a single inbound link each while the same
  // three collected all of them. Rotating the top-up spreads the links
  // right across the archive without anything needing to be curated.
  const author = AUTHORS[post.author] ?? AUTHORS.dean;
  // The visible date, formatted from the ISO rather than the old human
  // string, so what a reader sees and what the schema says can't drift.
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const shownDate = post.updatedISO
    ? `Updated ${fmt(post.updatedISO)}`
    : fmt(post.publishedISO);

  const idx = posts.findIndex((p) => p.slug === post.slug);
  const sameCat = posts.filter((p) => p.slug !== post.slug && p.cat === post.cat);
  const rest = posts
    .filter((p) => p.slug !== post.slug && p.cat !== post.cat)
    .map((_, i, arr) => arr[(i + idx + 1) % arr.length]);
  const suggested = [...sameCat, ...rest].slice(0, 3);

  return (
    // The product pages' bands (Jake, Nov 2026). The article sits in a
    // reading-width column with who wrote it beside it.
    <BandPage>
      <Crumbs trail={[{ name: "Guides & articles", href: "/blog" }, { name: post.cat }]} back={{ label: "← All articles", href: "/blog" }} />
      <div className="art-post">
        <Hero eye={post.cat} title={post.title} sub={post.blurb} img={post.photo} imgAlt={post.photoAlt} ctas={false}>
          <p className="art-post__meta">
            <span>{post.read}</span>
            <span aria-hidden="true">·</span>
            <span>{shownDate}</span>
            <span aria-hidden="true">·</span>
            <span>By {author.name}</span>
          </p>
        </Hero>
      </div>

      <Bands list={[
        {
          id: "article",
          cls: "art-read",
          body: (
            <>
              <article className="art-body">
                {post.content.map((s, i) => {
                  if (s.type === "h2") return <h2 key={i}>{s.text}</h2>;
                  if (s.type === "ul") {
                    return (
                      <ul key={i}>
                        {s.items.map((it, j) => <li key={j}>{it}</li>)}
                      </ul>
                    );
                  }
                  return <p key={i}>{s.text}</p>;
                })}
              </article>
              <aside className="art-side">
                {/* WEB-012: a named, credentialed author, not "the team". */}
                <div className="art-author">
                  <span className="art-author__pic"><Image src={author.photo} alt={author.name} width={64} height={64} /></span>
                  <div>
                    <small>Written by</small>
                    <h3>{author.name}</h3>
                    <span className="art-author__cred">{author.role} · {author.credential}</span>
                  </div>
                  <p>{author.bio}</p>
                </div>
                <div className="art-ask">
                  <small>Ready for a quote?</small>
                  <h3>In writing, no obligation, VEU rebate applied at the quote.</h3>
                  <p>We usually reply within 12 hours. Free 20-minute site check for bigger jobs.</p>
                  <Link href="/quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
                  <a href={`tel:${site.phoneE164}`} data-call-from="blog-side">Or call {site.phone}</a>
                </div>
              </aside>
            </>
          ),
        },
        ...(suggested.length > 0 ? [{
          id: "more",
          body: (
            <>
              <BkHead h="More {like this}.">Same topic first, then the rest of the guides.</BkHead>
              <div className="art-grid" data-anim="stagger">
                {suggested.map((r) => (
                  <Link key={r.slug} href={`/blog/${r.slug}`} className="art-card">
                    <span className="art-card__img">
                      <Image src={r.photo} alt={r.photoAlt} fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 400px" />
                      <span className="art-card__tag">{r.cat}</span>
                    </span>
                    <span className="art-card__body">
                      <span className="art-card__meta">{r.read}</span>
                      <strong className="art-card__t">{r.title}</strong>
                      <span className="art-card__foot"><span className="art-card__go">Read article <i aria-hidden="true">→</i></span></span>
                    </span>
                  </Link>
                ))}
              </div>
            </>
          ),
        }] : []),
      ]} />

      <EndCta title={<>Free quote, <span>in writing</span>.</>} text="VEU rebate applied at the quote where it applies. We usually reply within 12 hours." from="blog-post-cta" />

      {/* WEB-012 / WEB-013: Article with a real author reference and ISO
          dates, plus a Person for the author. */}
      <JsonLd data={{
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.blurb,
            image: `${site.url}${post.photo}`,
            datePublished: post.publishedISO,
            dateModified: post.updatedISO ?? post.publishedISO,
            author: {
              "@type": "Person",
              name: author.name,
              jobTitle: author.role,
              url: `${site.url}${author.url}`,
            },
            publisher: {
              "@type": "Organization",
              name: site.name,
              logo: { "@type": "ImageObject", url: `${site.url}/advanced-gas-logo.webp` },
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": `${site.url}/blog/${post.slug}` },
          }} />
    </BandPage>
  );
}
