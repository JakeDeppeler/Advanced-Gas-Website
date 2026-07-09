import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/lib/site";
import { posts, getPost } from "@/lib/blog";
import "../../detail.css";
import "../blog.css";

type Params = { slug: string };

export async function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: `${post.title}, Advanced Gas & Aircon`,
    description: post.blurb,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.blurb,
      images: [post.photo],
      type: "article",
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = posts.filter((p) => p.slug !== post.slug && p.cat === post.cat).slice(0, 3);
  const fallbackRelated = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const suggested = related.length ? related : fallbackRelated;

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
              <span>{post.date}</span>
              <span aria-hidden="true">·</span>
              <span>By the team</span>
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
      </article>
    </div>
  );
}
