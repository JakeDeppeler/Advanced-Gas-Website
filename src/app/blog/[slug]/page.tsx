import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { blogPosts, type BlogPostBlock } from "@/lib/blogPosts";
import { site } from "@/lib/site";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import "./post.css";

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) return {};
  return {
    title: post.metaTitle ?? post.title,
    description: post.metaDescription,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.metaTitle ?? post.title,
      description: post.metaDescription,
      publishedTime: post.iso,
      images: [{ url: post.photo, alt: post.photoAlt }],
    },
  };
}

function renderBlock(block: BlogPostBlock, i: number) {
  switch (block.kind) {
    case "h2":
      return <h2 key={i}>{block.text}</h2>;
    case "h3":
      return <h3 key={i}>{block.text}</h3>;
    case "p":
      return <p key={i} dangerouslySetInnerHTML={{ __html: block.html }} />;
    case "ul":
      return (
        <ul key={i}>
          {block.items.map((it, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: it }} />
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={i}>
          {block.items.map((it, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: it }} />
          ))}
        </ol>
      );
    case "callout":
      return (
        <aside key={i} className="bp-callout">
          <strong>{block.title}</strong>
          <span dangerouslySetInnerHTML={{ __html: block.html }} />
        </aside>
      );
    case "table":
      return (
        <div key={i} className="bp-table">
          <table>
            <thead>
              <tr>
                {block.headers.map((h, j) => (
                  <th key={j} dangerouslySetInnerHTML={{ __html: h }} />
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, j) => (
                <tr key={j}>
                  {row.map((cell, k) => (
                    <td key={k} dangerouslySetInnerHTML={{ __html: cell }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  const related = blogPosts
    .filter((p) => p.slug !== post.slug && p.categoryShort === post.categoryShort)
    .slice(0, 3);
  const fallback = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const relatedList = related.length >= 2 ? related : fallback;

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Blog", url: `${site.url}/blog` },
    { name: post.title, url: `${site.url}/blog/${post.slug}` },
  ]);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    image: `${site.url}${post.photo}`,
    datePublished: post.iso,
    author: { "@type": "Organization", name: site.name },
    publisher: { "@type": "Organization", name: site.name, logo: { "@type": "ImageObject", url: `${site.url}/logo-full.jpg` } },
    mainEntityOfPage: `${site.url}/blog/${post.slug}`,
  };

  return (
    <article className="page-blog-post">
      <header className="bp-hero">
        <div className="wrap">
          <nav className="bp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/blog">Blog</Link>
            <span className="sep">/</span>
            <span>{post.categoryShort}</span>
          </nav>
          <span className="bp-tag">{post.category}</span>
          <h1>{post.title}</h1>
          <p className="bp-meta">
            <time dateTime={post.iso}>{post.date}</time>
            <span aria-hidden="true"> · </span>
            <span>{post.readingMinutes} min read</span>
            <span aria-hidden="true"> · </span>
            <span>By the Advanced Gas team</span>
          </p>
        </div>
      </header>

      <div className="bp-cover">
        <div className="wrap">
          <div
            className="bp-cover__img"
            role="img"
            aria-label={post.photoAlt}
            style={{ backgroundImage: `url(${post.photo})` }}
          />
        </div>
      </div>

      <div className="bp-body-wrap">
        <div className="wrap bp-body">
          <div className="bp-lede" />
          {post.body.map(renderBlock)}

          {post.faqs && post.faqs.length > 0 && (
            <>
              <h2>FAQ</h2>
              <div className="bp-faqs">
                {post.faqs.map((f, i) => (
                  <details key={f.q} name={`bp-faq-${post.slug}`} {...(i === 0 ? { open: true } : {})}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </>
          )}

          <aside className="bp-cta">
            <h3>Want a real quote?</h3>
            <p>Free 60-second form, written quote within 2 business hours, VEU rebate already applied.</p>
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">
              Start my free quote →
            </Link>
          </aside>
        </div>
      </div>

      {relatedList.length > 0 && (
        <section className="bp-related">
          <div className="wrap">
            <h2>Keep reading</h2>
            <div className="bp-related__grid">
              {relatedList.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="bp-related__card">
                  <div
                    className="bp-related__photo"
                    style={{ backgroundImage: `url(${r.photo})` }}
                  />
                  <div className="bp-related__body">
                    <span className="bp-related__meta">{r.readingMinutes} min · {r.categoryShort}</span>
                    <h3>{r.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Script id={`ld-article-${post.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <Script id={`ld-crumbs-${post.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      {post.faqs && post.faqs.length > 0 && (
        <Script id={`ld-faq-${post.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(post.faqs)) }} />
      )}
    </article>
  );
}
