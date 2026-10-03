import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { findSection, SOP_CHANGES } from "@/lib/portal/sops";
import { SopHashRedirect } from "@/components/portal/SopHashRedirect";
import { can } from "@/lib/portal/caps";
import { dbConfigured, listStoredSops } from "@/lib/portal/db";
import { mergeSops } from "@/lib/portal/sopEdits";

/**
 * Dynamic, not static.
 *
 * This was `force-static` with `generateStaticParams`, which cannot work: the
 * page reads the session cookie to find out who is asking, and a page that
 * reads cookies cannot be prerendered. Next resolved that by answering every
 * request with a 307 carrying no Location — so every procedure's detail page
 * had been a dead link, and the Processes section only ever showed its index.
 */
export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { section: string } }) {
  const s = findSection(params.section);
  return { title: s ? `${s.title} — Team portal` : "Processes — Team portal" };
}

export default async function SopSectionPage({ params }: { params: { section: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  // What the office has written wins over the manual. A draft is only shown
  // to the people who could have written it, so a half-finished procedure
  // never reaches a van.
  const canEdit = can(user, "manage_users");
  const stored = dbConfigured() ? await listStoredSops().catch(() => []) : [];
  const sections = mergeSops(stored, canEdit);
  const section = sections.find((s) => s.slug === params.section) ?? findSection(params.section);
  if (!section) notFound();
  const statusOf = new Map(stored.map((s) => [s.code, s.status]));
  const changed = new Set((SOP_CHANGES[0]?.items ?? []).map((c) => c.code));
  const changeLabel = SOP_CHANGES[0] ? `Changed in ${SOP_CHANGES[0].on.replace(/^Version\s*/i, "")}` : "";

  return (
    <PortalShell user={user}>
      {/* Old links pointed at #slug on this page, when every procedure was on
          it. Each has its own page now; this sends those links on. */}
      <SopHashRedirect base={`/portal/sops/${section.slug}`} slugs={section.sops.map((x) => x.slug)} />
      <div className="pt-sopsec">
        <nav className="pt-sopsec__nav" aria-label="Process sections">
          <PortalBack href="/portal/sops" label="Processes" />
          {sections.map((x) => {
            const on = x.slug === section.slug;
            return (
              <Link key={x.slug} href={`/portal/sops/${x.slug}`} aria-current={on ? "page" : undefined} className={`pt-sopsec__sec${on ? " is-on" : ""}`}>
                <span>{x.letter}</span>{x.title}
              </Link>
            );
          })}
        </nav>

        <div className="pt-sopsec__main">
          <div className="pt-sopsec__head">
            <div className="pt-sopsec__kick">
              <span>Section {section.letter}</span>
              {canEdit && <Link href="/portal/sops/edit" className="pt-btn pt-btn--navy">Edit this section</Link>}
            </div>
            <h1>{section.title}</h1>
            <p>{section.blurb}</p>
          </div>

          {section.draft && (
            <div className="pt-note pt-note--warn"><strong>Not final.</strong> {section.draft}</div>
          )}

          <section className="pt-sopsec__list">
            {section.sops.map((sop) => {
              const when = sop.meta.find((m) => m.k === "When")?.v ?? "";
              const flag = sop.meta.find((m) => m.k === "Flag")?.v ?? "";
              const tag = statusOf.get(sop.code) === "draft" ? "Draft" : changed.has(sop.code) ? changeLabel : flag;
              return (
                <Link key={sop.slug} href={`/portal/sops/${section.slug}/${sop.slug}`} className="pt-sopsec__row">
                  <span className="pt-sopsec__code">{sop.code}</span>
                  <span className="pt-sopsec__txt"><strong>{sop.title}</strong>{when && <span>{when}</span>}</span>
                  {tag && <span className="pt-sopsec__tag">{tag}</span>}
                  <span className="pt-sopx__chev" aria-hidden="true">›</span>
                </Link>
              );
            })}
          </section>
        </div>
      </div>
    </PortalShell>
  );
}
