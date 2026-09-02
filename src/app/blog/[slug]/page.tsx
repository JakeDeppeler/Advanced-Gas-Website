import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/lib/site";
import { posts, getPost, AUTHORS } from "@/lib/blog";
import Script from "next/script";
import "../../detail.css";
import "../blog.css";
import { metaDescription, pageTitle, seoMeta } from "@/lib/seo";

type Params = { slug: string };

export async function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
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
  const post = getPost(slug);
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
    <div className="page-blog page-detail">
      <article className="bl-post">
        <section className="bl-post__hero">
          <div className="wrap">
            <Link href="/blog" className="bl-post__back">← All articles</Link>
            <span className="bl-post__cat">{post.cat}</span>
            <h1>{post.title}</h1>
            <p className="bl-post__lede">{post.blurb}</p>
            <div className="bl-post__meta">
              <span>{post.read}</span>
              <span aria-hidden="true">·</span>
              <span>{shownDate}</span>
              <span aria-hidden="true">·</span>
              <span>By {author.name}</span>
            </div>
          </div>
        </section>

        <div className="wrap bl-post__frame">
          <div className="bl-post__hero-photo">
            <Image
              src={post.photo}
              alt={post.photoAlt}
              fill
              sizes="(max-width: 900px) 100vw, 900px"
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
        </div>

        <div className="wrap bl-post__body">
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

          <div className="bl-post__cta">
            <div>
              <span className="bl-post__cta-eye">Ready for a quote?</span>
              <h3>Fixed-price, no obligation, VEU rebate applied at the quote.</h3>
              <p>We usually reply within 12 hours. Free 20-minute site check for bigger jobs.</p>
            </div>
            <div className="bl-post__cta-btns">
              <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a free quote →</Link>
              <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
                Or call {site.phone}
              </a>
            </div>
          </div>
        </div>

        {suggested.length > 0 && (
          <div className="wrap bl-post__related">
            <h3>More like this</h3>
            <div className="bl-post__related-grid">
              {suggested.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="bl-post__related-card">
                  <div className="bl-post__related-photo">
                    <Image
                      src={r.photo}
                      alt={r.photoAlt}
                      fill
                      sizes="(max-width: 900px) 100vw, 300px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div className="bl-post__related-body">
                    <span className="bl-post__related-cat">{r.cat}</span>
                    <h4>{r.title}</h4>
                    <span className="bl-post__related-meta">{r.read}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        {/* WEB-012: a named, credentialed author, not "the team". */}
        <div className="wrap bl-post__author">
          <div className="bl-post__author-pic">
            <Image src={author.photo} alt={author.name} width={72} height={72} />
          </div>
          <div>
            <span className="bl-post__author-role">Written by</span>
            <h3>{author.name}</h3>
            <span className="bl-post__author-cred">{author.role} · {author.credential}</span>
            <p>{author.bio}</p>
          </div>
        </div>
      </article>

      {/* WEB-012 / WEB-013: Article with a real author reference and ISO
          dates, plus a Person for the author. */}
      <Script
        id={`ld-article-${post.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
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
          }),
        }}
      />
    </div>
  );
}
