import type { ReactNode } from "react";
import { PageHero, HeroCard, CallButton } from "@/components/homepage/page/PageHero";
import { EndCta } from "@/components/homepage/page/bands";
import { SiteModeStrip } from "@/components/Header";
import { site } from "@/lib/site";
// The closing box's button row lives with the brand pages, as on every inside page.
import "@/components/homepage/homepage.css";
import "@/components/homepage/brand/brand.css";
import "./legal.css";

/**
 * The frame /privacy and /terms share.
 *
 * They were a short navy text header over one long column of prose, and
 * looked like no other page on the site. Jake (Nov 2026) wants every inside
 * page to "resemble the home page more", so they now open on the shared
 * photo hero (PageHero) and set each section as one of the homepage's white
 * cards on cream, an icon tile beside its heading as the "why us" cards
 * have, ending on the homepage's closing box.
 *
 * Only the setting changed. The wording of each notice is untouched and in
 * its original order: a page restyles it by wrapping each heading and what
 * follows it in a LegalSection, and nothing here adds to or summarises it.
 *
 * The contents sit in the hero's card, where the quote form goes on other
 * pages: the person who came to check one thing (cookies, cancelling)
 * shouldn't have to read the rest to find it.
 *
 * The path is also listed in ownHeader() in components/ChromeGate.tsx, so
 * the hero's pill header replaces the layout's flat one.
 */
export function LegalPage({ crumb, title, sub, photo, pos, updated, toc, end, children }: {
  crumb: string;
  /** The headline, its coloured part in braces as PageHero takes it. */
  title: string;
  /** The line under it: the page's own meta description, so the hero says nothing the page doesn't. */
  sub: ReactNode;
  /** One of our photos (PHOTO in lib/homepage/data.ts) and where its subject sits. */
  photo: string;
  pos?: string;
  updated: string;
  /** The page's sections, in order, as [id, label]: each section's h2 carries the id. */
  toc: [string, string][];
  /** The closing box's heading and the data-call-from tag on its call button. */
  end: { title: ReactNode; from: string };
  children: ReactNode;
}) {
  return (
    <>
      <SiteModeStrip tabs={false} />
      {/* data-no-reveal: the redesign pages opt out of the old site's scroll reveal. */}
      <div className="ag ag--flat" data-no-reveal>
        <PageHero
          crumbs={[{ name: crumb }]}
          title={title}
          sub={sub}
          photo={photo}
          pos={pos}
          ctas={<><a href={`mailto:${site.email}`} className="abtn abtn--or">Email a question →</a><CallButton from={`${end.from}-hero`} /></>}
          // No star rating on a legal page: who is answerable for it, and how current it is.
          rating={false}
          trust={[{ v: updated, k: "Last updated" }, { v: `ABN ${site.abn}`, k: site.legalName }]}
          card={
            <HeroCard
              label="On this page"
              foot={<span className="lg__ask">Questions? <a href={`mailto:${site.email}`}>{site.email}</a> or <a href={`tel:${site.phoneE164}`} data-call-from={`${end.from}-side`}>{site.phone}</a></span>}
            >
              {/* Numbered as well as linked, so the list reads as an order without relying on colour. */}
              <ol className="lg__toc">
                {toc.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}
              </ol>
            </HeroCard>
          }
        />

        <section className="bk__sec bk__sec--cream lg__doc">
          <div className="wrap lg__body">{children}</div>
        </section>

        <EndCta title={end.title} from={end.from} />
      </div>
    </>
  );
}

/** The opening paragraph, the plain-English version, on a card of its own and set larger, as a hero's sub line is. */
export function LegalLead({ children }: { children: ReactNode }) {
  return <div className="lg__lead">{children}</div>;
}

/** Line drawings for the sections' icon tiles, 24×24, drawn in currentColor. */
const ICONS = {
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  people: "M15 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 3 18.5V20M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 4.6a3.5 3.5 0 0 1 0 6.8",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2",
  cookie: "M12 3a9 9 0 1 0 9 9 4 4 0 0 1-5-5 4 4 0 0 1-4-4zM8.5 12.5h.01M12.5 16h.01M16 14.5h.01M9 8.5h.01",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 14.5l2 2 4-4",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  quote: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4",
  percent: "M19 5 5 19M7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  card: "M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5zM3 10h18M7 15h4",
  home: "M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5",
  shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4",
  cancel: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15 9l-6 6M9 9l6 6",
  umbrella: "M3 12a9 9 0 0 1 18 0zM12 12v6.5a2 2 0 0 0 4 0",
  scale: "M12 4v16M8 20h8M5 8h14M12 4l-7 4M12 4l7 4M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z",
} as const;

export type LegalIcon = keyof typeof ICONS;

/**
 * One section of a notice as a white card: the icon tile, its number and
 * its heading down the left, the text beside them at a reading measure, as
 * the homepage's section heads put the heading on the left and the words on
 * the right. `boxed` is the passage that must not be missed (complaints,
 * consumer rights), set in the homepage's navy.
 *
 * The h2 keeps the id, so links to /privacy#cookies still land.
 */
export function LegalSection({ id, title, icon, boxed = false, children }: { id: string; title: string; icon: LegalIcon; boxed?: boolean; children: ReactNode }) {
  return (
    <section className={`lg__sec${boxed ? " lg__sec--box" : ""}`} aria-labelledby={id}>
      <header className="lg__sechead">
        <span className="lg__ico" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[icon]} /></svg>
        </span>
        <span className="lg__num" aria-hidden="true" />
        <h2 id={id}>{title}</h2>
      </header>
      <div className="lg__txt">{children}</div>
    </section>
  );
}
