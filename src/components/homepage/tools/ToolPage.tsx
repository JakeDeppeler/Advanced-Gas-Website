import type { ReactNode } from "react";
import Link from "next/link";
import { BkMotion } from "@/components/homepage/brand/BkMotion";
import { Crumbs } from "@/components/homepage/page/kit";
import { TOOL_LIST, findTool } from "./toolList";
import "@/app/detail.css";
import "@/app/tools/tools.css";
import "@/components/homepage/homepage.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/brand/blocks.css";
import "@/components/homepage/page/category.css";
import "./tools.css";

/** Braces mark the coloured words in a heading, as on the brand pages. */
export function accent(text: string) {
  return text.split(/[{}]/).map((part, i) => (i % 2 ? <span key={i}>{part}</span> : part));
}

/**
 * Every free tool's page, in the brand pages' block layout: the question in
 * the header with what the tool does beside it, the tool itself on a cream
 * band, how the numbers are worked out (open, not tucked in a toggle, since
 * that's what makes a number worth trusting), anything the page adds, its
 * questions, the other tools and the quote.
 *
 * The calculators keep their own markup and logic; ./tools.css restyles
 * them to match from inside .tl.
 */
export function ToolPage({ slug, crumb, title, sub, children, how, more, faqs, cta }: {
  slug: string;
  crumb: string;
  /** Braces mark the coloured part. */
  title: string;
  sub: ReactNode;
  children: ReactNode;
  how?: { h: string; body: ReactNode };
  /** Whole extra sections, between "how it works" and the questions. */
  more?: ReactNode;
  faqs?: { q: string; a: string }[];
  cta: { h: string; text: ReactNode };
}) {
  const tool = findTool(slug);
  const acc = tool?.acc ?? "#C2521A";
  // The other tools: same kind first, then the rest, four in all.
  const others = TOOL_LIST.filter((t) => t.slug !== slug);
  const related = [...others.filter((t) => t.group === tool?.group), ...others.filter((t) => t.group !== tool?.group)].slice(0, 4);

  return (
    // Two boxes: the blocks styles hang off .bk sitting inside .ag.
    <div className="ag ag--flat" data-no-reveal><div className="bx bk cx tl" style={{ ["--acc" as string]: acc }}>
      <BkMotion />
      <Crumbs trail={[{ name: "Tools", href: "/tools" }, { name: crumb }]} back={{ label: "All free tools →", href: "/tools" }} />

      <section className="bxh tl__hero">
        <div className="wrap tl__hin">
          <div className="bxh__copy">
            <span className="lk2__eye cx__eye">Free tool</span>
            <h1 className="bxh__h1 cx__h1">{accent(title)}</h1>
            <p className="bxh__sub">{sub}</p>
            <div className="bxh__ctas">
              <a href="#tool" className="abtn abtn--or abtn--flat">Start ↓</a>
              <Link href="/quote" className="abtn abtn--line">Or get a free quote</Link>
            </div>
          </div>
          {tool && (
            <aside className="tl__what" aria-label="What this tool does">
              <small>What it does</small>
              <ul>{tool.points.map((p) => <li key={p}><span aria-hidden="true">✓</span>{p}</li>)}</ul>
              <p><b>Free</b> · No sign-up · No email needed</p>
            </aside>
          )}
        </div>
      </section>

      <section className="bk__sec bk__sec--cream tl__sec" id="tool">
        <div className="wrap">
          {/* The calculators' own styles hang off these. */}
          <div className="page-detail page-tools page-tool tl__tool">{children}</div>
        </div>
      </section>

      {how && (
        <section className="bk__sec bk__sec--white" id="how">
          <div className="wrap"><div className="bk__blk tl__how">
            <header className="bk__head">
              <h2 className="h2">{accent(how.h)}</h2>
              <p>So you can check the numbers, and know where they stop.</p>
            </header>
            <div className="tl__prose">{how.body}</div>
          </div></div>
        </section>
      )}

      {more}

      {faqs && faqs.length > 0 && (
        <section className="bk__sec bk__sec--cream" id="faqs">
          <div className="wrap"><div className="bk__blk pp__two">
            <div className="bk__head">
              <h2 className="h2">Questions we <span>get asked</span>.</h2>
              <p>Still want a human? <a href="tel:+61359478000" data-call-from="tool-faq">Call (03) 5947 8000</a>.</p>
            </div>
            <div className="afaqs">
              {faqs.map((f) => <details key={f.q} className="afaq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
            </div>
          </div></div>
        </section>
      )}

      <section className="bk__sec bk__sec--navy" id="more-tools">
        <div className="wrap"><div className="bk__blk bk__col">
          <div className="pp__revhead">
            <header className="bk__head">
              <h2 className="h2">More <span>free tools</span>.</h2>
              <p>The same ones we use on quote day.</p>
            </header>
            <Link href="/tools" className="tl__all">See all {TOOL_LIST.length} →</Link>
          </div>
          <div className="tl__rel" data-anim="stagger">
            {related.map((t) => (
              <Link key={t.slug} href={`/tools/${t.slug}`} className="tl__card" style={{ ["--c" as string]: t.acc }}>
                <small>{t.title}</small>
                <strong>{t.q}</strong>
                <em>{t.cta} <i aria-hidden="true">→</i></em>
              </Link>
            ))}
          </div>
        </div></div>
      </section>

      <section className="bk__sec bk__sec--white">
        <div className="wrap">
          <div className="bk__box bk__box--acc bk__cta">
            <div>
              <h2 className="bk__boxh">{accent(cta.h)}</h2>
              <p>{cta.text}</p>
            </div>
            <div className="bxh__ctas">
              <Link href="/quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from={`tool-${slug}`}>Call (03) 5947 8000</a>
            </div>
          </div>
        </div>
      </section>
    </div></div>
  );
}
