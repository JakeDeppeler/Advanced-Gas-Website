import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { searchSite, type Hit } from "@/lib/searchIndex";
import "../detail.css";
import "./search.css";

export const metadata: Metadata = {
  title: "Search",
  description: "Find a service, a brand, a suburb or a guide on the Advanced Gas site.",
  robots: { index: false, follow: true },
};

const ORDER: Hit["kind"][] = ["Service", "Hot water", "Page", "Tool", "Brand", "Filtration", "Guide", "Suburb"];

/** The things people most often arrive looking for, when they have not searched yet. */
const COMMON = [
  { label: "Heat pump hot water", href: "/heat-pumps" },
  { label: "Ducted aircon", href: "/services/air-conditioning-installation" },
  { label: "Aircon service", href: "/services/aircon-servicing-repairs" },
  { label: "VEU rebate", href: "/rebates" },
  { label: "Pricing", href: "/pricing" },
  { label: "Fault codes", href: "/tools/fault-codes" },
  { label: "Emergency", href: "/contact#emergency" },
];

export default function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams?.q ?? "").slice(0, 80);
  const hits = q ? searchSite(q) : [];
  const grouped = ORDER
    .map((kind) => ({ kind, rows: hits.filter((h) => h.kind === kind) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="page-detail page-search">
      <PageHero
        eyebrow="Search"
        title={q ? <>Results for <span className="accent">{q}</span>.</> : <>What are you after?</>}
        sub={
          !q
            ? "Services, brands, suburbs, guides and the calculators. Type a couple of words."
            : hits.length === 0
              ? "Nothing on the site matches that."
              : hits.length === 1
                ? "One page matches."
                : `${hits.length} pages match.`
        }
      />

      <section className="sr">
        <div className="wrap">
          <form className="sr__form" action="/search" method="get" role="search">
            <label className="sr__label" htmlFor="q">Search the site</label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="ducted aircon, Berwick, fault code, rebate…"
              autoComplete="off"
              autoFocus
            />
            <button type="submit" className="ds-btn ds-btn--orange">Search &rarr;</button>
          </form>

          {!q && (
            <div className="sr__common">
              <span className="sr__commonlbl">Most looked for</span>
              <div className="sr__chips">
                {COMMON.map((c) => (
                  <Link key={c.href} href={c.href}>{c.label}</Link>
                ))}
              </div>
            </div>
          )}

          {q && hits.length === 0 && (
            <div className="sr__none">
              <h2>Nothing matched &ldquo;{q}&rdquo;.</h2>
              <p>
                Try fewer words, or a brand name, or the suburb you are in. If it is a job rather than a page you
                are after, <Link href="/quote">tell us about it</Link> and someone will answer.
              </p>
            </div>
          )}

          {grouped.map((g) => (
            <div key={g.kind} className="sr__group">
              <h2 className="sr__groupname">{g.kind}<span>{g.rows.length}</span></h2>
              <ul className="sr__list">
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
        </div>
      </section>
    </div>
  );
}
