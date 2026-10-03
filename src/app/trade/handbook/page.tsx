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

  const ready = (letter: string) => {
    const s = HANDBOOK.find((x) => x.letter === letter);
    if (!s) return "";
    const have = s.items.filter((i) => i.status === "have").length;
    return `${have} of ${s.items.length} written`;
  };

  return (
    <TradeShell user={user} active="/trade/handbook" title="Handbook" sub="How we work, shelf by shelf">
      <div className="tr-md">
        <nav className="tr-md__col tr-md__col--row" aria-label="Shelves">
          <span className="tr-md__lbl">Shelves</span>
          {HANDBOOK.map((s) => (
            <Link
              key={s.letter}
              href={`/trade/handbook?shelf=${s.letter}`}
              aria-current={s.letter === shelf.letter ? "page" : undefined}
              className={`tr-pick${s.letter === shelf.letter ? " is-on" : ""}`}
            >
              <span className="tr-pick__chip">{s.letter}</span>
              <span className="tr-pick__t"><strong>{s.title}</strong><span>{ready(s.letter)}</span></span>
            </Link>
          ))}
        </nav>

        <nav className="tr-md__col" aria-label="Topics">
          <span className="tr-md__blurb">{shelf.letter} · {shelf.title}</span>
          {shelf.items.map((t) => {
            const on = t.title === topic.title;
            return (
              <Link
                key={t.title}
                href={`/trade/handbook?shelf=${shelf.letter}&topic=${encodeURIComponent(t.title)}`}
                aria-current={on ? "page" : undefined}
                className={`tr-pick${on ? " is-on" : ""}`}
              >
                {/* The dot is the topic's state, and the word for it is in the
                    panel — colour on its own would be the only signal. */}
                <span className={`tr-dot${written(t.title) ? " is-written" : t.status === "have" ? " is-have" : ""}`} aria-hidden="true" />
                <span className="tr-pick__t"><strong>{t.title}</strong>{t.note && <span>{t.note}</span>}</span>
              </Link>
            );
          })}
        </nav>

        <section className="tr-card tr-stack" style={{ gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 24, lineHeight: "30px" }}>{topic.title}</h2>
            <span className="tr-sub">{shelf.letter} · {shelf.title}{topic.today ? " · ready today" : ""}</span>
          </div>

          {body ? (
            <>
              <span className="tr-foot">{readingMinutes(body)} min read</span>
              <div className="tr-prose">
                {parseProse(body).map((b, i) =>
                  b.kind === "h" ? <h3 key={i}>{b.text}</h3>
                  : b.kind === "ul" ? <ul key={i}>{b.items.map((it) => <li key={it}>{it}</li>)}</ul>
                  : <p key={i}>{b.text}</p>,
                )}
              </div>
            </>
          ) : (
            <>
              {topic.note && <p className="tr-prose" style={{ margin: 0 }}>{topic.note}</p>}
              {topic.status === "have" ? (
                <div className="tr-note">
                  Written, and waiting to be loaded in. The office can paste it in from the portal.
                </div>
              ) : (
                <div className="tr-note tr-note--warn">
                  Still being written.{topic.gap ? ` ${topic.gap}.` : ""}
                </div>
              )}
            </>
          )}

          <span className="tr-foot">
            The procedures that go with this shelf are in <Link href="/trade/processes">Processes</Link>.
          </span>
        </section>
      </div>
    </TradeShell>
  );
}
