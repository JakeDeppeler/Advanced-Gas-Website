import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { TopicReader } from "@/components/portal/TopicReader";
import { HANDBOOK } from "@/lib/portal/content";
import { handbookBodies, dbConfigured } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { shelf: string } }) {
  const s = HANDBOOK.find((x) => x.letter.toLowerCase() === params.shelf.toLowerCase());
  return { title: s ? `${s.title} — Handbook — Team portal` : "Handbook — Team portal" };
}

/**
 * A shelf of the handbook: its topics down the left, the one you're reading
 * on the right.
 *
 * This was a list of five rows with a status chip on each and nothing to open.
 * The contents were the whole page, because the handbook's words have never
 * been in the app — they live in documents elsewhere. The bodies now have a
 * table of their own and an admin can paste one in from this screen, so a
 * shelf stops being a promise and becomes something to read.
 */
export default async function HandbookShelfPage({
  params, searchParams,
}: {
  params: { shelf: string };
  searchParams: { topic?: string };
}) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const shelf = HANDBOOK.find((s) => s.letter.toLowerCase() === params.shelf.toLowerCase());
  if (!shelf) notFound();

  const bodies = dbConfigured() ? await handbookBodies().catch(() => new Map()) : new Map();
  const pick = shelf.items.find((t) => t.title === searchParams.topic) ?? shelf.items[0];
  const written = (title: string) => (bodies.get(`${shelf.letter}|${title}`)?.body ?? "").trim().length > 0;
  const current = bodies.get(`${shelf.letter}|${pick.title}`) ?? null;

  const at = shelf.items.findIndex((t) => t.title === pick.title);
  const prev = at > 0 ? shelf.items[at - 1] : null;
  const next = at < shelf.items.length - 1 ? shelf.items[at + 1] : null;
  const href = (title: string) => `/portal/handbook/${shelf.letter.toLowerCase()}?topic=${encodeURIComponent(title)}`;

  return (
    <PortalShell user={user}>
      <div className="pt-hb">
        <aside className="pt-hb__side">
          <PortalBack href="/portal/handbook" label="Handbook" />

          <nav className="pt-hb__letters" aria-label="Shelves">
            {HANDBOOK.map((s) => (
              <Link
                key={s.letter}
                href={`/portal/handbook/${s.letter.toLowerCase()}`}
                aria-current={s.letter === shelf.letter ? "page" : undefined}
                aria-label={`Shelf ${s.letter} — ${s.title}`}
                className={`pt-hb__letter${s.letter === shelf.letter ? " is-on" : ""}`}
              >
                {s.letter}
              </Link>
            ))}
          </nav>

          <div className="pt-hb__shelfname">{shelf.letter} · {shelf.title}</div>

          <nav className="pt-hb__topics" aria-label="Topics">
            {shelf.items.map((t) => {
              const on = t.title === pick.title;
              const has = written(t.title);
              return (
                <Link key={t.title} href={href(t.title)} aria-current={on ? "page" : undefined} className={`pt-hb__topic${on ? " is-on" : ""}`}>
                  <span>{t.title}</span>
                  {/* Written, on the list, or still to write — three states,
                      and the one that matters is "can I read this now". */}
                  <span
                    className={`pt-hb__dot${has ? " is-written" : t.status === "have" ? " is-have" : ""}`}
                    aria-label={has ? "Written" : t.status === "have" ? "Exists, not loaded in" : "Still to write"}
                  />
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="pt-hb__main">
          <TopicReader
            shelf={shelf.letter}
            shelfTitle={shelf.title}
            title={pick.title}
            note={pick.note}
            status={pick.status}
            gap={pick.gap}
            body={current?.body ?? ""}
            updatedBy={current?.updatedBy ?? null}
            updatedAt={current?.updatedAt ?? null}
            canEdit={can(user, "manage_users")}
          />

          <div className="pt-hb__nav">
            {prev ? <Link href={href(prev.title)} className="pt-hb__prev">← {prev.title}</Link> : <span />}
            {next && <Link href={href(next.title)} className="pt-hb__next">{next.title} →</Link>}
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
