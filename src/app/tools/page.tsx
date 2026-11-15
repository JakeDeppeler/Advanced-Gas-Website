import type { Metadata } from "next";
import Link from "next/link";
import { BkMotion } from "@/components/homepage/brand/BkMotion";
import { PageHero, HeroCard } from "@/components/homepage/page/PageHero";
import { SiteModeStrip } from "@/components/Header";
import { PHOTO } from "@/lib/homepage/data";
import { EndCta } from "@/components/homepage/page/bands";
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
 * The hero in the brand pages' block layout; the tools themselves in the
 * homepage's navy tools box, each card naming the job it does.
 */

export const metadata: Metadata = {
  title: "Free Aircon & Heat Pump Tools",
  description:
    "Free calculators and reference: work out what size aircon a room needs, estimate the running cost, or look up a fault code from your existing unit.",
  alternates: { canonical: "/tools" },
};

/** A tool's line icon on its tile; the card's words carry the meaning, so it's hidden from screen readers. */
function ToolIcon({ d, size }: { d: string; size: number }) {
  return (
    <span className="tlh__ico" aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    </span>
  );
}

export default function ToolsHubPage() {
  // In the groups' order, so the set still reads size, cost, compare, look up.
  const tools = TOOL_GROUPS.flatMap((g) => TOOL_LIST.filter((t) => t.group === g.key));
  const groupLabel = Object.fromEntries(TOOL_GROUPS.map((g) => [g.key, g.label])) as Record<string, string>;
  return (
    // Two boxes: the blocks styles hang off .bk sitting inside .ag.
    <>
    <SiteModeStrip tabs={false} />
    <div className="ag ag--flat" data-no-reveal>
      {/* The homepage's top (PageHero), over a ducted unit we put in a roof;
          the card on the right is the questions the tools answer. */}
      <PageHero
        crumbs={[{ name: "Tools" }]}
        eye="Free tools"
        title="The tools we use {on quote day}."
        sub="What size a room needs, what it'll cost to run, what the rebate is worth, which system suits, and what a fault code means. Free, and no sign-up."
        photo={PHOTO.ductedInstall} pos="center 50%"
        ctas={<><a href="#tools" className="abtn abtn--or">Pick a tool ↓</a><Link href="/quote" className="abtn abtn--line">Or get a free quote</Link></>}
        trust={[{ v: `${TOOL_LIST.length} free tools`, k: "No sign-up · No email needed" }]}
        card={
          <HeroCard label="Answers in a minute">
            <ul className="phx__rows phx__rows--ico">
              {TOOL_LIST.slice(0, 5).map((t) => (
                <li key={t.slug}><Link href={`/tools/${t.slug}`}><ToolIcon d={t.icon} size={20} /><span><strong>{t.q}</strong><span>{t.title}</span></span></Link></li>
              ))}
            </ul>
          </HeroCard>
        }
      />
      <div className="bx bk cx tl" style={{ ["--acc" as string]: "#C2521A" }}>
      <BkMotion />

      {/* Every tool in one navy rounded box of white cards, the homepage's
          "Tools for you" (.htools-box, .tcard). It was four bands of cards
          with coloured top rules, the last band holding one card. The group
          each tool belongs to is written on its card, so nothing rests on
          the old category colours. */}
      <section className="bk__sec bk__sec--white" id="tools">
        <div className="wrap">
          <div className="htools-box tlh">
            <div className="sechead">
              <div className="sechead__t">
                <h2 className="h2">Pick a <span>tool</span>.</h2>
                <p className="htools-sec__p">Size it right, see what it&apos;ll cost, compare systems or look up a fault code. Each one opens on its own page, free and with no sign-up.</p>
              </div>
            </div>
            <ul className="tgrid tlh__grid" data-anim="stagger">
              {tools.map((t) => (
                <li key={t.slug}>
                  <Link href={`/tools/${t.slug}`} className="tcard tlh__card">
                    {/* A big title beside its icon, as the card's header (Jake, Nov
                        2026: "the header should be large and have icons"). */}
                    <span className="tlh__top">
                      <ToolIcon d={t.icon} size={28} />
                      <span className="tlh__name"><small className="tlh__grp">{groupLabel[t.group]}</small><strong>{t.title}</strong></span>
                    </span>
                    <span className="tlh__q">{t.q}</span>
                    <ul className="tlh__pts">{t.points.map((p) => <li key={p}>{p}</li>)}</ul>
                    <em>{t.cta} →</em>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <EndCta
        title={<>Rather we just <span>work it out</span>?</>}
        text="Send the room dimensions, or a photo of the fault code, and we'll come back with a written price."
        from="tools-hub"
      />
    </div></div>
    </>
  );
}
