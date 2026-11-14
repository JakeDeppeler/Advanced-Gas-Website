import type { Metadata } from "next";
import Link from "next/link";
import { BkMotion } from "@/components/homepage/brand/BkMotion";
import { Crumbs } from "@/components/homepage/page/kit";
import { TOOL_GROUPS, TOOL_LIST } from "@/components/homepage/tools/toolList";
import "@/components/homepage/homepage.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/brand/blocks.css";
import "@/components/homepage/page/category.css";
import "@/components/homepage/tools/tools.css";

/**
 * /tools hub: free calculators and reference that pull organic traffic on
 * high-intent searches ("aircon sizing calculator", "running cost aircon",
 * "Mitsubishi fault code E9"). Each tool page targets one query cluster,
 * then hands the visitor a natural step up to a quote.
 *
 * In the brand pages' block layout, grouped by the job each tool does, with
 * each card in the colour of the category it belongs to.
 */

export const metadata: Metadata = {
  title: "Free Aircon & Heat Pump Tools",
  description:
    "Free calculators and reference: work out what size aircon a room needs, estimate the running cost, or look up a fault code from your existing unit.",
  alternates: { canonical: "/tools" },
};

export default function ToolsHubPage() {
  return (
    // Two boxes: the blocks styles hang off .bk sitting inside .ag.
    <div className="ag ag--flat" data-no-reveal><div className="bx bk cx tl" style={{ ["--acc" as string]: "#C2521A" }}>
      <BkMotion />
      <Crumbs trail={[{ name: "Tools" }]} back={{ label: "Get a free quote →", href: "/quote" }} />

      <section className="bxh tl__hero">
        <div className="wrap tl__hin">
          <div className="bxh__copy">
            <span className="lk2__eye cx__eye">Free tools</span>
            <h1 className="bxh__h1 cx__h1">The tools we use <span>on quote day</span>.</h1>
            <p className="bxh__sub">What size a room needs, what it&apos;ll cost to run, what the rebate is worth, which system suits, and what a fault code means. Free, and no sign-up.</p>
            <div className="bxh__ctas">
              <a href="#size" className="abtn abtn--or abtn--flat">Pick a tool ↓</a>
              <Link href="/quote" className="abtn abtn--line">Or get a free quote</Link>
            </div>
          </div>
          <aside className="tl__what" aria-label="The questions these tools answer">
            <small>Answers in a minute</small>
            <ul>{TOOL_LIST.slice(0, 5).map((t) => <li key={t.slug}><span aria-hidden="true">?</span><Link href={`/tools/${t.slug}`} className="tl__qlink">{t.q}</Link></li>)}</ul>
            <p><b>{TOOL_LIST.length} free tools</b> · No sign-up · No email needed</p>
          </aside>
        </div>
      </section>

      <nav className="pxt" aria-label="On this page">
        <div className="wrap pxt__in">
          {TOOL_GROUPS.map((g) => <a key={g.key} href={`#${g.key}`}>{g.label}</a>)}
        </div>
      </nav>

      {TOOL_GROUPS.map((g, gi) => {
        const inGroup = TOOL_LIST.filter((t) => t.group === g.key);
        if (!inGroup.length) return null;
        return (
          <section key={g.key} className={`bk__sec ${gi % 2 ? "bk__sec--cream" : "bk__sec--white"}`} id={g.key}>
            <div className="wrap"><div className="bk__blk bk__col">
              <header className="bk__head">
                <h2 className="h2">{g.label}<span>.</span></h2>
                <p>{g.blurb}</p>
              </header>
              <div className="tl__grid" data-anim="stagger">
                {inGroup.map((t) => (
                  <Link key={t.slug} href={`/tools/${t.slug}`} className="tl__big" style={{ ["--c" as string]: t.acc }}>
                    <small>{t.title}</small>
                    <strong>{t.q}</strong>
                    <ul>{t.points.map((p) => <li key={p}><span aria-hidden="true">✓</span>{p}</li>)}</ul>
                    <em>{t.cta} <i aria-hidden="true">→</i></em>
                  </Link>
                ))}
              </div>
            </div></div>
          </section>
        );
      })}

      <section className="bk__sec bk__sec--white">
        <div className="wrap">
          <div className="bk__box bk__box--acc bk__cta">
            <div>
              <h2 className="bk__boxh">Rather we just <span>work it out</span>?</h2>
              <p>Send the room dimensions, or a photo of the fault code, and we&apos;ll come back with a written price.</p>
            </div>
            <div className="bxh__ctas">
              <Link href="/quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="tools-hub">Call (03) 5947 8000</a>
            </div>
          </div>
        </div>
      </section>
    </div></div>
  );
}
