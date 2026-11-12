import type { Metadata } from "next";
import Link from "next/link";
import { searchSite, type Hit } from "@/lib/searchIndex";
import { publishedPosts } from "@/lib/blogLive";
import { Crumbs, Hero } from "@/components/homepage/page/kit";
import { BkHead, Bands, EndCta, BandPage } from "@/components/homepage/page/bands";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/page/articles.css";

export const metadata: Metadata = {
  title: "Search",
  description: "Find a service, a brand, a suburb or a guide on the Advanced Gas site.",
  robots: { index: false, follow: true },
};

const ORDER: Hit["kind"][] = ["Service", "System", "Hot water", "Page", "Tool", "Brand", "Filtration", "Guide", "Suburb"];

/** The things people most often arrive looking for, when they have not searched yet. */
const COMMON = [
  { label: "Heat pump hot water", href: "/services/heat-pump-installation" },
  { label: "Ducted aircon", href: "/services/air-conditioning-installation" },
  { label: "Aircon service", href: "/services/aircon-servicing-repairs" },
  { label: "VEU rebate", href: "/rebates" },
  { label: "Fault codes", href: "/tools/fault-codes" },
  { label: "Emergency", href: "/contact#emergency" },
];

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams?.q ?? "").slice(0, 80);
  const hits = q ? searchSite(q, 24, await publishedPosts()) : [];
  const grouped = ORDER
    .map((kind) => ({ kind, rows: hits.filter((h) => h.kind === kind) }))
    .filter((g) => g.rows.length > 0);

  const sub = !q
    ? "Services, brands, suburbs, guides and the calculators. Type a couple of words."
    : hits.length === 0
      ? "Nothing on the site matches that."
      : hits.length === 1
        ? "One page matches."
        : `${hits.length} pages match.`;

  const common = (
    <div className="kxc kxc--light art-common" data-anim="stagger">
      {COMMON.map((c) => (
        <Link key={c.href} href={c.href} className="kxc__i"><strong>{c.label} →</strong></Link>
      ))}
    </div>
  );

  return (
    // The product pages' bands (Jake, Nov 2026), with the search box in the header.
    <BandPage>
      <Crumbs trail={[{ name: "Search" }]} />
      <div className="art-search">
        <Hero
          eye="Search"
          title={q ? <>Results for <em>{q}</em>.</> : <>What are you <em>after?</em></>}
          sub={sub}
          ctas={false}
        >
          <form className="art-search__form" action="/search" method="get" role="search">
            <label className="art-search__label" htmlFor="q">Search the site</label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="ducted aircon, Berwick, fault code, rebate…"
              autoComplete="off"
              autoFocus
            />
            <button type="submit" className="abtn abtn--or abtn--flat">Search &rarr;</button>
          </form>
        </Hero>
      </div>

      <Bands list={[
        ...(!q ? [{
          id: "common",
          body: (
            <>
              <BkHead h="Most {looked for}.">Where most people are headed when they land here.</BkHead>
              {common}
            </>
          ),
        }] : []),
        ...(q && hits.length === 0 ? [{
          id: "none",
          body: (
            <>
              <BkHead h={`Nothing matched \u201C${q.replace(/[{}]/g, "")}\u201D.`}>
                Try fewer words, or a brand name, or the suburb you are in. If it is a job rather than a page you
                are after, <Link href="/quote">tell us about it</Link> and someone will answer.
              </BkHead>
              {common}
            </>
          ),
        }] : []),
        ...(grouped.length ? [{
          id: "results",
          cls: "bk__col art-results",
          body: (
            <>
              {grouped.map((g) => (
                <div key={g.kind} className="art-group">
                  <h2 className="art-group__name">{g.kind}<span>{g.rows.length}</span></h2>
                  <ul className="art-hits" data-anim="stagger">
                    {g.rows.map((h) => (
                      <li key={h.path}>
                        <Link href={h.path}>
                          <strong>{h.title}</strong>
                          <span>{h.blurb}</span>
                          <em>{h.path}</em>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          ),
        }] : []),
      ]} />

      <EndCta title={<>Can&rsquo;t find it? <span>Ask us</span>.</>} text="Tell us about the job and someone will answer, usually within 12 hours." from="search-cta" />
    </BandPage>
  );
}
