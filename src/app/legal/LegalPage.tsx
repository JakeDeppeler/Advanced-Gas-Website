import type { ReactNode } from "react";
import { Crumbs } from "@/components/homepage/page/kit";
import { EndCta } from "@/components/homepage/page/bands";
import { site } from "@/lib/site";
// The crumb bar's styles live with the product pages, and the closing box's
// button row with the brand pages, as on every inside page.
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "./legal.css";

/**
 * The frame /privacy and /terms share.
 *
 * Both used to be a bare column under the header, with a title at body size:
 * legal.css set only a colour on the h1 and left the rest to the old site's
 * global heading sizes, which the redesign no longer loads. They now sit in
 * the site's own pieces: the crumb bar, a short navy header in the display
 * face, and the homepage's closing box.
 *
 * The body stays one column at a reading measure rather than bands of cards,
 * because these pages are read top to bottom, not scanned. The section list
 * beside it is there for the person who came to check one thing (cookies,
 * cancelling) and shouldn't have to read the rest to find it.
 */
export function LegalPage({ crumb, title, updated, toc, end, children }: {
  crumb: string;
  title: ReactNode;
  updated: string;
  /** The page's h2s, in order, as [id, label]: each h2 carries the id. */
  toc: [string, string][];
  /** The closing box's heading and the data-call-from tag on its call button. */
  end: { title: ReactNode; from: string };
  children: ReactNode;
}) {
  return (
    // data-no-reveal: the redesign pages opt out of the old site's scroll reveal.
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: crumb }]} />
      <header className="lg__top">
        <div className="wrap lg__topin">
          <span className="lg__eye">Legal</span>
          <h1 className="lg__h1">{title}</h1>
          <p className="lg__meta">Last updated {updated} · {site.legalName}</p>
        </div>
      </header>

      <section className="lg__doc">
        <div className="wrap lg__grid">
          <nav className="lg__toc" aria-label="On this page">
            <span className="lg__tocl">On this page</span>
            <ol>{toc.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ol>
            <p className="lg__ask">
              Questions? <a href={`mailto:${site.email}`}>{site.email}</a> or{" "}
              <a href={`tel:${site.phoneE164}`} data-call-from={`${end.from}-side`}>{site.phone}</a>
            </p>
          </nav>
          <div className="lg__body">{children}</div>
        </div>
      </section>

      <EndCta title={end.title} from={end.from} />
    </div>
  );
}
