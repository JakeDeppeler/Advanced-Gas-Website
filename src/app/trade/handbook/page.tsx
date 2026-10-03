import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { HANDBOOK } from "@/lib/portal/content";
import { handbookBodies, dbConfigured } from "@/lib/portal/db";
import { parseProse, readingMinutes } from "@/lib/portal/prose";

export const dynamic = "force-dynamic";
export const metadata = { title: "Handbook — Trade portal" };

/**
 * The handbook, shelf by shelf.
 *
 * What the data holds is the table of contents and each topic's state — written
 * and ready to load, or still a gap with a note on what it needs. So that is
 * what this shows. The design's artboard has lorem where the topic body would
 * go; drawing two paragraphs of filler on an iPad a tradesman actually reads
 * would be worse than saying plainly that a topic hasn't been written yet.
 */
export default async function TradeHandbook({ searchParams }: { searchParams: { shelf?: string; topic?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const shelf = HANDBOOK.find((s) => s.letter === searchParams.shelf?.toUpperCase()) ?? HANDBOOK[0];
  const topic = shelf.items.find((t) => t.title === searchParams.topic) ?? shelf.items[0];

  // The same bodies the office portal writes. One handbook, two front doors —
  // a topic written on a laptop is readable in the van the moment it saves.
  const bodies = dbConfigured() ? await handbookBodies().catch(() => new Map()) : new Map();
  const body = (bodies.get(`${shelf.letter}|${topic.title}`)?.body ?? "").trim();
  const written = (title: string) => (bodies.get(`${shelf.letter}|${title}`)?.body ?? "").trim().length > 0;

  // Previous and next walk the whole handbook, shelf into shelf.
  const flat = HANDBOOK.flatMap((s) => s.items.map((t) => ({ s, t })));
  const at = flat.findIndex((x) => x.s.letter === shelf.letter && x.t.title === topic.title);
  const prev = at > 0 ? flat[at - 1] : null;
  const next = at >= 0 && at < flat.length - 1 ? flat[at + 1] : null;
  const href = (letter: string, title?: string) => `/trade/handbook?shelf=${letter}${title ? `&topic=${encodeURIComponent(title)}` : ""}`;

  return (
    <TradeShell user={user} active="tools" title="Handbook" sub="How we work, shelf by shelf">
      <nav className="tr-pills" aria-label="Shelves">
        {HANDBOOK.map((s) => (
          <Link key={s.letter} href={href(s.letter)} aria-current={s.letter === shelf.letter ? "page" : undefined} className={`tr-pill tr-pill--sm${s.letter === shelf.letter ? " is-on" : ""}`}>
            {s.letter} · {s.title}
          </Link>
        ))}
      </nav>

      <div className="tr-split tr-split--left" style={{ ["--tr-side" as string]: "300px" }}>
        <nav className="tr-card tr-stack" style={{ gap: 4, padding: 8, alignSelf: "start" }} aria-label="Topics">
          <strong style={{ fontFamily: "var(--f-display)", fontSize: 17, padding: "8px 12px 4px" }}>{shelf.letter} · {shelf.title}</strong>
          {shelf.items.map((t) => {
            const on = t.title === topic.title;
            const w = written(t.title);
            return (
              <Link key={t.title} href={href(shelf.letter, t.title)} aria-current={on ? "page" : undefined} className={`tr-pick${on ? " is-on" : ""}`}>
                {/* The dot is the topic's state; the word for it is in the
                    panel, so colour is never the only signal. */}
                <span aria-hidden="true" style={{ flex: "none", width: 9, height: 9, borderRadius: "50%", background: on ? "var(--tr-orange)" : w ? "var(--tr-blue)" : "transparent", boxShadow: w || on ? "none" : "inset 0 0 0 2px var(--tr-ink-3)" }} />
                <span style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 16 }}>{t.title}</strong>
                  {!w && <span className="tr-pick__s">{t.status === "have" ? "Written, not loaded yet" : "Still being written"}</span>}
                </span>
              </Link>
            );
          })}
        </nav>

        <section className="tr-card tr-stack" style={{ gap: 14, minHeight: 440 }}>
          <div>
            <h2 style={{ fontSize: 26, lineHeight: "32px", fontWeight: 900 }}>{topic.title}</h2>
            {body && <span className="tr-small">{readingMinutes(body)} min read</span>}
          </div>

          {body ? (
            <div className="tr-prose" style={{ flex: "1 1 auto" }}>
              {parseProse(body).map((b, i) =>
                b.kind === "h" ? <h3 key={i} style={{ fontSize: 19, margin: "14px 0 6px" }}>{b.text}</h3>
                : b.kind === "ul" ? <ul key={i}>{b.items.map((it) => <li key={it}>{it}</li>)}</ul>
                : <p key={i}>{b.text}</p>,
              )}
            </div>
          ) : (
            <div className="tr-stack tr-stack--sm" style={{ flex: "1 1 auto" }}>
              {topic.note && <p className="tr-prose">{topic.note}</p>}
              <p className={topic.status === "have" ? "tr-note" : "tr-note tr-note--warn"}>
                {topic.status === "have"
                  ? "Written, and waiting to be loaded in. The office pastes it in from the portal."
                  : `Still being written.${topic.gap ? ` ${topic.gap}.` : ""}`}
              </p>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingTop: 14, borderTop: "1px solid var(--tr-line)" }}>
            {prev ? <Link href={href(prev.s.letter, prev.t.title)} className="tr-btn">← Previous</Link> : <span />}
            {next ? <Link href={href(next.s.letter, next.t.title)} className="tr-btn">Next →</Link> : <span />}
          </div>
        </section>
      </div>
    </TradeShell>
  );
}
