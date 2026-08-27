import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { NewsletterForm } from "@/components/NewsletterForm";
import { posts, AUTHORS, type BlogPost } from "@/lib/blog";
import "./blog.css";

export const metadata: Metadata = {
  title: "Guides, VEU Rebates, Heat Pumps & Aircon",
  description:
    "Plain-English guides on VEU rebates, heat pump sizing, aircon selection, gas safety and saving on energy bills. Written by Pakenham tradies, not marketers.",
  alternates: { canonical: "/blog" },
};

const cats = ["All", "VEU rebates", "Heat pumps", "Aircon", "Gas safety", "Hot water", "Costs & savings"];

/** Formatted from the ISO date, with "Updated" where the post has been
 *  revised — so the card and the article agree. */
function fmtDate(p: BlogPost): string {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  return p.updatedISO ? `Updated ${fmt(p.updatedISO)}` : fmt(p.publishedISO);
}

export default function BlogPage() {
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p.slug !== featured.slug);

  return (
    <div className="page-blog">
      <section className="bl-hero">
        <div className="wrap">
          <span className="ds-eyebrow"><span className="ds-dot" /> Guides &amp; articles</span>
          <h1>Plain-English answers, <em>written by tradies.</em></h1>
          <p>Real questions we get on jobs, written up properly. No fluff, no SEO slop, actual answers from people who&apos;ve fitted the unit on your neighbour&apos;s roof.</p>
          <div className="bl-cats">
            {cats.map((c, i) => (
              <span key={c} className={`bl-cat${i === 0 ? " is-active" : ""}`}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="bl-feat">
        <div className="wrap">
          <Link href={`/blog/${featured.slug}`} className="bl-feat__card" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="bl-feat__photo" style={{ position: "relative", overflow: "hidden" }}>
              <Image
                src={featured.photo}
                alt={featured.photoAlt}
                fill
                sizes="(max-width: 900px) 100vw, 60vw"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className="bl-feat__copy">
              <span className="bl-feat__tag">Featured · {featured.cat}</span>
              <h2>{featured.title}</h2>
              <p>{featured.blurb}</p>
              <span className="bl-feat__meta">{featured.read} · {fmtDate(featured)} · By {AUTHORS[featured.author]?.name ?? "the team"}</span>
              <div style={{ marginTop: 22 }}>
                <span className="ds-btn ds-btn--orange">Read the guide →</span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section className="bl-grid-wrap">
        <div className="wrap">
          <div className="bl-grid">
            {rest.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className={`bl-card${p.alt ? " bl-card--alt" : ""}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="bl-card__photo" style={{ position: "relative", overflow: "hidden" }}>
                  <Image
                    src={p.photo}
                    alt={p.photoAlt}
                    fill
                    sizes="(max-width: 900px) 100vw, 33vw"
                    style={{ objectFit: "cover" }}
                  />
                  <span className="bl-card__photo-tag" style={{ zIndex: 1 }}>{p.cat}</span>
                </div>
                <div className="bl-card__body">
                  <span className="bl-card__meta">{p.read} · {fmtDate(p)}</span>
                  <h3>{p.title}</h3>
                  <p>{p.blurb}</p>
                  <div className="bl-card__foot">
                    <span className="bl-card__read">Read article →</span>
                    <span>{p.cat}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bl-news">
        <div className="wrap bl-news__grid">
          <div>
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> Get the heads-up</span>
            <h2>Be the first to know when the VEU rules change.</h2>
            <p>The government tweaks rebate values every year. We send a short email when it happens, plus seasonal tips for keeping your gear running.</p>
            <p style={{ marginTop: 0, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
              One email a month, max. Local stuff only. Unsubscribe anytime.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Ready when you are.</h2>
            <p>Free quote with the rebate already applied. Usually back within 2 hours.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Start my free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
